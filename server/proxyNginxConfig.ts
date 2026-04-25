import { resolve } from "node:path"

import { IsProduction } from "@/constants"

import { getBooleanFromEnv } from "@/utils/getBooleanFromEnv"

export interface ProxyNginxConfig {
    applyEnabled: boolean
    nginxCommand: string
    dataDirectoryPath: string
    confDirectoryPath: string
    streamConfDirectoryPath: string
    certDirectoryPath: string
    tempDirectoryPath: string
    nginxConfigPath: string
    lockFilePath: string
}

export function getProxyNginxConfig() {
    const dataDirectoryPath = resolve(process.cwd(), "data", "nginx")

    const config: ProxyNginxConfig = {
        applyEnabled: getProxyNginxApplyEnabled(),
        nginxCommand: process.env.NGINX_COMMAND || "nginx",
        dataDirectoryPath,
        confDirectoryPath: resolve(dataDirectoryPath, "conf.d"),
        streamConfDirectoryPath: resolve(dataDirectoryPath, "stream.d"),
        certDirectoryPath: resolve(dataDirectoryPath, "certs"),
        tempDirectoryPath: resolve(dataDirectoryPath, "tmp"),
        nginxConfigPath: resolve(dataDirectoryPath, "nginx.conf"),
        lockFilePath: resolve(dataDirectoryPath, "proxy-service.lock"),
    }

    return config
}

export function getProxyNginxApplyEnabled() {
    const value = process.env.NGINX_PROXY_APPLY_ENABLED
    if (value === undefined) return IsProduction
    return getBooleanFromEnv(value)
}
