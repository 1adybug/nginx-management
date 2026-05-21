import { randomUUID } from "node:crypto"
import { rm } from "node:fs/promises"

import { prisma } from "@/prisma"

import { addCertificateSchema } from "@/schemas/addCertificate"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { generateSelfSignedCertificate } from "@/server/proxyNginx"

import { ClientError } from "@/utils/clientError"

export const addCertificate = createSharedFn({
    name: "addCertificate",
    schema: addCertificateSchema,
    filter: isAdmin,
})(async function addCertificate(params) {
    const existingCertificate = await prisma.certificate.findUnique({ where: { address: params.address } })
    if (existingCertificate) throw new ClientError("该访问地址已经存在自签证书")

    const id = randomUUID()
    const certificate = await generateSelfSignedCertificate({
        id,
        address: params.address,
        days: params.days,
    })

    try {
        return await prisma.certificate.create({
            data: {
                id,
                name: params.name || params.address,
                address: params.address,
                days: params.days,
                certificatePath: certificate.certificatePath,
                certificateKeyPath: certificate.certificateKeyPath,
                expiresAt: certificate.expiresAt,
                remark: params.remark,
            },
        })
    } catch (error) {
        await Promise.all([rm(certificate.certificatePath, { force: true }), rm(certificate.certificateKeyPath, { force: true })])
        throw error
    }
})
