import { execFile } from "node:child_process"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { promisify } from "node:util"

import { prisma } from "@/prisma"

import { ProxyService } from "@/prisma/generated/client"

import { getProxyServiceLocations, ProxyServiceLocationParams } from "@/schemas/proxyServiceLocation"
import { ProxyServiceType } from "@/schemas/proxyServiceType"

import { formatProxyServiceRedirectHost, formatProxyServiceUpstreamUrl, getProxyServiceAddressType, ProxyServiceAddressType } from "@/utils/proxyServiceAddress"
import { formatProxyServiceTargetPath } from "@/utils/proxyServicePath"

import { withFileLock } from "./autoBackupFileLock"
import { getProxyNginxConfig, ProxyNginxConfig } from "./proxyNginxConfig"

const execFileAsync = promisify(execFile)

export interface ExecProxyCommandParams {
    command: string
    args: string[]
}

export interface RenderProxyServiceConfigParams {
    service: ProxyService
}

export interface RenderProxyServerBlockParams {
    service: ProxyService
    listenPort: number
    sslEnabled?: boolean
}

export interface RenderProxyLocationParams {
    service: ProxyService
    location: ProxyServiceLocationParams
}

export interface RenderProxyLocationsParams {
    service: ProxyService
}

export interface RenderPortForwardServerBlockParams {
    service: ProxyService
    protocol: string
}

export interface RenderPortForwardListenDirectivesParams {
    port: number
    protocol: string
    sslEnabled?: boolean
}

export interface RenderRedirectServerBlockParams {
    service: ProxyService
}

export interface RenderListenDirectivesParams {
    port: number
    sslEnabled?: boolean
}

export interface EnsureProxyServiceCertificateParams {
    service: ProxyService
    force?: boolean
}

export interface ProxyServiceCertificatePaths {
    certificatePath: string
    certificateKeyPath: string
}

export interface WriteProxyServiceConfigFilesParams {
    services: ProxyService[]
    directoryPath: string
    serviceType: ProxyServiceType
}

export interface ReplaceProxyServiceConfigsParams {
    sourceDirectoryPath: string
    targetDirectoryPath: string
}

export interface CreateNginxMainConfigParams {
    config: ProxyNginxConfig
    includeDirectoryPath: string
    streamIncludeDirectoryPath: string
}

export interface CreateOpenSslConfigParams {
    service: ProxyService
}

export interface StartOrReloadProxyNginxParams {
    config: ProxyNginxConfig
}

export interface StopProxyNginxParams {
    config: ProxyNginxConfig
}

export interface TestProxyNginxConfigParams {
    config: ProxyNginxConfig
    nginxConfigPath: string
}

