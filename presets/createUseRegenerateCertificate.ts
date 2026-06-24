import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { regenerateCertificate } from "@/shared/regenerateCertificate"

export const createUseRegenerateCertificate = withUseMutationDefaults<typeof regenerateCertificate>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "重新生成自签证书中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-certificate"] })
            context.client.invalidateQueries({ queryKey: ["query-proxy-service"] })

            message.open({
                key,
                type: "success",
                content: "重新生成自签证书成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
