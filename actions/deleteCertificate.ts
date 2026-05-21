"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { deleteCertificate } from "@/shared/deleteCertificate"

export const deleteCertificateAction = createResponseFn(deleteCertificate)
