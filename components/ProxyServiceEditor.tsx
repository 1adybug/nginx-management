"use client"

import { type FC, useEffect } from "react"

import { useForm } from "@tanstack/react-form"
import { isNonNullable } from "deepsea-tools"
import { LoaderCircleIcon, PlusIcon, Trash2Icon } from "lucide-react"
import type { ZodType } from "zod/v4"

import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import { useAddProxyService } from "@/hooks/useAddProxyService"
import { useGetProxyService } from "@/hooks/useGetProxyService"
import { useQueryCertificate } from "@/hooks/useQueryCertificate"
import { useUpdateProxyService } from "@/hooks/useUpdateProxyService"

import type { ProxyService } from "@/prisma/generated/client"

import {
    type AddProxyServiceParams,
    addProxyServiceParser,
    addProxyServiceSchema,
    defaultProxyServiceHttpPort,
    defaultProxyServiceHttpsPort,
    optionalProxyServiceAddressSchema,
    optionalProxyServiceRemarkSchema,
} from "@/schemas/addProxyService"
import { certificateIdSchema } from "@/schemas/certificateId"
import { proxyServiceAddressSchema } from "@/schemas/proxyServiceAddress"
import {
    type ProxyServiceLocationParams,
    dynamicProxyServiceTargetAllowPatternSchema,
    dynamicProxyServiceTargetQueryNameSchema,
    getProxyServiceLocations,
} from "@/schemas/proxyServiceLocation"
import { proxyServiceLocationPathSchema } from "@/schemas/proxyServiceLocationPath"
import { ProxyServiceLocationTargetMode, proxyServiceLocationTargetModeSchema } from "@/schemas/proxyServiceLocationTargetMode"
import { proxyServiceHttpPortSchema, proxyServicePortSchema } from "@/schemas/proxyServicePort"
import { proxyServiceTargetPathSchema } from "@/schemas/proxyServiceTargetPath"
import { type ProxyServiceType, proxyServiceTypeParser, proxyServiceTypeSchema, ProxyServiceType as ProxyServiceTypeValue } from "@/schemas/proxyServiceType"
import {
    type ProxyTargetProtocol,
    proxyTargetProtocolParser,
    proxyTargetProtocolSchema,
    ProxyTargetProtocol as ProxyTargetProtocolValue,
} from "@/schemas/proxyTargetProtocol"
import { updateProxyServiceParser } from "@/schemas/updateProxyService"

import { getOnBlurValidator } from "@/utils/getOnBlurValidator"

const proxyServiceFormSchema = addProxyServiceSchema as ZodType<AddProxyServiceParams, AddProxyServiceParams>

export interface ProxyServiceEditorProps {
    id?: string
    defaultServiceType?: ProxyServiceType
    open?: boolean
    onClose?: () => void
}

export interface GetDefaultProxyServiceFormValuesParams {
    serviceType?: ProxyServiceType
}

export function getDefaultProxyServiceLocationFormValues(): ProxyServiceLocationParams {
    return {
        locationPath: "/",
        targetMode: ProxyServiceLocationTargetMode.静态,
        targetProtocol: ProxyTargetProtocolValue.HTTP,
        targetHost: "",
        targetPort: 80,
        targetPath: "/",
        dynamicTargetQueryName: "url",
    }
}

export function getDefaultProxyServiceFormValues({
    serviceType = ProxyServiceTypeValue.反向代理,
}: GetDefaultProxyServiceFormValuesParams = {}): AddProxyServiceParams {
    return {
        serviceType,
        sourceAddress: undefined,
        httpPort: defaultProxyServiceHttpPort,
        httpsPort: defaultProxyServiceHttpsPort,
        targetProtocol: ProxyTargetProtocolValue.HTTP,
        targetHost: undefined,
        targetPort: undefined,
        locations: serviceType === ProxyServiceTypeValue.反向代理 ? [getDefaultProxyServiceLocationFormValues()] : [],
        websocketEnabled: true,
        corsEnabled: false,
        tcpForwardEnabled: true,
        udpForwardEnabled: false,
        enabled: true,
        httpsEnabled: false,
        http2HttpsEnabled: false,
        certificateId: undefined,
        remark: undefined,
    }
}

