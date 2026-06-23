import type { InputJsonValue } from "@/prisma/generated/internal/prismaNamespace"

import { type ProxyServiceLocationsParams, isStaticProxyServiceLocation } from "@/schemas/proxyServiceLocation"
import { ProxyServiceType } from "@/schemas/proxyServiceType"
import { ProxyTargetProtocol } from "@/schemas/proxyTargetProtocol"

import { ClientError } from "@/utils/clientError"

export interface ResolveProxyServiceTargetParams {
    serviceType: string
    targetProtocol?: string
    targetHost?: string
    targetPort?: number
    locations?: ProxyServiceLocationsParams
}

export interface ResolvedProxyServiceTarget {
    targetProtocol: string
    targetHost?: string
    targetPort?: number
    locations: InputJsonValue
}

export function resolveProxyServiceTarget({
    serviceType,
    targetProtocol = ProxyTargetProtocol.HTTP,
    targetHost,
    targetPort,
    locations = [],
}: ResolveProxyServiceTargetParams): ResolvedProxyServiceTarget {
    if (serviceType === ProxyServiceType.反向代理) {
        if (locations.length <= 0) throw new ClientError("反向代理必须至少配置一条路径规则")

        const location = locations.find(isStaticProxyServiceLocation)

        if (!location) {
            return {
                targetProtocol: ProxyTargetProtocol.HTTP,
                locations: locations as unknown as InputJsonValue,
            }
        }

        if (!location.targetHost) throw new ClientError("静态路径规则的转发主机不能为空")
        if (!location.targetPort) throw new ClientError("静态路径规则的转发端口不能为空")

        return {
            targetProtocol: location.targetProtocol ?? ProxyTargetProtocol.HTTP,
            targetHost: location.targetHost,
            targetPort: location.targetPort,
            locations: locations as unknown as InputJsonValue,
        }
    }

    if (!targetHost) throw new ClientError("端口转发的转发主机不能为空")
    if (!targetPort) throw new ClientError("端口转发的转发端口不能为空")

    return {
        targetProtocol,
        targetHost,
        targetPort,
        locations: [],
    }
}
