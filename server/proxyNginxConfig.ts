import { resolve } from "node:path"

import { SystemSettingKey } from "@/constants/systemSettings"

import { getCachedSystemSettingValue, normalizeBooleanValue } from "@/server/systemSettings"

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
        nginxCommand: getProxyNginxCommand(),
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
