"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { updateProxyService } from "@/shared/updateProxyService"

export const updateProxyServiceAction = createResponseFn(updateProxyService)
