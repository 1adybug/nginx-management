import { prisma } from "@/prisma"

import { proxyServiceIdSchema } from "@/schemas/proxyServiceId"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { syncProxyServices } from "@/server/syncProxyServices"

import { ClientError } from "@/utils/clientError"

export const deleteProxyService = createSharedFn({
    name: "deleteProxyService",
    schema: proxyServiceIdSchema,
    filter: isAdmin,
})(async function deleteProxyService(id) {
    const proxyService = await prisma.proxyService.findUnique({ where: { id } })
    if (!proxyService) throw new ClientError("代理服务不存在")

    await prisma.proxyService.delete({ where: { id } })
    await syncProxyServices()

    return proxyService
})
