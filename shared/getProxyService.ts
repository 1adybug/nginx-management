import { prisma } from "@/prisma"

import { proxyServiceIdSchema } from "@/schemas/proxyServiceId"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export const getProxyService = createSharedFn({
    name: "getProxyService",
    schema: proxyServiceIdSchema,
    filter: isAdmin,
})(async function getProxyService(id) {
    const proxyService = await prisma.proxyService.findUnique({ where: { id } })
    if (!proxyService) throw new ClientError("代理服务不存在")
    return proxyService
})