export async function applyProxyServices() {
    const config = getProxyNginxConfig()

    if (!config.applyEnabled) return

    const result = await withFileLock({ lockFilePath: config.lockFilePath, staleMs: 60_000 }, async () => {
        await ensureProxyNginxDirectories(config)
        await ensureNginxMainConfig(config)

        const services = await prisma.proxyService.findMany({
            where: { enabled: true },
            orderBy: [{ createdAt: "asc" }],
        })

        const servicesWithCertificates = await Promise.all(services.map(service => ensureProxyServiceCertificate({ service })))

        const tempConfDirectoryPath = resolve(config.tempDirectoryPath, `conf-${Date.now()}`)
        const tempStreamConfDirectoryPath = resolve(config.tempDirectoryPath, `stream-conf-${Date.now()}`)
        const tempNginxConfigPath = resolve(config.tempDirectoryPath, `nginx-${Date.now()}.conf`)

        try {
            await mkdir(tempConfDirectoryPath, { recursive: true })
            await mkdir(tempStreamConfDirectoryPath, { recursive: true })
            await writeProxyServiceConfigFiles({
                services: servicesWithCertificates,
                directoryPath: tempConfDirectoryPath,
                serviceType: ProxyServiceType.反向代理,
            })
            await writeProxyServiceConfigFiles({
                services: servicesWithCertificates,
                directoryPath: tempStreamConfDirectoryPath,
                serviceType: ProxyServiceType.端口转发,
            })

            await writeFile(
                tempNginxConfigPath,
                createNginxMainConfig({
                    config,
                    includeDirectoryPath: tempConfDirectoryPath,
                    streamIncludeDirectoryPath: tempStreamConfDirectoryPath,
                }),
                "utf8",
            )

            await testProxyNginxConfig({ config, nginxConfigPath: tempNginxConfigPath })

            await replaceProxyServiceConfigs({
                sourceDirectoryPath: tempConfDirectoryPath,
                targetDirectoryPath: config.confDirectoryPath,
            })
            await replaceProxyServiceConfigs({
                sourceDirectoryPath: tempStreamConfDirectoryPath,
                targetDirectoryPath: config.streamConfDirectoryPath,
            })

            await testProxyNginxConfig({ config, nginxConfigPath: config.nginxConfigPath })
            await startOrReloadProxyNginx({ config })
        } finally {
            await rm(tempConfDirectoryPath, { force: true, recursive: true })
            await rm(tempStreamConfDirectoryPath, { force: true, recursive: true })
            await rm(tempNginxConfigPath, { force: true })
        }
    })

    if (!result) throw new Error("代理服务正在生效中，请稍后再试")
}

export async function syncProxyNginxRuntime() {
    const config = getProxyNginxConfig()

    if (!config.applyEnabled) {
        await stopProxyNginx({ config })
        return
    }

    await applyProxyServices()
}

export async function ensureProxyNginxDirectories(config: ProxyNginxConfig) {
    await mkdir(config.dataDirectoryPath, { recursive: true })
    await mkdir(config.confDirectoryPath, { recursive: true })
    await mkdir(config.streamConfDirectoryPath, { recursive: true })
    await mkdir(config.certDirectoryPath, { recursive: true })
    await mkdir(config.tempDirectoryPath, { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "client_body"), { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "proxy"), { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "fastcgi"), { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "uwsgi"), { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "scgi"), { recursive: true })
}

export async function ensureNginxMainConfig(config: ProxyNginxConfig) {
    await writeFile(
        config.nginxConfigPath,
        createNginxMainConfig({
            config,
            includeDirectoryPath: config.confDirectoryPath,
            streamIncludeDirectoryPath: config.streamConfDirectoryPath,
        }),
        "utf8",
    )
}

export async function ensureProxyServiceCertificate({ service, force = false }: EnsureProxyServiceCertificateParams) {
    if (!service.httpsEnabled) return service

    const config = getProxyNginxConfig()
    await ensureProxyNginxDirectories(config)

    const paths = getProxyServiceCertificatePaths(service)
    const shouldGenerate =
        force ||
        !service.certificatePath ||
        !service.certificateKeyPath ||
        !(await hasFile(paths.certificatePath)) ||
        !(await hasFile(paths.certificateKeyPath))

    if (!shouldGenerate) return service

    const openSslConfigPath = resolve(config.tempDirectoryPath, `${service.id}-openssl.cnf`)

    try {
        await writeFile(openSslConfigPath, createOpenSslConfig({ service }), "utf8")

        await execProxyCommand({
            command: "openssl",
            args: [
                "req",
                "-x509",
                "-nodes",
                "-newkey",
                "rsa:2048",
                "-days",
                String(service.certificateDays),
                "-keyout",
                paths.certificateKeyPath,
                "-out",
                paths.certificatePath,
                "-config",
                openSslConfigPath,
            ],
        })
    } finally {
        await rm(openSslConfigPath, { force: true })
    }

    const certificateExpiresAt = new Date(Date.now() + service.certificateDays * 24 * 60 * 60 * 1000)

    const nextService = await prisma.proxyService.update({
        where: { id: service.id },
        data: {
            certificatePath: paths.certificatePath,
            certificateKeyPath: paths.certificateKeyPath,
            certificateExpiresAt,
        },
    })

    return nextService
}

