import { InputJsonValue } from "@/prisma/generated/internal/prismaNamespace"

import { ProxyServiceLocationsParams } from "@/schemas/proxyServiceLocation"
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
    targetHost: string
    targetPort: number
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
        const location = locations[0]
        if (!location) throw new ClientError("反向代理必须至少配置一条路径规则")

        return {
            targetProtocol: location.targetProtocol,
            targetHost: location.targetHost,
            targetPort: location.targetPort,
            locations: locations as InputJsonValue,
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
