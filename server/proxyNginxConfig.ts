import { resolve } from "node:path"

import { SystemSettingKey } from "@/constants/systemSettings"

import { getCachedSystemSettingValue, normalizeBooleanValue } from "@/server/systemSettings"

export interface ProxyNginxConfig {
    applyEnabled: boolean
    nginxCommand: string
    dnsResolver: string
    dataDirectoryPath: string
    confDirectoryPath: string
    streamConfDirectoryPath: string
    certDirectoryPath: string
    logDirectoryPath: string
    tempDirectoryPath: string
    nginxConfigPath: string
    dynamicProxyScriptPath: string
    lockFilePath: string
}

export function getProxyNginxConfig() {
    const dataDirectoryPath = resolve(process.cwd(), "data", "nginx")

    const config: ProxyNginxConfig = {
        applyEnabled: getProxyNginxApplyEnabled(),
        nginxCommand: getProxyNginxCommand(),
        dnsResolver: getProxyNginxDnsResolver(),
        dataDirectoryPath,
        confDirectoryPath: resolve(dataDirectoryPath, "conf.d"),
        streamConfDirectoryPath: resolve(dataDirectoryPath, "stream.d"),
        certDirectoryPath: resolve(dataDirectoryPath, "certs"),
        logDirectoryPath: resolve(dataDirectoryPath, "logs"),
        tempDirectoryPath: resolve(dataDirectoryPath, "tmp"),
        nginxConfigPath: resolve(dataDirectoryPath, "nginx.conf"),
        dynamicProxyScriptPath: resolve(dataDirectoryPath, "dynamic-proxy.js"),
        lockFilePath: resolve(dataDirectoryPath, "proxy-service.lock"),
    }

    return config
}

export function getProxyNginxApplyEnabled() {
    try {
        return normalizeBooleanValue(getCachedSystemSettingValue(SystemSettingKey.自动应用Nginx配置))
    } catch (error) {
        console.error("[proxy-service] 读取 Nginx 自动生效设置失败，使用代码默认值", error)
        return process.env.NODE_ENV !== "development"
    }
}

export function getProxyNginxCommand() {
    try {
        return getCachedSystemSettingValue(SystemSettingKey.Nginx命令).trim() || "nginx"
    } catch (error) {
        console.error("[proxy-service] 读取 Nginx 命令设置失败，使用默认值", error)
        return "nginx"
    }
}

export function getProxyNginxDnsResolver() {
    try {
        return getCachedSystemSettingValue(SystemSettingKey.NginxDNS解析器).trim() || "1.1.1.1 8.8.8.8 valid=300s ipv6=off"
    } catch (error) {
        console.error("[proxy-service] 读取 Nginx DNS 解析器设置失败，使用默认值", error)
        return "1.1.1.1 8.8.8.8 valid=300s ipv6=off"
    }
}
