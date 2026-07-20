"use client"

import { type FC, useRef, useState } from "react"

import { type ModalProps, type TableProps, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Table, Tag } from "antd"
import FormItem from "antd/es/form/FormItem"
import { formatTime, isNonNullable, showTotal } from "deepsea-tools"
import { type Columns, useScroll } from "soda-antd"
import type { StateToQueryFnMap } from "soda-hooks"
import { useQueryState } from "soda-next"
import { z } from "zod/v4"

import { ProxyServiceEditor } from "@/components/ProxyServiceEditor"

import { useDeleteProxyService } from "@/hooks/useDeleteProxyService"
import { useQueryProxyService } from "@/hooks/useQueryProxyService"
import { useUpdateProxyService } from "@/hooks/useUpdateProxyService"

import type { Certificate, ProxyService } from "@/prisma/generated/client"

import { getParser } from "@/schemas"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { type ProxyServiceLocationParams, getProxyServiceLocations, isDynamicProxyServiceLocation } from "@/schemas/proxyServiceLocation"
import { type ProxyServiceSortByParams, proxyServiceSortBySchema } from "@/schemas/proxyServiceSortBy"
import { ProxyServiceType, proxyServiceTypeSchema } from "@/schemas/proxyServiceType"
import { type SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"

import { getSortOrder } from "@/utils/getSortOrder"
import { formatProxyServiceUpstreamUrl } from "@/utils/proxyServiceAddress"
import { formatProxyServiceTargetPath } from "@/utils/proxyServicePath"
import { parseQueryDate, stringifyQueryEndDate, stringifyQueryStartDate } from "@/utils/queryDate"

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

export interface ProxyServiceRow extends ProxyService {
    certificate?: Certificate
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

    type FormParams = typeof query

    const [editId, setEditId] = useState<string | undefined>(undefined)
    const [defaultServiceType, setDefaultServiceType] = useState<ProxyServiceType>(ProxyServiceType.反向代理)
    const [showEditor, setShowEditor] = useState(false)
    const [info, setInfo] = useState<Pick<ModalProps, "title" | "children">>()
    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })
    const { createdAfter, createdBefore, updatedAfter, updatedBefore, pageNum, pageSize, ...rest } = query

    const { data, isLoading } = useQueryProxyService({
        createdAfter: createdAfter?.toDate(),
        createdBefore: createdBefore?.toDate(),
        updatedAfter: updatedAfter?.toDate(),
        updatedBefore: updatedBefore?.toDate(),
        pageNum,
        pageSize,
        ...rest,
    })

    const proxyServices = data?.list.map(service => ({
        ...service,
        certificate: service.certificate ?? undefined,
    }))

    const { mutateAsync: updateProxyServiceAsync, isPending: isUpdateProxyServicePending } = useUpdateProxyService()
    const { mutateAsync: deleteProxyServiceAsync, isPending: isDeleteProxyServicePending } = useDeleteProxyService()

    const isRequesting = isLoading || isUpdateProxyServicePending || isDeleteProxyServicePending

    const columns: Columns<ProxyServiceRow> = [
        {
            title: "序号",
            key: "index",
            align: "center",
            fixed: "left",
            render(value, record, index) {
                return (pageNum - 1) * pageSize + index + 1
            },
        },
        {
            title: "类型",
            dataIndex: "serviceType",
            align: "center",
            fixed: "left",
            sorter: true,
            sortOrder: getSortOrder(query, "serviceType"),
            render(value) {
                return value === ProxyServiceType.端口转发 ? "端口转发" : "反向代理"
            },
        },
        {
            title: "入口",
            dataIndex: "sourceAddress",
            align: "center",
            fixed: "left",
            sorter: true,
            sortOrder: getSortOrder(query, "sourceAddress"),
            render(value, record) {
                if (record.serviceType === ProxyServiceType.端口转发) return `端口 ${record.httpPort}`

                return (
                    <div className="flex flex-col items-center">
                        <span>{value}</span>
                        <span className="text-xs text-slate-500">
                            {record.httpPort > 0 ? `HTTP ${record.httpPort}` : "HTTP 未监听"}
                            {record.httpsEnabled ? ` / HTTPS ${record.httpsPort}` : ""}
                        </span>
                    </div>
                )
            },
        },
        {
            title: "目标服务",
            dataIndex: "targetHost",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "targetHost"),
            render(value, record) {
                if (record.serviceType === ProxyServiceType.端口转发)
                    return formatProxyServiceUpstreamUrl({ address: value || "", port: record.targetPort ?? undefined })

                const locations = getProxyServiceLocations(record.locations)
                const location = locations[0]

                if (!location) return "未配置路径规则"

                return (
                    <div className="flex flex-col items-center">
                        <span>
                            {location.locationPath} =&gt; {formatProxyServiceLocationTarget(location)}
                        </span>
                        {locations.length > 1 && <span className="text-xs text-slate-500">共 {locations.length} 条路径规则</span>}
                    </div>
                )
            },
        },
        {
            title: "功能",
            dataIndex: "websocketEnabled",
            align: "center",
            render(value, record) {
                if (record.serviceType === ProxyServiceType.端口转发) {
                    return (
                        <div className="inline-flex gap-1">
                            <Tag color={record.tcpForwardEnabled ? "green" : "default"}>TCP</Tag>
                            <Tag color={record.udpForwardEnabled ? "blue" : "default"}>UDP</Tag>
                        </div>
                    )
                }

                return (
                    <div className="inline-flex flex-wrap justify-center gap-1">
                        <Tag color={value ? "green" : "default"}>WebSocket {value ? "开启" : "关闭"}</Tag>
                        <Tag color={record.corsEnabled ? "blue" : "default"}>{record.corsEnabled ? "关闭跨域" : "默认跨域"}</Tag>
                    </div>
                )
            },
        },
        {
            title: "HTTPS",
            dataIndex: "httpsEnabled",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "httpsEnabled"),
            render(value, record) {
                if (record.serviceType === ProxyServiceType.端口转发) return <Tag color={value ? "blue" : "default"}>{value ? "SSL" : "无"}</Tag>

                return (
                    <div className="flex flex-col items-center gap-1">
                        <Tag color={value ? "blue" : "default"}>{value ? "开启" : "关闭"}</Tag>
                        {value && record.http2HttpsEnabled && <span className="text-xs text-slate-500">HTTP 跳转</span>}
                    </div>
                )
            },
        },
        {
            title: "状态",
            dataIndex: "enabled",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "enabled"),
            render(value, record) {
                return (
                    <Tag color={value && !record.lastApplyError ? "green" : value ? "red" : "default"}>
                        {value ? (record.lastApplyError ? "异常" : "启用") : "停用"}
                    </Tag>
                )
            },
        },
        {
            title: "证书",
            dataIndex: "certificateId",
            align: "center",
            render(value, record) {
                if (!record.httpsEnabled) return "未开启"
                if (!record.certificate) return "未选择"

                return (
                    <div className="flex flex-col items-center">
                        <span>{record.certificate.name}</span>
                        <span className="text-xs text-slate-500">{formatTime(record.certificate.expiresAt)}</span>
                    </div>
                )
            },
        },
        {
            title: "最近生效",
            dataIndex: "lastAppliedAt",
            align: "center",
            render(value, record) {
                if (record.lastApplyError) {
                    return (
                        <Button
                            size="small"
                            color="danger"
                            variant="text"
                            onClick={() =>
                                setInfo({
                                    title: "生效错误",
                                    children: <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all">{record.lastApplyError}</pre>,
                                })
                            }
                        >
                            查看错误
                        </Button>
                    )
                }

                return value ? formatTime(value) : "未生效"
            },
        },
        {
            title: "更新时间",
            dataIndex: "updatedAt",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "updatedAt"),
            render(value) {
                return formatTime(value)
            },
        },
        {
            title: "操作",
            key: "operation",
            dataIndex: "id",
            align: "center",
            fixed: "right",
            render(value, record) {
                return (
                    <div className="inline-flex gap-1">
                        <Button size="small" color="primary" variant="text" disabled={isRequesting} onClick={() => onUpdate(value)}>
                            编辑
                        </Button>
                        <Button
                            size="small"
                            color={record.enabled ? "orange" : "green"}
                            variant="text"
                            disabled={isRequesting}
                            onClick={() => onToggleEnabled(record)}
                        >
                            {record.enabled ? "停用" : "启用"}
                        </Button>
                        {record.httpsEnabled && (
                            <Button size="small" color="primary" variant="text" disabled={isRequesting} href="/certificate">
                                证书
                            </Button>
                        )}
                        <Popconfirm title="确认删除代理服务" description="删除后会移除对应的 Nginx 配置" onConfirm={() => deleteProxyServiceAsync(value)}>
                            <Button size="small" color="danger" variant="text" disabled={isRequesting}>
                                删除
                            </Button>
                        </Popconfirm>
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

    function onToggleEnabled(record: ProxyService) {
        updateProxyServiceAsync({
            id: record.id,
            enabled: !record.enabled,
        })
    }

    function onClose() {
        setEditId(undefined)
        setShowEditor(false)
    }

    const onChange: TableProps<ProxyServiceRow>["onChange"] = function onChange(pagination, filters, sorter) {
        if (Array.isArray(sorter)) return

        setQuery(prev => ({
            ...prev,
            sortBy: sorter.field as ProxyServiceSortByParams,
            sortOrder: (sorter.order ? sorter.order.slice(0, -3) : undefined) as SortOrderParams,
        }))
    }

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>代理服务</title>
            <div className="flex-none px-4">
                <Form<FormParams> name="query-proxy-service-form" className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="serviceType" label="类型">
                        <Select
                            className="w-28"
                            allowClear
                            options={[
                                { label: "反向代理", value: ProxyServiceType.反向代理 },
                                { label: "端口转发", value: ProxyServiceType.端口转发 },
                            ]}
                        />
                    </FormItem>
                    <FormItem<FormParams> name="sourceAddress" label="访问地址">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="targetHost" label="目标地址">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="enabled" label="状态">
                        <Select
                            className="w-24"
                            allowClear
                            options={[
                                { label: "启用", value: true },
                                { label: "停用", value: false },
                            ]}
                        />
                    </FormItem>
                    <FormItem<FormParams> name="httpsEnabled" label="HTTPS">
                        <Select
                            className="w-24"
                            allowClear
                            options={[
                                { label: "开启", value: true },
                                { label: "关闭", value: false },
                            ]}
                        />
                    </FormItem>
                    <FormItem<FormParams> name="createdAfter" label="创建开始日期">
                        <DatePicker />
                    </FormItem>
                    <FormItem<FormParams> name="createdBefore" label="创建结束日期">
                        <DatePicker />
                    </FormItem>
                    <FormItem<FormParams> name="updatedAfter" label="更新开始日期">
                        <DatePicker />
                    </FormItem>
                    <FormItem<FormParams> name="updatedBefore" label="更新结束日期">
                        <DatePicker />
                    </FormItem>
                    <FormItem<FormParams>>
                        <Button htmlType="submit" type="primary" disabled={isRequesting}>
                            查询
                        </Button>
                    </FormItem>
                    <FormItem<FormParams>>
                        <Button htmlType="button" type="text" disabled={isRequesting} onClick={() => setQuery({} as FormParams)}>
                            重置
                        </Button>
                    </FormItem>
                    <div className="ml-auto flex gap-2">
                        <Button color="primary" disabled={isRequesting} onClick={() => onAdd(ProxyServiceType.反向代理)}>
                            新增反向代理
                        </Button>
                        <Button color="primary" variant="filled" disabled={isRequesting} onClick={() => onAdd(ProxyServiceType.端口转发)}>
                            新增端口转发
                        </Button>
                    </div>
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <ProxyServiceEditor id={editId} defaultServiceType={defaultServiceType} open={showEditor} width={840} onClose={onClose} />
                <Modal open={isNonNullable(info)} onCancel={() => setInfo(undefined)} width={800} footer={null} {...info} />
                <Table<ProxyServiceRow>
                    columns={columns}
                    dataSource={proxyServices}
                    loading={isLoading}
                    rowKey="id"
                    onChange={onChange}
                    scroll={{ x: "max-content", y }}
                    pagination={{
                        current: pageNum,
                        pageSize,
                        total: data?.total,
                        showTotal,
                        showSizeChanger: true,
                        onChange(page, size) {
                            setQuery(prev => ({ ...prev, pageNum: page, pageSize: size }))
                        },
                    }}
                />
            </div>
        </div>
    )
}

export default Page
