import { getParser } from "."
import { z } from "zod/v4"

import { proxyServiceAddressSchema } from "./proxyServiceAddress"
import { proxyServiceLocationPathSchema } from "./proxyServiceLocationPath"
import { ProxyServiceLocationTargetMode, proxyServiceLocationTargetModeSchema } from "./proxyServiceLocationTargetMode"
import { proxyServicePortSchema } from "./proxyServicePort"
import { proxyServiceTargetPathSchema } from "./proxyServiceTargetPath"
import { ProxyTargetProtocol, proxyTargetProtocolSchema } from "./proxyTargetProtocol"

export interface ProxyServiceLocationParams {
    /** Location 路径 */
    locationPath: string
    /** 目标模式 */
    targetMode: ProxyServiceLocationTargetMode
    /** 静态转发协议 */
    targetProtocol?: ProxyTargetProtocol
    /** 静态转发主机 */
    targetHost?: string
    /** 静态转发端口 */
    targetPort?: number
    /** 静态转发路径 */
    targetPath?: string
    /** 动态目标 URL 参数名 */
    dynamicTargetQueryName?: string
    /** 动态目标 URL 允许正则 */
    dynamicTargetAllowPattern?: string
}

export type ProxyServiceLocationsParams = ProxyServiceLocationParams[]

export const dynamicProxyServiceTargetQueryNameSchema = z
    .string({ message: "无效的动态目标参数名" })
    .trim()
    .min(1, { message: "动态目标参数名不能为空" })
    .max(64, { message: "动态目标参数名不能超过 64 个字符" })
    .regex(/^[A-Za-z_][A-Za-z0-9_-]*$/, { message: "动态目标参数名只能包含字母、数字、下划线和中划线，并且必须以字母或下划线开头" })

export type DynamicProxyServiceTargetQueryNameParams = z.infer<typeof dynamicProxyServiceTargetQueryNameSchema>

export const dynamicProxyServiceTargetQueryNameParser = getParser(dynamicProxyServiceTargetQueryNameSchema)

export const dynamicProxyServiceTargetAllowPatternSchema = z.preprocess(
    input => {
        if (typeof input === "undefined") return undefined
        if (input === null) return undefined
        if (typeof input === "string" && !input.trim()) return undefined
        return input
    },
    z
        .string({ message: "无效的动态目标正则" })
        .trim()
        .max(500, { message: "动态目标正则不能超过 500 个字符" })
        .refine(value => !/[\r\n]/.test(value), { message: "动态目标正则不能包含换行符" })
        .refine(
            value => {
                try {
                    new RegExp(value)
                    return true
                } catch {
                    return false
                }
            },
            { message: "动态目标正则格式不正确" },
        )
        .optional(),
)

export type DynamicProxyServiceTargetAllowPatternParams = z.infer<typeof dynamicProxyServiceTargetAllowPatternSchema>

export const dynamicProxyServiceTargetAllowPatternParser = getParser(dynamicProxyServiceTargetAllowPatternSchema)

export const optionalProxyServiceLocationTargetHostSchema = z.preprocess(input => {
    if (typeof input === "string" && !input.trim()) return undefined
    return input
}, proxyServiceAddressSchema.optional())

export const proxyServiceLocationSchema: z.ZodType<ProxyServiceLocationParams> = z
    .object(
        {
            locationPath: proxyServiceLocationPathSchema,
            targetMode: proxyServiceLocationTargetModeSchema,
            targetProtocol: proxyTargetProtocolSchema.catch(ProxyTargetProtocol.HTTP),
            targetHost: optionalProxyServiceLocationTargetHostSchema,
            targetPort: proxyServicePortSchema.optional(),
            targetPath: proxyServiceTargetPathSchema.default("/"),
            dynamicTargetQueryName: dynamicProxyServiceTargetQueryNameSchema.default("url"),
            dynamicTargetAllowPattern: dynamicProxyServiceTargetAllowPatternSchema,
        },
        { message: "无效的路径规则" },
    )
    .superRefine((location, context) => {
        if (location.targetMode === ProxyServiceLocationTargetMode.动态) return

        if (!location.targetHost) {
            context.addIssue({
                code: "custom",
                message: "静态路径规则的转发主机不能为空",
                path: ["targetHost"],
            })
        }

        if (!location.targetPort) {
            context.addIssue({
                code: "custom",
                message: "静态路径规则的转发端口不能为空",
                path: ["targetPort"],
            })
        }
    })
    .transform(location => {
        if (location.targetMode === ProxyServiceLocationTargetMode.动态) {
            return {
                locationPath: location.locationPath,
                targetMode: location.targetMode,
                dynamicTargetQueryName: location.dynamicTargetQueryName,
                ...(location.dynamicTargetAllowPattern ? { dynamicTargetAllowPattern: location.dynamicTargetAllowPattern } : {}),
            }
        }

        return {
            locationPath: location.locationPath,
            targetMode: location.targetMode,
            targetProtocol: location.targetProtocol,
            targetHost: location.targetHost,
            targetPort: location.targetPort,
            targetPath: location.targetPath,
        }
    })

export const proxyServiceLocationsSchema = z.array(proxyServiceLocationSchema, { message: "无效的路径规则列表" }).superRefine((locations, context) => {
    const locationPaths = new Set<string>()

    locations.forEach((location, index) => {
        if (!locationPaths.has(location.locationPath)) {
            locationPaths.add(location.locationPath)
            return
        }

        context.addIssue({
            code: "custom",
            message: "路径规则不能重复",
            path: [index, "locationPath"],
        })
    })
})

export const proxyServiceLocationParser = getParser(proxyServiceLocationSchema)

export const proxyServiceLocationsParser = getParser(proxyServiceLocationsSchema)

export function isDynamicProxyServiceLocation(location: ProxyServiceLocationParams) {
    return location.targetMode === ProxyServiceLocationTargetMode.动态
}

export function isStaticProxyServiceLocation(location: ProxyServiceLocationParams) {
    return !isDynamicProxyServiceLocation(location)
}

export function getProxyServiceLocations(value: unknown): ProxyServiceLocationsParams {
    const result = proxyServiceLocationsSchema.safeParse(value)
    return result.success ? result.data : []
}
