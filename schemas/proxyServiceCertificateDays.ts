import { getParser } from "."
import dayjs from "dayjs"
import { z } from "zod/v4"

export function getDefaultProxyServiceCertificateDays() {
    const today = dayjs().startOf("day")
    return today.add(30, "year").diff(today, "day")
}

export const defaultProxyServiceCertificateDays = getDefaultProxyServiceCertificateDays()

export const proxyServiceCertificateDaysSchema = z
    .transform(input => Number(input))
    .pipe(z.number({ message: "无效的证书有效期" }).int("证书有效期必须是整数").min(1, "证书有效期不能小于 1 天").max(36500, "证书有效期不能大于 36500 天"))
    .catch(defaultProxyServiceCertificateDays)

export type ProxyServiceCertificateDaysParams = z.infer<typeof proxyServiceCertificateDaysSchema>

export const proxyServiceCertificateDaysParser = getParser(proxyServiceCertificateDaysSchema)
