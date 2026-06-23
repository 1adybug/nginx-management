import { prisma } from "@/prisma"

import type { Certificate } from "@/prisma/generated/client"

import { ClientError } from "@/utils/clientError"

export interface ResolveProxyServiceCertificateParams {
    httpsEnabled: boolean
    certificateId?: string
    sourceAddress?: string
}

export interface ResolvedProxyServiceCertificate {
    certificate?: Certificate
    sourceAddress: string
}

export async function resolveProxyServiceCertificate({
    httpsEnabled,
    certificateId,
    sourceAddress = "",
}: ResolveProxyServiceCertificateParams): Promise<ResolvedProxyServiceCertificate> {
    if (!httpsEnabled) {
        return {
            sourceAddress,
        }
    }

    if (!certificateId) throw new ClientError("开启 HTTPS / SSL 时必须选择自签证书")

    const certificate = await prisma.certificate.findUnique({ where: { id: certificateId } })
    if (!certificate) throw new ClientError("选择的自签证书不存在")

    return {
        certificate,
        sourceAddress: certificate.address,
    }
}
