import { createReadStream } from "node:fs"

import { prisma } from "@/prisma"

import { certificateIdSchema } from "@/schemas/certificateId"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { hasFile } from "@/server/proxyNginx"

import { ClientError } from "@/utils/clientError"

/** 下载证书结果 */
export interface DownloadCertificateResult {
    /** 证书 ID */
    id: string
    /** 证书文件名 */
    filename: string
    /** 证书内容 */
    content: string
}

export const downloadCertificate = createSharedFn({
    name: "downloadCertificate",
    schema: certificateIdSchema,
    filter: isAdmin,
})(async function downloadCertificate(id): Promise<DownloadCertificateResult> {
    const certificate = await prisma.certificate.findUnique({ where: { id } })
    if (!certificate) throw new ClientError("自签证书不存在")
    if (!(await hasFile(certificate.certificatePath))) throw new ClientError("证书文件不存在，请先重新生成自签证书")

    const content = await readUtf8File(certificate.certificatePath)

    return {
        id: certificate.id,
        filename: getCertificateFilename(certificate.address, certificate.id),
        content,
    }
})

async function readUtf8File(filePath: string) {
    const stream = createReadStream(filePath, { encoding: "utf8" })

    const chunks: string[] = []

    for await (const chunk of stream) chunks.push(String(chunk))

    return chunks.join("")
}

function getCertificateFilename(address: string, id: string) {
    const safeName = address.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "")

    return `nginx-management-${safeName || id}-${id}.crt`
}
