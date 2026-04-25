"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { addProxyService } from "@/shared/addProxyService"

export const addProxyServiceAction = createResponseFn(addProxyService)