export async function hasFile(filePath: string) {
    try {
        const fileStat = await stat(filePath)
        return fileStat.isFile()
    } catch {
        return false
    }
}

export function getProxyServiceCertificatePaths(service: ProxyService): ProxyServiceCertificatePaths {
    const config = getProxyNginxConfig()
    const certificatePath = service.certificatePath || resolve(config.certDirectoryPath, `${service.id}.crt`)
    const certificateKeyPath = service.certificateKeyPath || resolve(config.certDirectoryPath, `${service.id}.key`)

    return {
        certificatePath,
        certificateKeyPath,
    }
}

export async function writeProxyServiceConfigFiles({ services, directoryPath, serviceType }: WriteProxyServiceConfigFilesParams) {
    await mkdir(directoryPath, { recursive: true })

    await Promise.all(
        services
            .filter(service => service.serviceType === serviceType)
            .map(service => {
                const filePath = resolve(directoryPath, getProxyServiceConfigFileName(service))
                return writeFile(filePath, renderProxyServiceConfig({ service }), "utf8")
            }),
    )
}

export async function replaceProxyServiceConfigs({ sourceDirectoryPath, targetDirectoryPath }: ReplaceProxyServiceConfigsParams) {
    await mkdir(targetDirectoryPath, { recursive: true })

    const targetFiles = await readdir(targetDirectoryPath, { withFileTypes: true })

    await Promise.all(
        targetFiles
            .filter(file => file.isFile() && file.name.startsWith("proxy-service-") && file.name.endsWith(".conf"))
            .map(file => rm(resolve(targetDirectoryPath, file.name), { force: true })),
    )

    const sourceFiles = await readdir(sourceDirectoryPath, { withFileTypes: true })

    await Promise.all(
        sourceFiles
            .filter(file => file.isFile() && file.name.endsWith(".conf"))
            .map(async file => {
                const sourceFilePath = resolve(sourceDirectoryPath, file.name)
                const targetFilePath = resolve(targetDirectoryPath, file.name)
                const content = await readFile(sourceFilePath, "utf8")
                await writeFile(targetFilePath, content, "utf8")
            }),
    )
}

export function getProxyServiceConfigFileName(service: ProxyService) {
    return `proxy-service-${service.id}.conf`
}

export function renderProxyServiceConfig({ service }: RenderProxyServiceConfigParams) {
    if (service.serviceType === ProxyServiceType.端口转发) return renderPortForwardConfig({ service })

    const blocks = service.httpsEnabled
        ? [
              service.httpPort > 0
                  ? service.http2HttpsEnabled
                      ? renderRedirectServerBlock({ service })
                      : renderProxyServerBlock({ service, listenPort: service.httpPort })
                  : undefined,
              renderProxyServerBlock({ service, listenPort: service.httpsPort, sslEnabled: true }),
          ].filter(Boolean)
        : [renderProxyServerBlock({ service, listenPort: service.httpPort })]

    return `${blocks.join("\n\n")}\n`
}

export function renderPortForwardConfig({ service }: RenderProxyServiceConfigParams) {
    const blocks = [
        service.tcpForwardEnabled ? renderPortForwardServerBlock({ service, protocol: "tcp" }) : undefined,
        service.udpForwardEnabled ? renderPortForwardServerBlock({ service, protocol: "udp" }) : undefined,
    ].filter(Boolean)

    return `${blocks.join("\n\n")}\n`
}

export function renderPortForwardServerBlock({ service, protocol }: RenderPortForwardServerBlockParams) {
    const sslEnabled = protocol === "tcp" && service.httpsEnabled
    const sslDirectives = sslEnabled
        ? [
              `    ssl_certificate ${toNginxPath(service.certificatePath || "")};`,
              `    ssl_certificate_key ${toNginxPath(service.certificateKeyPath || "")};`,
              "    ssl_protocols TLSv1.2 TLSv1.3;",
          ]
        : []

    return [
        "server {",
        renderPortForwardListenDirectives({ port: service.httpPort, protocol, sslEnabled }),
        `    proxy_pass ${formatProxyServiceUpstreamUrl({ address: service.targetHost, port: service.targetPort })};`,
        ...sslDirectives,
        "}",
    ].join("\n")
}

