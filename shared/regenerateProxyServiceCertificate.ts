import { prisma } from "@/prisma"

import { proxyServiceIdSchema } from "@/schemas/proxyServiceId"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { ensureProxyServiceCertificate } from "@/server/proxyNginx"
import { syncProxyServices } from "@/server/syncProxyServices"

import { ClientError } from "@/utils/clientError"

export const regenerateProxyServiceCertificate = createSharedFn({
    name: "regenerateProxyServiceCertificate",
    schema: proxyServiceIdSchema,
    filter: isAdmin,
})(async function regenerateProxyServiceCertificate(id) {
    const proxyService = await prisma.proxyService.findUnique({ where: { id } })
    if (!proxyService) throw new ClientError("代理服务不存在")
    if (!proxyService.httpsEnabled) throw new ClientError("代理服务未开启 HTTPS")

    const nextProxyService = await ensureProxyServiceCertificate({
        service: proxyService,
        force: true,
    })

    await syncProxyServices({ serviceId: id })

    return nextProxyService
})
