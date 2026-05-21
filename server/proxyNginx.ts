import { execFile } from "node:child_process"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { promisify } from "node:util"

import { prisma } from "@/prisma"

import { Certificate, ProxyService } from "@/prisma/generated/client"

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
    service: ProxyServiceWithCertificate
}

export interface RenderProxyServerBlockParams {
    service: ProxyServiceWithCertificate
    listenPort: number
    sslEnabled?: boolean
}

export interface RenderProxyLocationParams {
    service: ProxyServiceWithCertificate
    location: ProxyServiceLocationParams
}

export interface RenderProxyLocationsParams {
    service: ProxyServiceWithCertificate
}

export interface RenderProxyCorsDirectivesParams {
    service: ProxyServiceWithCertificate
}

export interface RenderPortForwardServerBlockParams {
    service: ProxyServiceWithCertificate
    protocol: string
}

export interface RenderPortForwardListenDirectivesParams {
    port: number
    protocol: string
    sslEnabled?: boolean
}

export interface RenderRedirectServerBlockParams {
    service: ProxyServiceWithCertificate
}

export interface RenderListenDirectivesParams {
    port: number
    sslEnabled?: boolean
}

export interface CertificatePaths {
    certificatePath: string
    certificateKeyPath: string
}

export interface GetCertificatePathsParams {
    id: string
    certificatePath?: string
    certificateKeyPath?: string
}

export interface WriteProxyServiceConfigFilesParams {
    services: ProxyServiceWithCertificate[]
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
    streamEnabled?: boolean
}

export interface CreateOpenSslConfigParams {
    address: string
}

export interface GenerateSelfSignedCertificateParams {
    id: string
    address: string
    days: number
    certificatePath?: string
    certificateKeyPath?: string
}