export function renderProxyServerBlock({ service, listenPort, sslEnabled = false }: RenderProxyServerBlockParams) {
    const sslDirectives = sslEnabled
        ? [
              `    ssl_certificate ${toNginxPath(service.certificatePath || "")};`,
              `    ssl_certificate_key ${toNginxPath(service.certificateKeyPath || "")};`,
              "    ssl_protocols TLSv1.2 TLSv1.3;",
              "    ssl_prefer_server_ciphers off;",
          ]
        : []

    return [
        "server {",
        renderListenDirectives({ port: listenPort, sslEnabled }),
        `    server_name ${getProxyServiceServerNames(service.sourceAddress).map(quoteNginxValue).join(" ")};`,
        ...sslDirectives,
        renderProxyLocations({ service }),
        "}",
    ]
        .filter(Boolean)
        .join("\n")
}

export function renderRedirectServerBlock({ service }: RenderRedirectServerBlockParams) {
    const redirectHost = formatProxyServiceRedirectHost({
        address: service.sourceAddress,
        port: service.httpsPort,
        defaultPort: 443,
    })

    return [
        "server {",
        renderListenDirectives({ port: service.httpPort }),
        `    server_name ${getProxyServiceServerNames(service.sourceAddress).map(quoteNginxValue).join(" ")};`,
        `    return 301 https://${redirectHost}$request_uri;`,
        "}",
    ].join("\n")
}

export function renderProxyLocations({ service }: RenderProxyLocationsParams) {
    const locations = getProxyServiceLocations(service.locations)
    if (locations.length <= 0) throw new Error("反向代理必须至少配置一条路径规则")

    return locations.map(location => renderProxyLocation({ service, location })).join("\n")
}

export function renderProxyLocation({ service, location }: RenderProxyLocationParams) {
    const upstream = `${location.targetProtocol}://${formatProxyServiceUpstreamUrl({ address: location.targetHost, port: location.targetPort })}${formatProxyServiceTargetPath(location.targetPath)}`
    const websocketDirectives = service.websocketEnabled
        ? ["        proxy_http_version 1.1;", "        proxy_set_header Upgrade $http_upgrade;", "        proxy_set_header Connection $connection_upgrade;"]
        : []

    return [
        `    location ${location.locationPath} {`,
        `        proxy_pass ${upstream};`,
        "        proxy_set_header Host $host;",
        "        proxy_set_header X-Real-IP $remote_addr;",
        "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
        "        proxy_set_header X-Forwarded-Proto $scheme;",
        "        proxy_set_header X-Forwarded-Host $host;",
        ...websocketDirectives,
        "    }",
    ].join("\n")
}

export function renderListenDirectives({ port, sslEnabled = false }: RenderListenDirectivesParams) {
    const sslText = sslEnabled ? " ssl" : ""
    return [`    listen ${port}${sslText};`, `    listen [::]:${port}${sslText};`].join("\n")
}

export function renderPortForwardListenDirectives({ port, protocol, sslEnabled = false }: RenderPortForwardListenDirectivesParams) {
    const udpText = protocol === "udp" ? " udp" : ""
    const sslText = sslEnabled ? " ssl" : ""
    return [`    listen ${port}${udpText}${sslText};`, `    listen [::]:${port}${udpText}${sslText};`].join("\n")
}

export function getProxyServiceServerNames(address: string) {
    if (getProxyServiceAddressType(address) !== ProxyServiceAddressType.IPv6) return [address]
    return [address, `[${address}]`]
}

