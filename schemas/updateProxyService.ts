import { getParser } from "."
import { z } from "zod/v4"

import { proxyServiceInputSchema } from "./addProxyService"
import { proxyServiceIdSchema } from "./proxyServiceId"

export const updateProxyServiceSchema = proxyServiceInputSchema.partial().extend(
    z.object({
        id: proxyServiceIdSchema,
    }).shape,
)

export type UpdateProxyServiceParams = z.infer<typeof updateProxyServiceSchema>

export const updateProxyServiceParser = getParser(updateProxyServiceSchema)
