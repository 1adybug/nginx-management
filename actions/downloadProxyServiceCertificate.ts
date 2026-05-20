"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { downloadProxyServiceCertificate } from "@/shared/downloadProxyServiceCertificate"

export const downloadProxyServiceCertificateAction = createResponseFn(downloadProxyServiceCertificate)
