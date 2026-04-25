import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { regenerateProxyServiceCertificate } from "@/shared/regenerateProxyServiceCertificate"

export const createUseRegenerateProxyServiceCertificate = withUseMutationDefaults<typeof regenerateProxyServiceCertificate>(() => {
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
            context.client.invalidateQueries({ queryKey: ["query-proxy-service"] })
            context.client.invalidateQueries({ queryKey: ["get-proxy-service", data.id] })

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
