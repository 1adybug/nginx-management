import { getParser } from "."
import { z } from "zod/v4"

export const proxyServicePortSchema = z
    .transform(input => Number(input))
    .pipe(z.number({ message: "无效的端口" }).int("端口必须是整数").min(1, "端口不能小于 1").max(65535, "端口不能大于 65535"))

export const proxyServiceHttpPortSchema = z
    .transform(input => Number(input))
    .pipe(z.number({ message: "无效的 HTTP 端口" }).int("HTTP 端口必须是整数").min(0, "HTTP 端口不能小于 0").max(65535, "HTTP 端口不能大于 65535"))

export type ProxyServicePortParams = z.infer<typeof proxyServicePortSchema>

export type ProxyServiceHttpPortParams = z.infer<typeof proxyServiceHttpPortSchema>

export const proxyServicePortParser = getParser(proxyServicePortSchema)

export const proxyServiceHttpPortParser = getParser(proxyServiceHttpPortSchema)
