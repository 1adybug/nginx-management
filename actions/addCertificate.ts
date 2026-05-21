"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { addCertificate } from "@/shared/addCertificate"

export const addCertificateAction = createResponseFn(addCertificate)
