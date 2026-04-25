"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { getProxyService } from "@/shared/getProxyService"

export const getProxyServiceAction = createResponseFn(getProxyService)
