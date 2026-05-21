import { prisma } from "@/prisma"

import { addProxyServiceSchema } from "@/schemas/addProxyService"
import { ProxyServiceType } from "@/schemas/proxyServiceType"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { resolveProxyServiceCertificate } from "@/server/proxyServiceCertificateData"
import { resolveProxyServiceTarget } from "@/server/proxyServiceData"
import { syncProxyServices, validateProxyServicePortConflict } from "@/server/syncProxyServices"

export const addProxyService = createSharedFn({
    name: "addProxyService",
    schema: addProxyServiceSchema,
    filter: isAdmin,
})(async function addProxyService(params) {
    const target = resolveProxyServiceTarget(params)
    const { certificate, sourceAddress } = await resolveProxyServiceCertificate({
        httpsEnabled: params.httpsEnabled,
        certificateId: params.certificateId,
        sourceAddress: params.serviceType === ProxyServiceType.反向代理 ? params.sourceAddress : undefined,
    })

    const data = {
        ...params,
        ...target,
        sourceAddress,
        certificateId: certificate?.id,
    }

    await validateProxyServicePortConflict(data)

    const proxyService = await prisma.proxyService.create({ data })

    await syncProxyServices({ serviceId: proxyService.id })

    return prisma.proxyService.findUniqueOrThrow({ where: { id: proxyService.id } })
})