export interface EnsureNginxMainConfigParams {
    config: ProxyNginxConfig
    streamEnabled?: boolean
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

export interface ProxyServiceWithCertificate extends ProxyService {
    certificate?: Certificate
}

export async function applyProxyServices() {
    const config = getProxyNginxConfig()

    if (!config.applyEnabled) return

    const result = await withFileLock({ lockFilePath: config.lockFilePath, staleMs: 60_000 }, async () => {
        await ensureProxyNginxDirectories(config)

        const rawServices = await prisma.proxyService.findMany({
            where: { enabled: true },
            include: { certificate: true },
            orderBy: [{ createdAt: "asc" }],
        })

        const services = rawServices.map(service => ({
            ...service,
            certificate: service.certificate ?? undefined,
        }))

        const streamEnabled = services.some(service => service.serviceType === ProxyServiceType.端口转发)

        await ensureNginxMainConfig({ config, streamEnabled })
        await validateProxyServiceCertificates(services)

        const tempConfDirectoryPath = resolve(config.tempDirectoryPath, `conf-${Date.now()}`)
        const tempStreamConfDirectoryPath = resolve(config.tempDirectoryPath, `stream-conf-${Date.now()}`)
        const tempNginxConfigPath = resolve(config.tempDirectoryPath, `nginx-${Date.now()}.conf`)

        try {
            await mkdir(tempConfDirectoryPath, { recursive: true })
            await mkdir(tempStreamConfDirectoryPath, { recursive: true })
            await writeProxyServiceConfigFiles({
                services,
                directoryPath: tempConfDirectoryPath,
                serviceType: ProxyServiceType.反向代理,
            })
            await writeProxyServiceConfigFiles({
                services,
                directoryPath: tempStreamConfDirectoryPath,
                serviceType: ProxyServiceType.端口转发,
            })

            await writeFile(
                tempNginxConfigPath,
                createNginxMainConfig({
                    config,
                    includeDirectoryPath: tempConfDirectoryPath,
                    streamIncludeDirectoryPath: tempStreamConfDirectoryPath,
                    streamEnabled,
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

            return true
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
    await mkdir(config.logDirectoryPath, { recursive: true })
    await mkdir(config.tempDirectoryPath, { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "client_body"), { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "proxy"), { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "fastcgi"), { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "uwsgi"), { recursive: true })
    await mkdir(resolve(config.tempDirectoryPath, "scgi"), { recursive: true })
}

export async function ensureNginxMainConfig({ config, streamEnabled = false }: EnsureNginxMainConfigParams) {
    await writeFile(
        config.nginxConfigPath,
        createNginxMainConfig({
            config,
            includeDirectoryPath: config.confDirectoryPath,
            streamIncludeDirectoryPath: config.streamConfDirectoryPath,
            streamEnabled,
        }),
        "utf8",
    )
}

export async function generateSelfSignedCertificate({ id, address, days, certificatePath, certificateKeyPath }: GenerateSelfSignedCertificateParams) {
    const config = getProxyNginxConfig()
    await ensureProxyNginxDirectories(config)

    const paths = getCertificatePaths({ id, certificatePath, certificateKeyPath })

    const openSslConfigPath = resolve(config.tempDirectoryPath, `${id}-openssl.cnf`)

    try {
        await writeFile(openSslConfigPath, createOpenSslConfig({ address }), "utf8")

        await execProxyCommand({
            command: "openssl",
            args: [
                "req",
                "-x509",
                "-nodes",
                "-newkey",
                "rsa:2048",
                "-days",
                String(days),
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

    return {
        ...paths,
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    }
}

export async function hasFile(filePath: string) {
    try {
        const fileStat = await stat(filePath)
        return fileStat.isFile()
    } catch {
        return false
    }
}

export function getCertificatePaths({ id, certificatePath, certificateKeyPath }: GetCertificatePathsParams): CertificatePaths {
    const config = getProxyNginxConfig()
    const nextCertificatePath = certificatePath || resolve(config.certDirectoryPath, `${id}.crt`)
    const nextCertificateKeyPath = certificateKeyPath || resolve(config.certDirectoryPath, `${id}.key`)

    return {
        certificatePath: nextCertificatePath,
        certificateKeyPath: nextCertificateKeyPath,
    }
}

export async function validateProxyServiceCertificates(services: ProxyServiceWithCertificate[]) {
    await Promise.all(
        services.map(async service => {
            if (!service.httpsEnabled) return

            const certificate = service.certificate
            if (!certificate) throw new Error(`代理服务 ${service.id} 已开启 HTTPS / SSL，但未选择自签证书`)
            if (certificate.address !== service.sourceAddress) throw new Error(`代理服务 ${service.id} 的访问地址和自签证书地址不一致`)
            if (!(await hasFile(certificate.certificatePath))) throw new Error(`自签证书 ${certificate.name} 的证书文件不存在`)
            if (!(await hasFile(certificate.certificateKeyPath))) throw new Error(`自签证书 ${certificate.name} 的私钥文件不存在`)
        }),
    )
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
    const certificate = sslEnabled ? getProxyServiceCertificate(service) : undefined
    const sslDirectives = sslEnabled
        ? [
              `    ssl_certificate ${toNginxPath(certificate?.certificatePath || "")};`,
              `    ssl_certificate_key ${toNginxPath(certificate?.certificateKeyPath || "")};`,
              "    ssl_protocols TLSv1.2 TLSv1.3;",
          ]
        : []
    const keepaliveDirectives = protocol === "tcp" ? ["    proxy_socket_keepalive on;"] : []

    return [
        "server {",
        renderPortForwardListenDirectives({ port: service.httpPort, protocol, sslEnabled }),
        `    proxy_pass ${formatProxyServiceUpstreamUrl({ address: service.targetHost, port: service.targetPort })};`,
        "    proxy_connect_timeout 10s;",
        "    proxy_timeout 1h;",
        ...keepaliveDirectives,
        ...sslDirectives,
        "}",
    ].join("\n")
}

export function renderProxyServerBlock({ service, listenPort, sslEnabled = false }: RenderProxyServerBlockParams) {
    const certificate = sslEnabled ? getProxyServiceCertificate(service) : undefined
    const sslDirectives = sslEnabled
        ? [
              `    ssl_certificate ${toNginxPath(certificate?.certificatePath || "")};`,
              `    ssl_certificate_key ${toNginxPath(certificate?.certificateKeyPath || "")};`,
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
    const corsDirectives = renderProxyCorsDirectives({ service })

    return [
        `    location ${location.locationPath} {`,
        corsDirectives,
        `        proxy_pass ${upstream};`,
        "        proxy_set_header Host $host;",
        "        proxy_set_header X-Real-IP $remote_addr;",
        "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
        "        proxy_set_header X-Forwarded-Proto $scheme;",
        "        proxy_set_header X-Forwarded-Host $host;",
        ...websocketDirectives,
        "    }",
    ]
        .filter(Boolean)
        .join("\n")
}

export function renderProxyCorsDirectives({ service }: RenderProxyCorsDirectivesParams) {
    if (!service.corsEnabled) return ""

    return [
        "        add_header Access-Control-Allow-Origin $http_origin always;",
        '        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;',
        "        add_header Access-Control-Allow-Headers $http_access_control_request_headers always;",
        '        add_header Access-Control-Allow-Credentials "true" always;',
        '        add_header Access-Control-Max-Age "86400" always;',
        '        add_header Vary "Origin" always;',
        "        if ($request_method = OPTIONS) {",
        "            return 204;",
        "        }",
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

export function createNginxMainConfig({ config, includeDirectoryPath, streamIncludeDirectoryPath, streamEnabled = false }: CreateNginxMainConfigParams) {
    const streamBlock = streamEnabled
        ? `
stream {
    include ${toNginxPath(streamIncludeDirectoryPath)}/*.conf;
}
`
        : ""

    return `include /etc/nginx/modules-enabled/*.conf;
pid ${toNginxPath(config.dataDirectoryPath)}/nginx.pid;
error_log ${toNginxPath(config.logDirectoryPath)}/error.log warn;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log ${toNginxPath(config.logDirectoryPath)}/access.log;
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
${streamBlock}`
}

export function createOpenSslConfig({ address }: CreateOpenSslConfigParams) {
    const addressType = getProxyServiceAddressType(address)
    const altNameKey = addressType === ProxyServiceAddressType.域名 ? "DNS.1" : "IP.1"

    return `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = ${escapeOpenSslValue(address)}

[v3_req]
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
${altNameKey} = ${escapeOpenSslValue(address)}
`
}

export function getProxyServiceCertificate(service: ProxyServiceWithCertificate) {
    if (!service.certificate) throw new Error(`代理服务 ${service.id} 已开启 HTTPS / SSL，但未选择自签证书`)
    return service.certificate
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
