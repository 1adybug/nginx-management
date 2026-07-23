import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { deleteProxyService } from "@/shared/deleteProxyService"

import { toast } from "@/utils/toast"

export const createUseDeleteProxyService = withUseMutationDefaults<typeof deleteProxyService>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("删除代理服务中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-proxy-service"] })
            context.client.invalidateQueries({ queryKey: ["get-proxy-service", data.id] })

            toast.success("删除代理服务成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
