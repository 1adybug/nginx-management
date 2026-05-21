import { createRequestFn } from "deepsea-tools"

import { deleteCertificateAction } from "@/actions/deleteCertificate"

import { createUseDeleteCertificate } from "@/presets/createUseDeleteCertificate"

export const deleteCertificateClient = createRequestFn(deleteCertificateAction)

export const useDeleteCertificate = createUseDeleteCertificate(deleteCertificateClient)