export function createNginxMainConfig({ config, includeDirectoryPath, streamIncludeDirectoryPath }: CreateNginxMainConfigParams) {
    return `include /etc/nginx/modules-enabled/*.conf;
pid ${toNginxPath(config.dataDirectoryPath)}/nginx.pid;
error_log /dev/stderr warn;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /dev/stdout;
    sendfile on;
    keepalive_timeout 65;
    client_body_temp_path ${toNginxPath(config.tempDirectoryPath)}/client_body;
    proxy_temp_path ${toNginxPath(config.tempDirectoryPath)}/proxy;
    fastcgi_temp_path ${toNginxPath(config.tempDirectoryPath)}/fastcgi;
    uwsgi_temp_path ${toNginxPath(config.tempDirectoryPath)}/uwsgi;
    scgi_temp_path ${toNginxPath(config.tempDirectoryPath)}/scgi;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        "" close;
    }

    include ${toNginxPath(includeDirectoryPath)}/*.conf;
}

stream {
    include ${toNginxPath(streamIncludeDirectoryPath)}/*.conf;
}
`
}

export function createOpenSslConfig({ service }: CreateOpenSslConfigParams) {
    const address = service.sourceAddress || service.targetHost || "localhost"
    const addressType = getProxyServiceAddressType(address)
    const altNameKey = addressType === ProxyServiceAddressType.域名 ? "DNS.1" : "IP.1"

    return `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = ${escapeOpenSslValue(address)}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
${altNameKey} = ${escapeOpenSslValue(address)}
`
}

export async function testProxyNginxConfig({ config, nginxConfigPath }: TestProxyNginxConfigParams) {
    await execProxyCommand({
        command: config.nginxCommand,
        args: ["-t", "-c", nginxConfigPath],
    })
}

export async function startOrReloadProxyNginx({ config }: StartOrReloadProxyNginxParams) {
    try {
        await execProxyCommand({
            command: config.nginxCommand,
            args: ["-s", "reload", "-c", config.nginxConfigPath],
        })
    } catch {
        await execProxyCommand({
            command: config.nginxCommand,
            args: ["-c", config.nginxConfigPath],
        })
    }
}

export async function stopProxyNginx({ config }: StopProxyNginxParams) {
    const commands = Array.from(new Set([config.nginxCommand, "nginx"]))

    for (const command of commands) {
        try {
            await execProxyCommand({
                command,
                args: ["-s", "quit", "-c", config.nginxConfigPath],
            })

            return
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)

            if (isProxyCommandNotFoundError(message) && command !== "nginx") continue
            if (isProxyNginxStoppedError(message)) return

            throw error
        }
    }
}

export async function execProxyCommand({ command, args }: ExecProxyCommandParams) {
    try {
        await execFileAsync(command, args)
    } catch (error) {
        throw new Error(getProxyCommandErrorMessage(error))
    }
}

export function getProxyCommandErrorMessage(error: unknown) {
    if (error instanceof Error && "stderr" in error && typeof error.stderr === "string" && error.stderr.trim()) return error.stderr.trim()
    if (error instanceof Error && "stdout" in error && typeof error.stdout === "string" && error.stdout.trim()) return error.stdout.trim()
    return error instanceof Error ? error.message : String(error)
}

export function isProxyCommandNotFoundError(message: string) {
    const lowerCaseMessage = message.toLowerCase()
    return lowerCaseMessage.includes("enoent") || lowerCaseMessage.includes("not found") || lowerCaseMessage.includes("not recognized")
}

export function isProxyNginxStoppedError(message: string) {
    return (
        (message.includes("nginx.pid") && message.includes("No such file or directory")) ||
        (message.includes("nginx.conf") && message.includes("No such file or directory")) ||
        message.includes("invalid PID number")
    )
}

export function toNginxPath(filePath: string) {
    return filePath.replaceAll("\\", "/")
}

export function quoteNginxValue(value: string) {
    return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
}

export function escapeOpenSslValue(value: string) {
    return value.replaceAll("\\", "\\\\").replaceAll("\n", "").replaceAll("\r", "")
}
