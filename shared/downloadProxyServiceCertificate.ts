import { createReadStream } from "node:fs"

import { prisma } from "@/prisma"

import { ProxyService } from "@/prisma/generated/client"

import { proxyServiceIdSchema } from "@/schemas/proxyServiceId"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { ensureProxyServiceCertificate, getProxyServiceCertificatePaths, hasFile } from "@/server/proxyNginx"

import { ClientError } from "@/utils/clientError"

/** 下载代理服务证书结果 */
export interface DownloadProxyServiceCertificateResult {
    /** 代理服务 ID */
    id: string
    /** 证书文件名 */
    filename: string
    /** 证书内容 */
    content: string
}

export const downloadProxyServiceCertificate = createSharedFn({
    name: "downloadProxyServiceCertificate",
    schema: proxyServiceIdSchema,
    filter: isAdmin,
})(async function downloadProxyServiceCertificate(id): Promise<DownloadProxyServiceCertificateResult> {
    const proxyService = await prisma.proxyService.findUnique({ where: { id } })
    if (!proxyService) throw new ClientError("代理服务不存在")
    if (!proxyService.httpsEnabled) throw new ClientError("代理服务未开启 HTTPS")

    const nextProxyService = await ensureProxyServiceCertificate({ service: proxyService })
    const paths = getProxyServiceCertificatePaths(nextProxyService)

    if (!(await hasFile(paths.certificatePath))) throw new ClientError("证书文件不存在，请先重新生成自签证书")

    const content = await readUtf8File(paths.certificatePath)

    return {
        id: nextProxyService.id,
        filename: getProxyServiceCertificateFilename(nextProxyService),
        content,
    }
})

async function readUtf8File(filePath: string) {
    const stream = createReadStream(filePath, { encoding: "utf8" })

    const chunks: string[] = []

    for await (const chunk of stream) chunks.push(String(chunk))

    return chunks.join("")
}

function getProxyServiceCertificateFilename(service: ProxyService) {
    const name = service.sourceAddress || service.targetHost || service.id
    const safeName = name.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "")

    return `nginx-management-${safeName || service.id}-${service.id}.crt`
}
