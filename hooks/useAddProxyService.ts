import { createRequestFn } from "deepsea-tools"

import { addProxyServiceAction } from "@/actions/addProxyService"

import { createUseAddProxyService } from "@/presets/createUseAddProxyService"

export const addProxyServiceClient = createRequestFn(addProxyServiceAction)

export const useAddProxyService = createUseAddProxyService(addProxyServiceClient)
