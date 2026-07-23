"use client"

import { type FC, useEffect, useState } from "react"

import { useForm } from "@tanstack/react-form"
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table"
import { PlusIcon } from "lucide-react"
import Link from "next/link"
import type { StateToQueryFnMap } from "soda-hooks"
import { useQueryState } from "soda-next"
import { z } from "zod/v4"

import { ConfirmButton } from "@/components/ConfirmButton"
import { DataTable } from "@/components/DataTable"
import { DatePicker } from "@/components/DatePicker"
import { InfoDialog } from "@/components/InfoDialog"
import { ProxyServiceEditor } from "@/components/ProxyServiceEditor"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useDeleteProxyService } from "@/hooks/useDeleteProxyService"
import { useQueryProxyService } from "@/hooks/useQueryProxyService"
import { useUpdateProxyService } from "@/hooks/useUpdateProxyService"

import type { Certificate, ProxyService } from "@/prisma/generated/client"

import { getParser } from "@/schemas"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { type ProxyServiceLocationParams, getProxyServiceLocations, isDynamicProxyServiceLocation } from "@/schemas/proxyServiceLocation"
import { type ProxyServiceSortByParams, proxyServiceSortBySchema } from "@/schemas/proxyServiceSortBy"
import { type ProxyServiceType, proxyServiceTypeSchema, ProxyServiceType as ProxyServiceTypeValue } from "@/schemas/proxyServiceType"
import { sortOrderSchema } from "@/schemas/sortOrder"

import { formatDateTime } from "@/utils/formatDateTime"
import { formatProxyServiceUpstreamUrl } from "@/utils/proxyServiceAddress"
import { formatProxyServiceTargetPath } from "@/utils/proxyServicePath"
import { parseQueryDate, stringifyQueryEndDate, stringifyQueryStartDate } from "@/utils/queryDate"

type BooleanFilterValue = "all" | "true" | "false"

type ProxyServiceTypeFilterValue = "all" | ProxyServiceType

interface ProxyServiceFilterValues {
    serviceType: ProxyServiceTypeFilterValue
    sourceAddress: string
    targetHost: string
    enabled: BooleanFilterValue
    httpsEnabled: BooleanFilterValue
    createdAfter?: Date
    createdBefore?: Date
    updatedAfter?: Date
    updatedBefore?: Date
}

export interface ProxyServiceRow extends ProxyService {
    certificate?: Certificate
}

const booleanFilterSchema = z.enum(["all", "true", "false"])
const proxyServiceTypeFilterSchema = z.union([z.literal("all"), proxyServiceTypeSchema])

const proxyServiceFilterSchema = z.object({
    serviceType: proxyServiceTypeFilterSchema,
    sourceAddress: z.string(),
    targetHost: z.string(),
    enabled: booleanFilterSchema,
    httpsEnabled: booleanFilterSchema,
    createdAfter: z.union([z.custom<Date>(), z.undefined()]),
    createdBefore: z.union([z.custom<Date>(), z.undefined()]),
    updatedAfter: z.union([z.custom<Date>(), z.undefined()]),
    updatedBefore: z.union([z.custom<Date>(), z.undefined()]),
})

const queryBooleanSchema = z.union([z.boolean(), z.stringbool()])

const queryParsers = {
    enabled: getParser(queryBooleanSchema.optional().catch(undefined)),
    httpsEnabled: getParser(queryBooleanSchema.optional().catch(undefined)),
    serviceType: getParser(proxyServiceTypeSchema.optional().catch(undefined)),
    createdBefore: parseQueryDate,
    createdAfter: parseQueryDate,
    updatedBefore: parseQueryDate,
    updatedAfter: parseQueryDate,
    pageNum: pageNumParser,
    pageSize: pageSizeParser,
    sortBy: getParser(proxyServiceSortBySchema.optional().catch(undefined)),
    sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
}

const queryStringifiers: StateToQueryFnMap<typeof queryParsers> = {
    createdBefore: stringifyQueryEndDate,
    createdAfter: stringifyQueryStartDate,
    updatedBefore: stringifyQueryEndDate,
    updatedAfter: stringifyQueryStartDate,
}

