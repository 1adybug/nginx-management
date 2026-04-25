"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryProxyService } from "@/shared/queryProxyService"

export const queryProxyServiceAction = createResponseFn(queryProxyService)
