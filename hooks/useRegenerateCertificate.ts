import { createRequestFn } from "deepsea-tools"

import { regenerateCertificateAction } from "@/actions/regenerateCertificate"

import { createUseRegenerateCertificate } from "@/presets/createUseRegenerateCertificate"

export const regenerateCertificateClient = createRequestFn(regenerateCertificateAction)

export const useRegenerateCertificate = createUseRegenerateCertificate(regenerateCertificateClient)
