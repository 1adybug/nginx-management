import { rm } from "node:fs/promises"

import { prisma } from "@/prisma"

import { proxyServiceIdSchema } from "@/schemas/proxyServiceId"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { getProxyServiceCertificatePaths } from "@/server/proxyNginx"
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

    const paths = getProxyServiceCertificatePaths(proxyService)
    await Promise.all([rm(paths.certificatePath, { force: true }), rm(paths.certificateKeyPath, { force: true })])

    return proxyService
})
