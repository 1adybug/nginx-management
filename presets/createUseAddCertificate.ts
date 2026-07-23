import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { addCertificate } from "@/shared/addCertificate"

import { toast } from "@/utils/toast"

export const createUseAddCertificate = withUseMutationDefaults<typeof addCertificate>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("生成自签证书中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-certificate"] })

            toast.success("生成自签证书成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