export function getProxyServiceFormValues(data: ProxyService): AddProxyServiceParams {
    return {
        serviceType: proxyServiceTypeParser(data.serviceType),
        sourceAddress: data.sourceAddress,
        httpPort: data.httpPort,
        httpsPort: data.httpsPort,
        targetProtocol: proxyTargetProtocolParser(data.targetProtocol),
        targetHost: data.targetHost ?? undefined,
        targetPort: data.targetPort ?? undefined,
        locations: getProxyServiceLocations(data.locations),
        websocketEnabled: data.websocketEnabled,
        corsEnabled: data.corsEnabled,
        tcpForwardEnabled: data.tcpForwardEnabled,
        udpForwardEnabled: data.udpForwardEnabled,
        enabled: data.enabled,
        httpsEnabled: data.httpsEnabled,
        http2HttpsEnabled: data.http2HttpsEnabled,
        certificateId: data.certificateId ?? undefined,
        remark: data.remark || undefined,
    }
}

interface SwitchFieldProps {
    label: string
    checked: boolean
    disabled: boolean
    onCheckedChange: (checked: boolean) => void
}

const SwitchField: FC<SwitchFieldProps> = ({ label, checked, disabled, onCheckedChange }) => (
    <Field orientation="horizontal" className="rounded-2xl border px-3 py-2">
        <FieldLabel className="flex-auto">{label}</FieldLabel>
        <Switch className="flex-none" checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </Field>
)

