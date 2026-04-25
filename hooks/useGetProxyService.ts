import { createRequestFn, isNonNullable } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { getProxyServiceAction } from "@/actions/getProxyService"

import { ProxyServiceIdParams } from "@/schemas/proxyServiceId"

export const getProxyServiceClient = createRequestFn(getProxyServiceAction)

export function getProxyServiceClientOptional(id?: ProxyServiceIdParams | undefined) {
    return isNonNullable(id) ? getProxyServiceClient(id) : null
}

export const useGetProxyService = createUseQuery({
    queryFn: getProxyServiceClientOptional,
    queryKey: "get-proxy-service",
})
