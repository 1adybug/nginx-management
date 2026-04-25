import { createRequestFn } from "deepsea-tools"

import { updateProxyServiceAction } from "@/actions/updateProxyService"

import { createUseUpdateProxyService } from "@/presets/createUseUpdateProxyService"

export const updateProxyServiceClient = createRequestFn(updateProxyServiceAction)

export const useUpdateProxyService = createUseUpdateProxyService(updateProxyServiceClient)
