import { createRequestFn } from "deepsea-tools"

import { downloadProxyServiceCertificateAction } from "@/actions/downloadProxyServiceCertificate"

import { createUseDownloadProxyServiceCertificate } from "@/presets/createUseDownloadProxyServiceCertificate"

export const downloadProxyServiceCertificateClient = createRequestFn(downloadProxyServiceCertificateAction)

export const useDownloadProxyServiceCertificate = createUseDownloadProxyServiceCertificate(downloadProxyServiceCertificateClient)
