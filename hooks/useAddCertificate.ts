import { createRequestFn } from "deepsea-tools"

import { addCertificateAction } from "@/actions/addCertificate"

import { createUseAddCertificate } from "@/presets/createUseAddCertificate"

export const addCertificateClient = createRequestFn(addCertificateAction)

export const useAddCertificate = createUseAddCertificate(addCertificateClient)
