"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { queryCertificate } from "@/shared/queryCertificate"

export const queryCertificateAction = createResponseFn(queryCertificate)
