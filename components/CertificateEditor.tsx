"use client"

import { type FC, useEffect } from "react"

import { useForm } from "@tanstack/react-form"
import { LoaderCircleIcon } from "lucide-react"
import type { ZodType } from "zod/v4"

import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { useAddCertificate } from "@/hooks/useAddCertificate"

import { type AddCertificateParams, addCertificateParser, addCertificateSchema, optionalCertificateRemarkSchema } from "@/schemas/addCertificate"
import { certificateNameSchema } from "@/schemas/certificateName"
import { proxyServiceAddressSchema } from "@/schemas/proxyServiceAddress"
import { defaultProxyServiceCertificateDays, proxyServiceCertificateDaysSchema } from "@/schemas/proxyServiceCertificateDays"

import { getOnBlurValidator } from "@/utils/getOnBlurValidator"

const certificateFormSchema = addCertificateSchema as ZodType<AddCertificateParams, AddCertificateParams>

export interface CertificateEditorProps {
    open?: boolean
    onClose?: () => void
}

export function getDefaultCertificateFormValues(): AddCertificateParams {
    return {
        name: undefined,
        address: "",
        days: defaultProxyServiceCertificateDays,
        remark: undefined,
    }
}

export const CertificateEditor: FC<CertificateEditorProps> = ({ open = false, onClose }) => {
    const { mutateAsync: addCertificate, isPending } = useAddCertificate({
        onSuccess() {
            onClose?.()
        },
    })

    const form = useForm({
        defaultValues: getDefaultCertificateFormValues(),
        validators: {
            onSubmit: certificateFormSchema,
        },
        async onSubmit({ value }) {
            await addCertificate(addCertificateParser(value))
        },
    })

    useEffect(() => void form.reset(getDefaultCertificateFormValues()), [form, open])

    function onOpenChange(nextOpen: boolean) {
        if (!nextOpen && !isPending) onClose?.()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={!isPending}>
                <DialogHeader>
                    <DialogTitle>生成自签证书</DialogTitle>
                    <DialogDescription>填写证书地址、有效期与可选备注。</DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <form
                        id="certificate-editor-form"
                        onSubmit={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            void form.handleSubmit()
                        }}
                    >
                        <FieldGroup>
                            <form.Field name="name" validators={{ onBlur: getOnBlurValidator(certificateNameSchema.optional()) }}>
                                {field => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>证书名称</FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                autoComplete="off"
                                                disabled={isPending}
                                                placeholder="默认使用访问地址"
                                                aria-invalid={isInvalid}
                                                value={field.state.value ?? ""}
                                                onBlur={field.handleBlur}
                                                onChange={event => field.handleChange(event.target.value || undefined)}
                                            />
                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </form.Field>
                            <form.Field name="address" validators={{ onBlur: getOnBlurValidator(proxyServiceAddressSchema) }}>
                                {field => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>访问地址</FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                autoComplete="off"
                                                disabled={isPending}
                                                placeholder="example.com / 192.168.1.10 / fd00::1"
                                                aria-invalid={isInvalid}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={event => field.handleChange(event.target.value)}
                                            />
                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </form.Field>
                            <form.Field name="days" validators={{ onBlur: getOnBlurValidator(proxyServiceCertificateDaysSchema) }}>
                                {field => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>证书有效期（天）</FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type="number"
                                                min={1}
                                                max={36500}
                                                disabled={isPending}
                                                aria-invalid={isInvalid}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={event => field.handleChange(Number(event.target.value))}
                                            />
                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </form.Field>
                            <form.Field name="remark" validators={{ onBlur: getOnBlurValidator(optionalCertificateRemarkSchema) }}>
                                {field => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>备注</FieldLabel>
                                            <Textarea
                                                id={field.name}
                                                name={field.name}
                                                autoComplete="off"
                                                disabled={isPending}
                                                aria-invalid={isInvalid}
                                                value={field.state.value ?? ""}
                                                onBlur={field.handleBlur}
                                                onChange={event => field.handleChange(event.target.value || undefined)}
                                            />
                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    )
                                }}
                            </form.Field>
                        </FieldGroup>
                    </form>
                </DialogBody>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
                        取消
                    </Button>
                    <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                        {([canSubmit, isSubmitting, isPristine]) => (
                            <Button type="submit" form="certificate-editor-form" disabled={!canSubmit || isPending || isSubmitting || isPristine}>
                                {(isPending || isSubmitting) && <LoaderCircleIcon className="animate-spin" />}
                                生成证书
                            </Button>
                        )}
                    </form.Subscribe>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
