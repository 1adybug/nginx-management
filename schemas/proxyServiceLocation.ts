import { getParser } from "."
import { z } from "zod/v4"

import { proxyServiceAddressSchema } from "./proxyServiceAddress"
import { proxyServiceLocationPathSchema } from "./proxyServiceLocationPath"
import { proxyServicePortSchema } from "./proxyServicePort"
import { proxyServiceTargetPathSchema } from "./proxyServiceTargetPath"
import { ProxyTargetProtocol, proxyTargetProtocolSchema } from "./proxyTargetProtocol"

export const proxyServiceLocationSchema = z.object(
    {
        locationPath: proxyServiceLocationPathSchema,
        targetProtocol: proxyTargetProtocolSchema.catch(ProxyTargetProtocol.HTTP),
        targetHost: proxyServiceAddressSchema,
        targetPort: proxyServicePortSchema,
        targetPath: proxyServiceTargetPathSchema.default("/"),
    },
    { message: "无效的路径规则" },
)

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

export type ProxyServiceLocationParams = z.infer<typeof proxyServiceLocationSchema>

export type ProxyServiceLocationsParams = z.infer<typeof proxyServiceLocationsSchema>

export const proxyServiceLocationParser = getParser(proxyServiceLocationSchema)

export const proxyServiceLocationsParser = getParser(proxyServiceLocationsSchema)

export function getProxyServiceLocations(value: unknown): ProxyServiceLocationsParams {
    const result = proxyServiceLocationsSchema.safeParse(value)
    return result.success ? result.data : []
}