function formatBooleanFilterValue(value?: boolean): BooleanFilterValue {
    return value === undefined ? "all" : `${value}`
}

function parseBooleanFilterValue(value: BooleanFilterValue) {
    return value === "all" ? undefined : value === "true"
}

function formatProxyServiceLocationTarget(location: ProxyServiceLocationParams) {
    if (isDynamicProxyServiceLocation(location)) {
        const patternText = location.dynamicTargetAllowPattern ? "，已限制" : "，全部允许"
        return `动态 URL（query: ${location.dynamicTargetQueryName || "url"}${patternText}）`
    }

    return `${location.targetProtocol}://${formatProxyServiceUpstreamUrl({ address: location.targetHost || "", port: location.targetPort })}${formatProxyServiceTargetPath(location.targetPath || "/")}`
}

const Page: FC = () => {
    const [query, setQuery] = useQueryState({
        keys: ["sourceAddress", "targetHost"],
        parse: queryParsers,
        stringify: queryStringifiers,
    })

    const [editId, setEditId] = useState<string>()
    const [defaultServiceType, setDefaultServiceType] = useState<ProxyServiceType>(ProxyServiceTypeValue.反向代理)
    const [showEditor, setShowEditor] = useState(false)
    const [lastApplyError, setLastApplyError] = useState<string>()

    const form = useForm({
        defaultValues: {
            serviceType: query.serviceType ?? "all",
            sourceAddress: query.sourceAddress ?? "",
            targetHost: query.targetHost ?? "",
            enabled: formatBooleanFilterValue(query.enabled),
            httpsEnabled: formatBooleanFilterValue(query.httpsEnabled),
            createdAfter: query.createdAfter,
            createdBefore: query.createdBefore,
            updatedAfter: query.updatedAfter,
            updatedBefore: query.updatedBefore,
        } satisfies ProxyServiceFilterValues,
        validators: {
            onSubmit: proxyServiceFilterSchema,
        },
        onSubmit({ value }) {
            setQuery(previous => ({
                ...previous,
                serviceType: value.serviceType === "all" ? undefined : value.serviceType,
                sourceAddress: value.sourceAddress.trim() || undefined,
                targetHost: value.targetHost.trim() || undefined,
                enabled: parseBooleanFilterValue(value.enabled),
                httpsEnabled: parseBooleanFilterValue(value.httpsEnabled),
                createdAfter: value.createdAfter,
                createdBefore: value.createdBefore,
                updatedAfter: value.updatedAfter,
                updatedBefore: value.updatedBefore,
                pageNum: 1,
            }))
        },
    })

    const { data, isLoading } = useQueryProxyService({
        serviceType: query.serviceType,
        sourceAddress: query.sourceAddress,
        targetHost: query.targetHost,
        enabled: query.enabled,
        httpsEnabled: query.httpsEnabled,
        createdAfter: query.createdAfter,
        createdBefore: query.createdBefore,
        updatedAfter: query.updatedAfter,
        updatedBefore: query.updatedBefore,
        pageNum: query.pageNum,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
    })

    const proxyServices: ProxyServiceRow[] | undefined = data?.list.map(service => ({
        ...service,
        certificate: service.certificate ?? undefined,
    }))

    const { mutateAsync: updateProxyService, isPending: isUpdateProxyServicePending } = useUpdateProxyService()
    const { mutateAsync: deleteProxyService, isPending: isDeleteProxyServicePending } = useDeleteProxyService()
    const isRequesting = isLoading || isUpdateProxyServicePending || isDeleteProxyServicePending
    const sorting: SortingState = query.sortBy ? [{ id: query.sortBy, desc: query.sortOrder === "desc" }] : []

    useEffect(
        () =>
            void form.reset({
                serviceType: query.serviceType ?? "all",
                sourceAddress: query.sourceAddress ?? "",
                targetHost: query.targetHost ?? "",
                enabled: formatBooleanFilterValue(query.enabled),
                httpsEnabled: formatBooleanFilterValue(query.httpsEnabled),
                createdAfter: query.createdAfter,
                createdBefore: query.createdBefore,
                updatedAfter: query.updatedAfter,
                updatedBefore: query.updatedBefore,
            }),
        [
            form,
            query.createdAfter,
            query.createdBefore,
            query.enabled,
            query.httpsEnabled,
            query.serviceType,
            query.sourceAddress,
            query.targetHost,
            query.updatedAfter,
            query.updatedBefore,
        ],
    )

    const columns: ColumnDef<ProxyServiceRow>[] = [
        {
            id: "index",
            header: "序号",
            size: 72,
            cell: ({ row }) => (query.pageNum - 1) * query.pageSize + row.index + 1,
        },
        {
            accessorKey: "serviceType",
            header: "类型",
            enableSorting: true,
            size: 110,
            cell: ({ row }) => (row.original.serviceType === ProxyServiceTypeValue.端口转发 ? "端口转发" : "反向代理"),
        },
        {
            accessorKey: "sourceAddress",
            header: "入口",
            enableSorting: true,
            size: 220,
            cell: ({ row }) => {
                const service = row.original
                if (service.serviceType === ProxyServiceTypeValue.端口转发) return `端口 ${service.httpPort}`

                return (
                    <div className="flex flex-col items-center">
                        <span>{service.sourceAddress}</span>
                        <span className="text-xs text-muted-foreground">
                            {service.httpPort > 0 ? `HTTP ${service.httpPort}` : "HTTP 未监听"}
                            {service.httpsEnabled ? ` / HTTPS ${service.httpsPort}` : ""}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "targetHost",
            header: "目标服务",
            enableSorting: true,
            size: 360,
            cell: ({ row }) => {
                const service = row.original
                if (service.serviceType === ProxyServiceTypeValue.端口转发)
                    return formatProxyServiceUpstreamUrl({ address: service.targetHost || "", port: service.targetPort ?? undefined })

                const locations = getProxyServiceLocations(service.locations)
                const location = locations[0]
                if (!location) return "未配置路径规则"

                return (
                    <div className="flex flex-col items-center">
                        <span>
                            {location.locationPath} =&gt; {formatProxyServiceLocationTarget(location)}
                        </span>
                        {locations.length > 1 && <span className="text-xs text-muted-foreground">共 {locations.length} 条路径规则</span>}
                    </div>
                )
            },
        },
        {
            id: "features",
            header: "功能",
            size: 220,
            cell: ({ row }) => {
                const service = row.original

                if (service.serviceType === ProxyServiceTypeValue.端口转发) {
                    return (
                        <div className="flex gap-1">
                            <Badge variant={service.tcpForwardEnabled ? "secondary" : "outline"}>TCP</Badge>
                            <Badge variant={service.udpForwardEnabled ? "secondary" : "outline"}>UDP</Badge>
                        </div>
                    )
                }

                return (
                    <div className="flex flex-wrap gap-1">
                        <Badge variant={service.websocketEnabled ? "secondary" : "outline"}>WebSocket {service.websocketEnabled ? "开启" : "关闭"}</Badge>
                        <Badge variant={service.corsEnabled ? "secondary" : "outline"}>{service.corsEnabled ? "关闭跨域" : "默认跨域"}</Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "httpsEnabled",
            header: "HTTPS",
            enableSorting: true,
            size: 130,
            cell: ({ row }) => {
                const service = row.original
                if (service.serviceType === ProxyServiceTypeValue.端口转发)
                    return <Badge variant={service.httpsEnabled ? "secondary" : "outline"}>{service.httpsEnabled ? "SSL" : "无"}</Badge>

                return (
                    <div className="flex flex-col items-center gap-1">
                        <Badge variant={service.httpsEnabled ? "secondary" : "outline"}>{service.httpsEnabled ? "开启" : "关闭"}</Badge>
                        {service.httpsEnabled && service.http2HttpsEnabled && <span className="text-xs text-muted-foreground">HTTP 跳转</span>}
                    </div>
                )
            },
        },
        {
            accessorKey: "enabled",
            header: "状态",
            enableSorting: true,
            size: 100,
            cell: ({ row }) => {
                const service = row.original
                const variant = service.enabled && service.lastApplyError ? "destructive" : service.enabled ? "secondary" : "outline"
                return <Badge variant={variant}>{service.enabled ? (service.lastApplyError ? "异常" : "启用") : "停用"}</Badge>
            },
        },
        {
            accessorKey: "certificateId",
            header: "证书",
            size: 220,
            cell: ({ row }) => {
                const service = row.original
                if (!service.httpsEnabled) return "未开启"
                if (!service.certificate) return "未选择"

                return (
                    <div className="flex flex-col items-center">
                        <span>{service.certificate.name}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(service.certificate.expiresAt)}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "lastAppliedAt",
            header: "最近生效",
            size: 170,
            cell: ({ row }) => {
                const service = row.original

                if (service.lastApplyError) {
                    return (
                        <Button size="xs" variant="destructive" onClick={() => setLastApplyError(service.lastApplyError ?? undefined)}>
                            查看错误
                        </Button>
                    )
                }

                return service.lastAppliedAt ? formatDateTime(service.lastAppliedAt) : "未生效"
            },
        },
        {
            accessorKey: "updatedAt",
            header: "更新时间",
            enableSorting: true,
            size: 180,
            cell: ({ row }) => formatDateTime(row.original.updatedAt),
        },
        {
            id: "actions",
            header: "操作",
            size: 230,
            cell: ({ row }) => {
                const service = row.original
                return (
                    <div className="flex items-center gap-1">
                        <Button size="xs" variant="ghost" disabled={isRequesting} onClick={() => onUpdate(service.id)}>
                            编辑
                        </Button>
                        <Button size="xs" variant="ghost" disabled={isRequesting} onClick={() => void onToggleEnabled(service)}>
                            {service.enabled ? "停用" : "启用"}
                        </Button>
                        {service.httpsEnabled &&
                            (isRequesting ? (
                                <Button size="xs" variant="ghost" disabled>
                                    证书
                                </Button>
                            ) : (
                                <Button size="xs" variant="ghost" asChild>
                                    <Link href="/certificate">证书</Link>
                                </Button>
                            ))}
                        <ConfirmButton
                            title="确认删除代理服务"
                            description="删除后会移除对应的 Nginx 配置。"
                            size="xs"
                            variant="destructive"
                            disabled={isRequesting}
                            pending={isDeleteProxyServicePending}
                            onConfirm={() => deleteProxyService(service.id)}
                        >
                            删除
                        </ConfirmButton>
                    </div>
                )
            },
        },
    ]

    function onAdd(serviceType: ProxyServiceType) {
        setDefaultServiceType(serviceType)
        setEditId(undefined)
        setShowEditor(true)
    }

    function onUpdate(id: string) {
        setEditId(id)
        setShowEditor(true)
    }

    async function onToggleEnabled(service: ProxyService) {
        await updateProxyService({
            id: service.id,
            enabled: !service.enabled,
        })
    }

    function onCloseEditor() {
        setEditId(undefined)
        setShowEditor(false)
    }

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSorting = typeof updater === "function" ? updater(sorting) : updater
        const next = nextSorting[0]

        setQuery(previous => ({
            ...previous,
            sortBy: next?.id as ProxyServiceSortByParams | undefined,
            sortOrder: next ? (next.desc ? "desc" : "asc") : undefined,
            pageNum: 1,
        }))
    }

    function onReset() {
        form.reset({
            serviceType: "all",
            sourceAddress: "",
            targetHost: "",
            enabled: "all",
            httpsEnabled: "all",
            createdAfter: undefined,
            createdBefore: undefined,
            updatedAfter: undefined,
            updatedBefore: undefined,
        })

        setQuery(previous => ({
            ...previous,
            serviceType: undefined,
            sourceAddress: undefined,
            targetHost: undefined,
            enabled: undefined,
            httpsEnabled: undefined,
            createdAfter: undefined,
            createdBefore: undefined,
            updatedAfter: undefined,
            updatedBefore: undefined,
            pageNum: 1,
        }))
    }

    return (
        <div className="space-y-6">
            <title>代理服务</title>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">代理服务</h1>
                    <p className="mt-1 text-sm text-muted-foreground">管理 Nginx 反向代理、端口转发和证书关联。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button disabled={isRequesting} onClick={() => onAdd(ProxyServiceTypeValue.反向代理)}>
                        <PlusIcon />
                        新增反向代理
                    </Button>
                    <Button variant="secondary" disabled={isRequesting} onClick={() => onAdd(ProxyServiceTypeValue.端口转发)}>
                        <PlusIcon />
                        新增端口转发
                    </Button>
                </div>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            void form.handleSubmit()
                        }}
                    >
                        <form.Field name="serviceType">
                            {field => (
                                <Field className="w-full sm:w-36">
                                    <FieldLabel>类型</FieldLabel>
                                    <Select value={field.state.value} onValueChange={value => field.handleChange(value as ProxyServiceTypeFilterValue)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">全部</SelectItem>
                                            <SelectItem value={ProxyServiceTypeValue.反向代理}>反向代理</SelectItem>
                                            <SelectItem value={ProxyServiceTypeValue.端口转发}>端口转发</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="sourceAddress">
                            {field => (
                                <Field className="w-full sm:w-48">
                                    <FieldLabel htmlFor="proxy-service-filter-source">访问地址</FieldLabel>
                                    <Input
                                        id="proxy-service-filter-source"
                                        value={field.state.value}
                                        onChange={event => field.handleChange(event.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="targetHost">
                            {field => (
                                <Field className="w-full sm:w-48">
                                    <FieldLabel htmlFor="proxy-service-filter-target">目标地址</FieldLabel>
                                    <Input
                                        id="proxy-service-filter-target"
                                        value={field.state.value}
                                        onChange={event => field.handleChange(event.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="enabled">
                            {field => (
                                <Field className="w-full sm:w-28">
                                    <FieldLabel>状态</FieldLabel>
                                    <Select value={field.state.value} onValueChange={value => field.handleChange(value as BooleanFilterValue)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">全部</SelectItem>
                                            <SelectItem value="true">启用</SelectItem>
                                            <SelectItem value="false">停用</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="httpsEnabled">
                            {field => (
                                <Field className="w-full sm:w-28">
                                    <FieldLabel>HTTPS</FieldLabel>
                                    <Select value={field.state.value} onValueChange={value => field.handleChange(value as BooleanFilterValue)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">全部</SelectItem>
                                            <SelectItem value="true">开启</SelectItem>
                                            <SelectItem value="false">关闭</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="createdAfter">
                            {field => (
                                <Field className="w-full sm:w-auto">
                                    <FieldLabel>创建开始日期</FieldLabel>
                                    <DatePicker value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="createdBefore">
                            {field => (
                                <Field className="w-full sm:w-auto">
                                    <FieldLabel>创建结束日期</FieldLabel>
                                    <DatePicker value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="updatedAfter">
                            {field => (
                                <Field className="w-full sm:w-auto">
                                    <FieldLabel>更新开始日期</FieldLabel>
                                    <DatePicker value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="updatedBefore">
                            {field => (
                                <Field className="w-full sm:w-auto">
                                    <FieldLabel>更新结束日期</FieldLabel>
                                    <DatePicker value={field.state.value} onValueChange={field.handleChange} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                            {([canSubmit, isSubmitting, isPristine]) => (
                                <Button type="submit" disabled={!canSubmit || isRequesting || isSubmitting || isPristine}>
                                    查询
                                </Button>
                            )}
                        </form.Subscribe>
                        <Button type="button" variant="ghost" disabled={isRequesting} onClick={onReset}>
                            重置
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <DataTable
                columns={columns}
                columnPinning={{ left: ["index", "serviceType", "sourceAddress"], right: ["actions"] }}
                columnSizingKey="proxy-service"
                data={proxyServices}
                loading={isLoading}
                pageNum={query.pageNum}
                pageSize={query.pageSize}
                sorting={sorting}
                total={data?.total}
                getRowId={service => service.id}
                onPageChange={(pageNum, pageSize) => setQuery(previous => ({ ...previous, pageNum, pageSize }))}
                onSortingChange={onSortingChange}
            />
            <ProxyServiceEditor id={editId} defaultServiceType={defaultServiceType} open={showEditor} onClose={onCloseEditor} />
            <InfoDialog title="生效错误" open={!!lastApplyError} wide onClose={() => setLastApplyError(undefined)}>
                {lastApplyError}
            </InfoDialog>
        </div>
    )
}

export default Page
