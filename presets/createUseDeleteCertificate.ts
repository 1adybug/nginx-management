import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import type { deleteCertificate } from "@/shared/deleteCertificate"

import { toast } from "@/utils/toast"

export const createUseDeleteCertificate = withUseMutationDefaults<typeof deleteCertificate>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {
            toast.loading("删除自签证书中...", { id: key })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-certificate"] })

            toast.success("删除自签证书成功", { id: key })
        },
        onError(error, variables, onMutateResult, context) {
            toast.dismiss(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
