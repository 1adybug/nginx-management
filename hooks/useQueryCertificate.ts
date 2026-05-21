import { createRequestFn } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"

import { queryCertificateAction } from "@/actions/queryCertificate"

export const queryCertificateClient = createRequestFn(queryCertificateAction)

export const useQueryCertificate = createUseQuery({
    queryFn: queryCertificateClient,
    queryKey: "query-certificate",
})
