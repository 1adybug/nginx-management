import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryProxyServiceAction } from "@/actions/queryProxyService"

export const queryProxyServiceClient = createRequestFn(queryProxyServiceAction)

export const useQueryProxyService = createUseQuery({
    queryFn: queryProxyServiceClient,
    queryKey: "query-proxy-service",
})
