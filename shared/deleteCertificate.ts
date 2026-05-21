import { rm } from "node:fs/promises"

import { prisma } from "@/prisma"

import { certificateIdSchema } from "@/schemas/certificateId"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

import { ClientError } from "@/utils/clientError"

export const deleteCertificate = createSharedFn({
    name: "deleteCertificate",
    schema: certificateIdSchema,
    filter: isAdmin,
})(async function deleteCertificate(id) {
    const certificate = await prisma.certificate.findUnique({ where: { id } })
    if (!certificate) throw new ClientError("自签证书不存在")

    const proxyServiceCount = await prisma.proxyService.count({ where: { certificateId: id } })
    if (proxyServiceCount > 0) throw new ClientError("该自签证书正在被代理服务使用，不能删除")

    await prisma.certificate.delete({ where: { id } })
    await Promise.all([rm(certificate.certificatePath, { force: true }), rm(certificate.certificateKeyPath, { force: true })])

    return certificate
})
