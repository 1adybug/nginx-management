import { createRequestFn } from "deepsea-tools"

import { downloadCertificateAction } from "@/actions/downloadCertificate"

import { createUseDownloadCertificate } from "@/presets/createUseDownloadCertificate"

export const downloadCertificateClient = createRequestFn(downloadCertificateAction)

export const useDownloadCertificate = createUseDownloadCertificate(downloadCertificateClient)
