import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { deleteCertificate } from "@/shared/deleteCertificate"

export const createUseDeleteCertificate = withUseMutationDefaults<typeof deleteCertificate>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "删除自签证书中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-certificate"] })

            message.open({
                key,
                type: "success",
                content: "删除自签证书成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
