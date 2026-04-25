import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { addProxyService } from "@/shared/addProxyService"

export const createUseAddProxyService = withUseMutationDefaults<typeof addProxyService>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "新增代理服务中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-proxy-service"] })
            context.client.invalidateQueries({ queryKey: ["get-proxy-service", data.id] })

            message.open({
                key,
                type: "success",
                content: "新增代理服务成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
