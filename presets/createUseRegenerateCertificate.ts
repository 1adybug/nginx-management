import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { regenerateCertificate } from "@/shared/regenerateCertificate"

import { toast } from "@/utils/toast"

export const createUseRegenerateCertificate = withUseMutationDefaults<typeof regenerateCertificate>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("重新生成自签证书中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-certificate"] })
            context.client.invalidateQueries({ queryKey: ["query-proxy-service"] })

            toast.success("重新生成自签证书成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
