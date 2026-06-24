import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { downloadCertificate } from "@/shared/downloadCertificate"

export const createUseDownloadCertificate = withUseMutationDefaults<typeof downloadCertificate>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "下载自签证书中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            message.open({
                key,
                type: "success",
                content: "下载自签证书成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
