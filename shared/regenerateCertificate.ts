import { prisma } from "@/prisma"

import { certificateIdSchema } from "@/schemas/certificateId"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { generateSelfSignedCertificate } from "@/server/proxyNginx"
import { syncProxyServices } from "@/server/syncProxyServices"

import { ClientError } from "@/utils/clientError"

export const regenerateCertificate = createSharedFn({
    name: "regenerateCertificate",
    schema: certificateIdSchema,
    filter: isAdmin,
})(async function regenerateCertificate(id) {
    const certificate = await prisma.certificate.findUnique({ where: { id } })
    if (!certificate) throw new ClientError("自签证书不存在")

    const nextCertificate = await generateSelfSignedCertificate({
        id: certificate.id,
        address: certificate.address,
        days: certificate.days,
        certificatePath: certificate.certificatePath,
        certificateKeyPath: certificate.certificateKeyPath,
    })

    const data = await prisma.certificate.update({
        where: { id },
        data: {
            certificatePath: nextCertificate.certificatePath,
            certificateKeyPath: nextCertificate.certificateKeyPath,
            expiresAt: nextCertificate.expiresAt,
        },
    })

    await syncProxyServices()

    return data
})