export const ProxyServiceEditor: FC<ProxyServiceEditorProps> = ({ id, defaultServiceType = ProxyServiceTypeValue.反向代理, open = false, onClose }) => {
    const isUpdate = isNonNullable(id)
    const { data, isLoading } = useGetProxyService(id, { enabled: open && isUpdate })
    const { data: certificateData, isLoading: isCertificateLoading } = useQueryCertificate({ pageSize: 1000 }, { enabled: open })

    const { mutateAsync: addProxyService, isPending: isAddProxyServicePending } = useAddProxyService({
        onSuccess() {
            onClose?.()
        },
    })

    const { mutateAsync: updateProxyService, isPending: isUpdateProxyServicePending } = useUpdateProxyService({
        onSuccess() {
            onClose?.()
        },
    })

    const form = useForm({
        defaultValues: getDefaultProxyServiceFormValues({ serviceType: defaultServiceType }),
        validators: {
            onSubmit: proxyServiceFormSchema,
        },
        async onSubmit({ value }) {
            const values = addProxyServiceParser(value)

            if (id) await updateProxyService(updateProxyServiceParser({ id, ...values }))
            else await addProxyService(values)
        },
    })

    useEffect(() => {
        if (!open || !isUpdate) form.reset(getDefaultProxyServiceFormValues({ serviceType: defaultServiceType }))
    }, [defaultServiceType, form, isUpdate, open])

    useEffect(() => {
        if (open && data) form.reset(getProxyServiceFormValues(data))
    }, [data, form, open])

    const isPending = isAddProxyServicePending || isUpdateProxyServicePending
    const isRequesting = isLoading || isPending

    function onOpenChange(nextOpen: boolean) {
        if (!nextOpen && !isPending) onClose?.()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl" showCloseButton={!isPending}>
                <DialogHeader>
                    <form.Subscribe selector={state => state.values.serviceType}>
                        {serviceType => (
                            <DialogTitle>
                                {isUpdate ? "修改" : "新增"}
                                {serviceType === ProxyServiceTypeValue.端口转发 ? "端口转发" : "反向代理"}
                            </DialogTitle>
                        )}
                    </form.Subscribe>
                    <DialogDescription>配置反向代理或端口转发，保存后会同步 Nginx 配置。</DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <form
                        id="proxy-service-editor-form"
                        onSubmit={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            void form.handleSubmit()
                        }}
                    >
                        <FieldGroup className="gap-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <form.Field name="serviceType" validators={{ onBlur: getOnBlurValidator(proxyServiceTypeSchema) }}>
                                    {field => {
                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel>类型</FieldLabel>
                                                <Select
                                                    value={field.state.value}
                                                    disabled={isRequesting || isUpdate}
                                                    onValueChange={value => {
                                                        const serviceType = value as ProxyServiceType
                                                        field.handleChange(serviceType)

                                                        if (serviceType === ProxyServiceTypeValue.反向代理 && form.getFieldValue("locations").length === 0)
                                                            form.setFieldValue("locations", [getDefaultProxyServiceLocationFormValues()])
                                                    }}
                                                >
                                                    <SelectTrigger aria-invalid={isInvalid} onBlur={field.handleBlur}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={ProxyServiceTypeValue.反向代理}>反向代理</SelectItem>
                                                        <SelectItem value={ProxyServiceTypeValue.端口转发}>端口转发</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                            </Field>
                                        )
                                    }}
                                </form.Field>
                                <form.Field name="enabled">
                                    {field => (
                                        <SwitchField
                                            label="启用服务"
                                            checked={field.state.value}
                                            disabled={isRequesting}
                                            onCheckedChange={field.handleChange}
                                        />
                                    )}
                                </form.Field>
                            </div>

                            <form.Subscribe selector={state => [state.values.serviceType, state.values.httpsEnabled]}>
                                {([serviceType, httpsEnabled]) =>
                                    serviceType === ProxyServiceTypeValue.端口转发 ? (
                                        <FieldGroup className="gap-5 rounded-2xl border bg-muted/30 p-4">
                                            <div className="grid gap-4 md:grid-cols-3">
                                                <form.Field name="httpPort" validators={{ onBlur: getOnBlurValidator(proxyServicePortSchema) }}>
                                                    {field => {
                                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                        return (
                                                            <Field data-invalid={isInvalid}>
                                                                <FieldLabel htmlFor="proxy-service-http-port">入站端口</FieldLabel>
                                                                <Input
                                                                    id="proxy-service-http-port"
                                                                    type="number"
                                                                    min={1}
                                                                    max={65535}
                                                                    disabled={isRequesting}
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
                                                <form.Field name="targetHost" validators={{ onBlur: getOnBlurValidator(optionalProxyServiceAddressSchema) }}>
                                                    {field => {
                                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                        return (
                                                            <Field data-invalid={isInvalid}>
                                                                <FieldLabel htmlFor="proxy-service-target-host">转发主机</FieldLabel>
                                                                <Input
                                                                    id="proxy-service-target-host"
                                                                    autoComplete="off"
                                                                    disabled={isRequesting}
                                                                    placeholder="10.0.0.1"
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
                                                <form.Field name="targetPort" validators={{ onBlur: getOnBlurValidator(proxyServicePortSchema.optional()) }}>
                                                    {field => {
                                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                        return (
                                                            <Field data-invalid={isInvalid}>
                                                                <FieldLabel htmlFor="proxy-service-target-port">转发端口</FieldLabel>
                                                                <Input
                                                                    id="proxy-service-target-port"
                                                                    type="number"
                                                                    min={1}
                                                                    max={65535}
                                                                    disabled={isRequesting}
                                                                    aria-invalid={isInvalid}
                                                                    value={field.state.value ?? ""}
                                                                    onBlur={field.handleBlur}
                                                                    onChange={event =>
                                                                        field.handleChange(event.target.value ? Number(event.target.value) : undefined)
                                                                    }
                                                                />
                                                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                            </Field>
                                                        )
                                                    }}
                                                </form.Field>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <form.Field name="tcpForwardEnabled">
                                                    {field => (
                                                        <SwitchField
                                                            label="TCP"
                                                            checked={field.state.value}
                                                            disabled={isRequesting}
                                                            onCheckedChange={field.handleChange}
                                                        />
                                                    )}
                                                </form.Field>
                                                <form.Field name="udpForwardEnabled">
                                                    {field => (
                                                        <SwitchField
                                                            label="UDP"
                                                            checked={field.state.value}
                                                            disabled={isRequesting}
                                                            onCheckedChange={field.handleChange}
                                                        />
                                                    )}
                                                </form.Field>
                                                <form.Field name="httpsEnabled">
                                                    {field => (
                                                        <SwitchField
                                                            label="SSL 证书"
                                                            checked={field.state.value}
                                                            disabled={isRequesting}
                                                            onCheckedChange={field.handleChange}
                                                        />
                                                    )}
                                                </form.Field>
                                            </div>
                                        </FieldGroup>
                                    ) : (
                                        <FieldGroup className="gap-5">
                                            <div className="grid gap-4 md:grid-cols-3">
                                                {!httpsEnabled && (
                                                    <form.Field
                                                        name="sourceAddress"
                                                        validators={{ onBlur: getOnBlurValidator(optionalProxyServiceAddressSchema) }}
                                                    >
                                                        {field => {
                                                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                            return (
                                                                <Field data-invalid={isInvalid}>
                                                                    <FieldLabel htmlFor="proxy-service-source-address">访问地址</FieldLabel>
                                                                    <Input
                                                                        id="proxy-service-source-address"
                                                                        autoComplete="off"
                                                                        disabled={isRequesting}
                                                                        placeholder="example.com"
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
                                                )}
                                                <form.Field name="httpPort" validators={{ onBlur: getOnBlurValidator(proxyServiceHttpPortSchema) }}>
                                                    {field => {
                                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                        return (
                                                            <Field data-invalid={isInvalid}>
                                                                <FieldLabel htmlFor="proxy-service-http-port">HTTP 端口</FieldLabel>
                                                                <Input
                                                                    id="proxy-service-http-port"
                                                                    type="number"
                                                                    min={0}
                                                                    max={65535}
                                                                    disabled={isRequesting}
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
                                                <form.Field name="httpsPort" validators={{ onBlur: getOnBlurValidator(proxyServicePortSchema) }}>
                                                    {field => {
                                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                        return (
                                                            <Field data-invalid={isInvalid}>
                                                                <FieldLabel htmlFor="proxy-service-https-port">HTTPS 端口</FieldLabel>
                                                                <Input
                                                                    id="proxy-service-https-port"
                                                                    type="number"
                                                                    min={1}
                                                                    max={65535}
                                                                    disabled={isRequesting}
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
                                            </div>

                                            <form.Field name="locations" mode="array">
                                                {locationsField => (
                                                    <Field>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <FieldLabel>路径规则</FieldLabel>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={isRequesting}
                                                                onClick={() => locationsField.pushValue(getDefaultProxyServiceLocationFormValues())}
                                                            >
                                                                <PlusIcon />
                                                                添加路径规则
                                                            </Button>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {locationsField.state.value.map((location, index) => (
                                                                <div key={index} className="space-y-4 rounded-2xl border bg-muted/30 p-4">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="text-sm font-medium">
                                                                            {index === 0 ? "Location" : `Location ${index + 1}`}
                                                                        </div>
                                                                        <Button
                                                                            type="button"
                                                                            size="icon-sm"
                                                                            variant="ghost"
                                                                            disabled={isRequesting || locationsField.state.value.length <= 1}
                                                                            aria-label={`删除 Location ${index + 1}`}
                                                                            onClick={() => locationsField.removeValue(index)}
                                                                        >
                                                                            <Trash2Icon />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="grid gap-4 md:grid-cols-2">
                                                                        <form.Field
                                                                            name={`locations[${index}].locationPath`}
                                                                            validators={{ onBlur: getOnBlurValidator(proxyServiceLocationPathSchema) }}
                                                                        >
                                                                            {field => {
                                                                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                                                return (
                                                                                    <Field data-invalid={isInvalid}>
                                                                                        <FieldLabel htmlFor={`proxy-location-${index}-path`}>
                                                                                            Location
                                                                                        </FieldLabel>
                                                                                        <Input
                                                                                            id={`proxy-location-${index}-path`}
                                                                                            autoComplete="off"
                                                                                            disabled={isRequesting}
                                                                                            placeholder="/path"
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
                                                                        <form.Field
                                                                            name={`locations[${index}].targetMode`}
                                                                            validators={{ onBlur: getOnBlurValidator(proxyServiceLocationTargetModeSchema) }}
                                                                        >
                                                                            {field => {
                                                                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                                                return (
                                                                                    <Field data-invalid={isInvalid}>
                                                                                        <FieldLabel>目标模式</FieldLabel>
                                                                                        <Select
                                                                                            value={field.state.value}
                                                                                            disabled={isRequesting}
                                                                                            onValueChange={value =>
                                                                                                field.handleChange(value as ProxyServiceLocationTargetMode)
                                                                                            }
                                                                                        >
                                                                                            <SelectTrigger aria-invalid={isInvalid} onBlur={field.handleBlur}>
                                                                                                <SelectValue />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                <SelectItem value={ProxyServiceLocationTargetMode.静态}>
                                                                                                    静态目标
                                                                                                </SelectItem>
                                                                                                <SelectItem value={ProxyServiceLocationTargetMode.动态}>
                                                                                                    动态 URL
                                                                                                </SelectItem>
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                                                    </Field>
                                                                                )
                                                                            }}
                                                                        </form.Field>
                                                                    </div>

                                                                    {location.targetMode === ProxyServiceLocationTargetMode.动态 ? (
                                                                        <div className="grid gap-4 md:grid-cols-2">
                                                                            <form.Field
                                                                                name={`locations[${index}].dynamicTargetQueryName`}
                                                                                validators={{
                                                                                    onBlur: getOnBlurValidator(
                                                                                        dynamicProxyServiceTargetQueryNameSchema.optional(),
                                                                                    ),
                                                                                }}
                                                                            >
                                                                                {field => {
                                                                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                                                    return (
                                                                                        <Field data-invalid={isInvalid}>
                                                                                            <FieldLabel htmlFor={`proxy-location-${index}-query`}>
                                                                                                URL 参数名
                                                                                            </FieldLabel>
                                                                                            <Input
                                                                                                id={`proxy-location-${index}-query`}
                                                                                                autoComplete="off"
                                                                                                disabled={isRequesting}
                                                                                                placeholder="url"
                                                                                                aria-invalid={isInvalid}
                                                                                                value={field.state.value ?? ""}
                                                                                                onBlur={field.handleBlur}
                                                                                                onChange={event => field.handleChange(event.target.value)}
                                                                                            />
                                                                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                                                        </Field>
                                                                                    )
                                                                                }}
                                                                            </form.Field>
                                                                            <form.Field
                                                                                name={`locations[${index}].dynamicTargetAllowPattern`}
                                                                                validators={{
                                                                                    onBlur: getOnBlurValidator(dynamicProxyServiceTargetAllowPatternSchema),
                                                                                }}
                                                                            >
                                                                                {field => {
                                                                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                                                    return (
                                                                                        <Field data-invalid={isInvalid}>
                                                                                            <FieldLabel htmlFor={`proxy-location-${index}-pattern`}>
                                                                                                允许 URL 正则
                                                                                            </FieldLabel>
                                                                                            <Input
                                                                                                id={`proxy-location-${index}-pattern`}
                                                                                                autoComplete="off"
                                                                                                disabled={isRequesting}
                                                                                                placeholder="^https://example\\.com/"
                                                                                                aria-invalid={isInvalid}
                                                                                                value={field.state.value ?? ""}
                                                                                                onBlur={field.handleBlur}
                                                                                                onChange={event =>
                                                                                                    field.handleChange(event.target.value || undefined)
                                                                                                }
                                                                                            />
                                                                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                                                        </Field>
                                                                                    )
                                                                                }}
                                                                            </form.Field>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="grid gap-4 md:grid-cols-4">
                                                                            <form.Field
                                                                                name={`locations[${index}].targetHost`}
                                                                                validators={{
                                                                                    onBlur: getOnBlurValidator(proxyServiceAddressSchema.optional()),
                                                                                }}
                                                                            >
                                                                                {field => {
                                                                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                                                    return (
                                                                                        <Field className="md:col-span-2" data-invalid={isInvalid}>
                                                                                            <FieldLabel htmlFor={`proxy-location-${index}-host`}>
                                                                                                转发主机 / IP
                                                                                            </FieldLabel>
                                                                                            <Input
                                                                                                id={`proxy-location-${index}-host`}
                                                                                                autoComplete="off"
                                                                                                disabled={isRequesting}
                                                                                                placeholder="10.0.0.1"
                                                                                                aria-invalid={isInvalid}
                                                                                                value={field.state.value ?? ""}
                                                                                                onBlur={field.handleBlur}
                                                                                                onChange={event =>
                                                                                                    field.handleChange(event.target.value || undefined)
                                                                                                }
                                                                                            />
                                                                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                                                        </Field>
                                                                                    )
                                                                                }}
                                                                            </form.Field>
                                                                            <form.Field
                                                                                name={`locations[${index}].targetPort`}
                                                                                validators={{ onBlur: getOnBlurValidator(proxyServicePortSchema.optional()) }}
                                                                            >
                                                                                {field => {
                                                                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                                                    return (
                                                                                        <Field data-invalid={isInvalid}>
                                                                                            <FieldLabel htmlFor={`proxy-location-${index}-port`}>
                                                                                                转发端口
                                                                                            </FieldLabel>
                                                                                            <Input
                                                                                                id={`proxy-location-${index}-port`}
                                                                                                type="number"
                                                                                                min={1}
                                                                                                max={65535}
                                                                                                disabled={isRequesting}
                                                                                                aria-invalid={isInvalid}
                                                                                                value={field.state.value ?? ""}
                                                                                                onBlur={field.handleBlur}
                                                                                                onChange={event =>
                                                                                                    field.handleChange(
                                                                                                        event.target.value
                                                                                                            ? Number(event.target.value)
                                                                                                            : undefined,
                                                                                                    )
                                                                                                }
                                                                                            />
                                                                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                                                        </Field>
                                                                                    )
                                                                                }}
                                                                            </form.Field>
                                                                            <form.Field
                                                                                name={`locations[${index}].targetProtocol`}
                                                                                validators={{
                                                                                    onBlur: getOnBlurValidator(proxyTargetProtocolSchema.optional()),
                                                                                }}
                                                                            >
                                                                                {field => {
                                                                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                                                    return (
                                                                                        <Field data-invalid={isInvalid}>
                                                                                            <FieldLabel>转发协议</FieldLabel>
                                                                                            <Select
                                                                                                value={field.state.value ?? ProxyTargetProtocolValue.HTTP}
                                                                                                disabled={isRequesting}
                                                                                                onValueChange={value =>
                                                                                                    field.handleChange(value as ProxyTargetProtocol)
                                                                                                }
                                                                                            >
                                                                                                <SelectTrigger
                                                                                                    aria-invalid={isInvalid}
                                                                                                    onBlur={field.handleBlur}
                                                                                                >
                                                                                                    <SelectValue />
                                                                                                </SelectTrigger>
                                                                                                <SelectContent>
                                                                                                    <SelectItem value={ProxyTargetProtocolValue.HTTP}>
                                                                                                        HTTP
                                                                                                    </SelectItem>
                                                                                                    <SelectItem value={ProxyTargetProtocolValue.HTTPS}>
                                                                                                        HTTPS
                                                                                                    </SelectItem>
                                                                                                </SelectContent>
                                                                                            </Select>
                                                                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                                                        </Field>
                                                                                    )
                                                                                }}
                                                                            </form.Field>
                                                                            <form.Field
                                                                                name={`locations[${index}].targetPath`}
                                                                                validators={{
                                                                                    onBlur: getOnBlurValidator(proxyServiceTargetPathSchema.optional()),
                                                                                }}
                                                                            >
                                                                                {field => {
                                                                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                                                                    return (
                                                                                        <Field className="md:col-span-4" data-invalid={isInvalid}>
                                                                                            <FieldLabel htmlFor={`proxy-location-${index}-target-path`}>
                                                                                                转发路径
                                                                                            </FieldLabel>
                                                                                            <Input
                                                                                                id={`proxy-location-${index}-target-path`}
                                                                                                autoComplete="off"
                                                                                                disabled={isRequesting}
                                                                                                placeholder="/path/"
                                                                                                aria-invalid={isInvalid}
                                                                                                value={field.state.value ?? ""}
                                                                                                onBlur={field.handleBlur}
                                                                                                onChange={event =>
                                                                                                    field.handleChange(event.target.value || undefined)
                                                                                                }
                                                                                            />
                                                                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                                                        </Field>
                                                                                    )
                                                                                }}
                                                                            </form.Field>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </Field>
                                                )}
                                            </form.Field>

                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                <form.Field name="websocketEnabled">
                                                    {field => (
                                                        <SwitchField
                                                            label="WebSocket"
                                                            checked={field.state.value}
                                                            disabled={isRequesting}
                                                            onCheckedChange={field.handleChange}
                                                        />
                                                    )}
                                                </form.Field>
                                                <form.Field name="corsEnabled">
                                                    {field => (
                                                        <SwitchField
                                                            label="关闭跨域"
                                                            checked={field.state.value}
                                                            disabled={isRequesting}
                                                            onCheckedChange={field.handleChange}
                                                        />
                                                    )}
                                                </form.Field>
                                                <form.Field name="httpsEnabled">
                                                    {field => (
                                                        <SwitchField
                                                            label="HTTPS"
                                                            checked={field.state.value}
                                                            disabled={isRequesting}
                                                            onCheckedChange={field.handleChange}
                                                        />
                                                    )}
                                                </form.Field>
                                                <form.Field name="http2HttpsEnabled">
                                                    {field => (
                                                        <SwitchField
                                                            label="HTTP 跳转"
                                                            checked={field.state.value}
                                                            disabled={isRequesting}
                                                            onCheckedChange={field.handleChange}
                                                        />
                                                    )}
                                                </form.Field>
                                            </div>
                                        </FieldGroup>
                                    )
                                }
                            </form.Subscribe>

                            <form.Subscribe selector={state => [state.values.serviceType, state.values.httpsEnabled]}>
                                {([serviceType, httpsEnabled]) =>
                                    httpsEnabled && (
                                        <form.Field name="certificateId" validators={{ onBlur: getOnBlurValidator(certificateIdSchema.optional()) }}>
                                            {field => {
                                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                                return (
                                                    <Field data-invalid={isInvalid}>
                                                        <FieldLabel>{serviceType === ProxyServiceTypeValue.端口转发 ? "SSL 证书" : "HTTPS 证书"}</FieldLabel>
                                                        <Select
                                                            value={field.state.value}
                                                            disabled={isRequesting || isCertificateLoading}
                                                            onValueChange={field.handleChange}
                                                        >
                                                            <SelectTrigger aria-invalid={isInvalid} onBlur={field.handleBlur}>
                                                                <SelectValue placeholder={isCertificateLoading ? "加载证书中..." : "请选择已有自签证书"} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {certificateData?.list.map(certificate => (
                                                                    <SelectItem key={certificate.id} value={certificate.id}>
                                                                        {certificate.name}（{certificate.address}）
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                    </Field>
                                                )
                                            }}
                                        </form.Field>
                                    )
                                }
                            </form.Subscribe>

                            <form.Field name="remark" validators={{ onBlur: getOnBlurValidator(optionalProxyServiceRemarkSchema) }}>
                                {field => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor="proxy-service-remark">备注</FieldLabel>
                                            <Textarea
                                                id="proxy-service-remark"
                                                autoComplete="off"
                                                disabled={isRequesting}
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
                            <Button type="submit" form="proxy-service-editor-form" disabled={!canSubmit || isRequesting || isSubmitting || isPristine}>
                                {(isRequesting || isSubmitting) && <LoaderCircleIcon className="animate-spin" />}
                                保存
                            </Button>
                        )}
                    </form.Subscribe>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
