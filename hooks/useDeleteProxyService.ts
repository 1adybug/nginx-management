import { createRequestFn } from "deepsea-tools"

import { deleteProxyServiceAction } from "@/actions/deleteProxyService"

import { createUseDeleteProxyService } from "@/presets/createUseDeleteProxyService"

export const deleteProxyServiceClient = createRequestFn(deleteProxyServiceAction)

export const useDeleteProxyService = createUseDeleteProxyService(deleteProxyServiceClient)
