"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { regenerateCertificate } from "@/shared/regenerateCertificate"

export const regenerateCertificateAction = createResponseFn(regenerateCertificate)
