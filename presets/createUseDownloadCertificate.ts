import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { downloadCertificate } from "@/shared/downloadCertificate"

import { toast } from "@/utils/toast"

export const createUseDownloadCertificate = withUseMutationDefaults<typeof downloadCertificate>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("下载自签证书中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            toast.success("下载自签证书成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
