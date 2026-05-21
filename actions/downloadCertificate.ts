"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { downloadCertificate } from "@/shared/downloadCertificate"

export const downloadCertificateAction = createResponseFn(downloadCertificate)
