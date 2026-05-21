import { prisma } from "@/prisma"

import { ClientError } from "@/utils/clientError"

export interface ResolveProxyServiceCertificateParams {
    httpsEnabled: boolean
    certificateId?: string
    sourceAddress: string
}

export async function resolveProxyServiceCertificate({ httpsEnabled, certificateId, sourceAddress }: ResolveProxyServiceCertificateParams) {
    if (!httpsEnabled) return undefined
    if (!certificateId) throw new ClientError("开启 HTTPS / SSL 时必须选择自签证书")

    const certificate = await prisma.certificate.findUnique({ where: { id: certificateId } })
    if (!certificate) throw new ClientError("选择的自签证书不存在")
    if (certificate.address !== sourceAddress) throw new ClientError("选择的自签证书地址必须和访问地址一致")

    return certificate
}
