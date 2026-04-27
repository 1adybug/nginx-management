import { prisma } from "@/prisma"

import { ProxyService } from "@/prisma/generated/client"

import { ProxyServiceType } from "@/schemas/proxyServiceType"

import { applyProxyServices } from "@/server/proxyNginx"
import { getProxyNginxConfig } from "@/server/proxyNginxConfig"

import { ClientError } from "@/utils/clientError"

export interface SyncProxyServicesParams {
    serviceId?: string
}

export interface ValidateProxyServicePortConflictParams {
    serviceId?: string
    sourceAddress: string
    httpPort: number
    httpsPort: number
    httpsEnabled: boolean
    serviceType: string
    tcpForwardEnabled: boolean
    udpForwardEnabled: boolean
}

export interface ProxyServiceListenEndpoint {
    port: number
    protocol: string
}

export interface UpdateProxyServiceApplyResultParams {
    serviceId?: string
    lastApplyError?: string
}

export async function syncProxyServices({ serviceId }: SyncProxyServicesParams = {}) {
    const config = getProxyNginxConfig()

    if (!config.applyEnabled) return

    try {
        await applyProxyServices()
        await updateProxyServiceApplyResult()
        if (serviceId) await updateProxyServiceApplyResult({ serviceId })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        await updateProxyServiceApplyResult({
            serviceId,
            lastApplyError: message,
        })

        throw new ClientError({
            message: `Nginx 配置生效失败: ${message}`,
            origin: error,
        })
    }
}

export async function updateProxyServiceApplyResult({ serviceId, lastApplyError }: UpdateProxyServiceApplyResultParams = {}) {
    const data = lastApplyError
        ? {
              lastApplyError,
          }
        : {
              lastAppliedAt: new Date(),
              lastApplyError: null,
          }

    if (serviceId) {
        await prisma.proxyService.update({
            where: { id: serviceId },
            data,
        })

        return
    }

    await prisma.proxyService.updateMany({
        where: { enabled: true },
        data,
    })
}

export async function validateProxyServicePortConflict(params: ValidateProxyServicePortConflictParams) {
    const conflict = await getProxyServicePortConflict(params)
    if (!conflict) return

    throw new ClientError("监听端口已被代理服务占用")
}

export async function getProxyServicePortConflict(params: ValidateProxyServicePortConflictParams) {
    const services = await prisma.proxyService.findMany({
        where: {
            ...(params.serviceId ? { id: { not: params.serviceId } } : {}),
        },
    })

    const nextEndpoints = getProxyServiceListenEndpoints(params)

    return services.find(service => {
        const serviceEndpoints = getProxyServiceListenEndpoints(service)

        return nextEndpoints.some(nextEndpoint =>
            serviceEndpoints.some(serviceEndpoint => {
                if (nextEndpoint.port !== serviceEndpoint.port || nextEndpoint.protocol !== serviceEndpoint.protocol) return false
                if (params.serviceType === ProxyServiceType.反向代理 && service.serviceType === ProxyServiceType.反向代理)
                    return params.sourceAddress === service.sourceAddress
                return true
            }))
    })
}

export function getProxyServiceListenEndpoints(
    service: Pick<ProxyService, "serviceType" | "httpPort" | "httpsPort" | "httpsEnabled" | "tcpForwardEnabled" | "udpForwardEnabled">,
) {
    const endpoints: ProxyServiceListenEndpoint[] = []

    if (service.serviceType === ProxyServiceType.端口转发) {
        if (service.tcpForwardEnabled && service.httpPort > 0) endpoints.push({ port: service.httpPort, protocol: "tcp" })
        if (service.udpForwardEnabled && service.httpPort > 0) endpoints.push({ port: service.httpPort, protocol: "udp" })
        return endpoints
    }

    if (service.httpPort > 0) endpoints.push({ port: service.httpPort, protocol: "tcp" })
    if (service.httpsEnabled) endpoints.push({ port: service.httpsPort, protocol: "tcp" })

    return endpoints
}
