"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { regenerateProxyServiceCertificate } from "@/shared/regenerateProxyServiceCertificate"

export const regenerateProxyServiceCertificateAction = createResponseFn(regenerateProxyServiceCertificate)
