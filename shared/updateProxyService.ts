import { prisma } from "@/prisma"

import { getProxyServiceLocations } from "@/schemas/proxyServiceLocation"
import { ProxyServiceType } from "@/schemas/proxyServiceType"
import { updateProxyServiceSchema } from "@/schemas/updateProxyService"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { resolveProxyServiceTarget } from "@/server/proxyServiceData"
import { syncProxyServices, validateProxyServicePortConflict } from "@/server/syncProxyServices"

import { ClientError } from "@/utils/clientError"

export const updateProxyService = createSharedFn({
    name: "updateProxyService",
    schema: updateProxyServiceSchema,
    filter: isAdmin,
})(async function updateProxyService({ id, ...params }) {
    const proxyService = await prisma.proxyService.findUnique({ where: { id } })
    if (!proxyService) throw new ClientError("代理服务不存在")

    const nextProxyService = {
        ...proxyService,
        ...params,
    }

    if (nextProxyService.serviceType === ProxyServiceType.反向代理 && !nextProxyService.sourceAddress) throw new ClientError("反向代理的访问地址不能为空")
    if (nextProxyService.serviceType === ProxyServiceType.反向代理 && !nextProxyService.httpsEnabled && nextProxyService.httpPort <= 0)
        throw new ClientError("未开启 HTTPS 时 HTTP 端口不能为 0")
    if (nextProxyService.serviceType === ProxyServiceType.反向代理 && nextProxyService.httpsEnabled && nextProxyService.httpPort === nextProxyService.httpsPort)
        throw new ClientError("HTTP 端口和 HTTPS 端口不能相同")
    if (nextProxyService.serviceType === ProxyServiceType.端口转发 && nextProxyService.httpPort <= 0) throw new ClientError("端口转发的入站端口不能为 0")
    if (nextProxyService.serviceType === ProxyServiceType.端口转发 && !nextProxyService.tcpForwardEnabled && !nextProxyService.udpForwardEnabled)
        throw new ClientError("端口转发必须至少开启 TCP 或 UDP")
    if (nextProxyService.serviceType === ProxyServiceType.端口转发 && nextProxyService.httpsEnabled && !nextProxyService.tcpForwardEnabled)
        throw new ClientError("端口转发的 SSL 仅支持 TCP")

    const locations = params.locations ?? getProxyServiceLocations(proxyService.locations)

    const target = resolveProxyServiceTarget({
        serviceType: nextProxyService.serviceType,
        targetProtocol: nextProxyService.targetProtocol,
        targetHost: nextProxyService.targetHost,
        targetPort: nextProxyService.targetPort,
        locations,
    })

    const data = {
        ...params,
        ...target,
        ...(nextProxyService.serviceType === ProxyServiceType.端口转发 ? { sourceAddress: "" } : {}),
    }

    await validateProxyServicePortConflict({
        serviceId: id,
        sourceAddress: nextProxyService.sourceAddress,
        httpPort: nextProxyService.httpPort,
        httpsPort: nextProxyService.httpsPort,
        httpsEnabled: nextProxyService.httpsEnabled,
        serviceType: nextProxyService.serviceType,
        tcpForwardEnabled: nextProxyService.tcpForwardEnabled,
        udpForwardEnabled: nextProxyService.udpForwardEnabled,
    })

    await prisma.proxyService.update({
        where: { id },
        data,
    })

    await syncProxyServices({ serviceId: id })

    return prisma.proxyService.findUniqueOrThrow({ where: { id } })
})
