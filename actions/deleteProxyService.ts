"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { deleteProxyService } from "@/shared/deleteProxyService"

export const deleteProxyServiceAction = createResponseFn(deleteProxyService)
