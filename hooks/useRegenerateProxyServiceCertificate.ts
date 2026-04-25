import { createRequestFn } from "deepsea-tools"

import { regenerateProxyServiceCertificateAction } from "@/actions/regenerateProxyServiceCertificate"

import { createUseRegenerateProxyServiceCertificate } from "@/presets/createUseRegenerateProxyServiceCertificate"

export const regenerateProxyServiceCertificateClient = createRequestFn(regenerateProxyServiceCertificateAction)

export const useRegenerateProxyServiceCertificate = createUseRegenerateProxyServiceCertificate(regenerateProxyServiceCertificateClient)
