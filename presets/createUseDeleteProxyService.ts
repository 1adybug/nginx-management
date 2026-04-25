import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { deleteProxyService } from "@/shared/deleteProxyService"

export const createUseDeleteProxyService = withUseMutationDefaults<typeof deleteProxyService>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "删除代理服务中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-proxy-service"] })
            context.client.invalidateQueries({ queryKey: ["get-proxy-service", data.id] })

            message.open({
                key,
                type: "success",
                content: "删除代理服务成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
