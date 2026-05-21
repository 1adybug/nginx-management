import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { addCertificate } from "@/shared/addCertificate"

export const createUseAddCertificate = withUseMutationDefaults<typeof addCertificate>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            message.open({
                key,
                type: "loading",
                content: "生成自签证书中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-certificate"] })

            message.open({
                key,
                type: "success",
                content: "生成自签证书成功",
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
