import { prisma } from "@/prisma"

import { addProxyServiceSchema } from "@/schemas/addProxyService"
import { ProxyServiceType } from "@/schemas/proxyServiceType"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { syncProxyServices, validateProxyServicePortConflict } from "@/server/syncProxyServices"

export const addProxyService = createSharedFn({
    name: "addProxyService",
    schema: addProxyServiceSchema,
    filter: isAdmin,
})(async function addProxyService(params) {
    const data = {
        ...params,
        sourceAddress: params.serviceType === ProxyServiceType.端口转发 ? "" : params.sourceAddress!,
    }

    await validateProxyServicePortConflict(data)

    const proxyService = await prisma.proxyService.create({ data })

    await syncProxyServices({ serviceId: proxyService.id })

    return prisma.proxyService.findUniqueOrThrow({ where: { id: proxyService.id } })
})
