"use client"

import { type FC, useRef, useState } from "react"

import { type TableProps, Button, DatePicker, Form, Input, Popconfirm, Table } from "antd"
import FormItem from "antd/es/form/FormItem"
import { formatTime, showTotal } from "deepsea-tools"
import { type Columns, useScroll } from "soda-antd"
import type { StateToQueryFnMap } from "soda-hooks"
import { useQueryState } from "soda-next"

import { CertificateEditor } from "@/components/CertificateEditor"

import { useDeleteCertificate } from "@/hooks/useDeleteCertificate"
import { useDownloadCertificate } from "@/hooks/useDownloadCertificate"
import { useQueryCertificate } from "@/hooks/useQueryCertificate"
import { useRegenerateCertificate } from "@/hooks/useRegenerateCertificate"

import type { Certificate } from "@/prisma/generated/client"

import { getParser } from "@/schemas"
import { type CertificateSortByParams, certificateSortBySchema } from "@/schemas/certificateSortBy"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { type SortOrderParams, sortOrderSchema } from "@/schemas/sortOrder"

import { getSortOrder } from "@/utils/getSortOrder"
import { parseQueryDate, stringifyQueryEndDate, stringifyQueryStartDate } from "@/utils/queryDate"

const queryParsers = {
    createdBefore: parseQueryDate,
    createdAfter: parseQueryDate,
    updatedBefore: parseQueryDate,
    updatedAfter: parseQueryDate,
    pageNum: pageNumParser,
    pageSize: pageSizeParser,
    sortBy: getParser(certificateSortBySchema.optional().catch(undefined)),
    sortOrder: getParser(sortOrderSchema.optional().catch(undefined)),
}

const queryStringifiers: StateToQueryFnMap<typeof queryParsers> = {
    createdBefore: stringifyQueryEndDate,
    createdAfter: stringifyQueryStartDate,
    updatedBefore: stringifyQueryEndDate,
    updatedAfter: stringifyQueryStartDate,
}

const Page: FC = () => {
    const [query, setQuery] = useQueryState({
        keys: ["name", "address"],
        parse: queryParsers,
        stringify: queryStringifiers,
    })

    type FormParams = typeof query

    const [showEditor, setShowEditor] = useState(false)
    const container = useRef<HTMLDivElement>(null)
    const { y } = useScroll(container, { paginationMargin: 32 })
    const { createdAfter, createdBefore, updatedAfter, updatedBefore, pageNum, pageSize, ...rest } = query

    const { data, isLoading } = useQueryCertificate({
        createdAfter: createdAfter?.toDate(),
        createdBefore: createdBefore?.toDate(),
        updatedAfter: updatedAfter?.toDate(),
        updatedBefore: updatedBefore?.toDate(),
        pageNum,
        pageSize,
        ...rest,
    })

    const { mutateAsync: deleteCertificateAsync, isPending: isDeleteCertificatePending } = useDeleteCertificate()
    const { mutateAsync: downloadCertificateAsync, isPending: isDownloadCertificatePending } = useDownloadCertificate()
    const { mutateAsync: regenerateCertificateAsync, isPending: isRegenerateCertificatePending } = useRegenerateCertificate()
    const isRequesting = isLoading || isDeleteCertificatePending || isDownloadCertificatePending || isRegenerateCertificatePending

    const columns: Columns<Certificate> = [
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
            title: "证书名称",
            dataIndex: "name",
            align: "center",
            fixed: "left",
            sorter: true,
            sortOrder: getSortOrder(query, "name"),
        },
        {
            title: "访问地址",
            dataIndex: "address",
            align: "center",
            fixed: "left",
            sorter: true,
            sortOrder: getSortOrder(query, "address"),
        },
        {
            title: "有效期",
            dataIndex: "days",
            align: "center",
            render(value) {
                return `${value} 天`
            },
        },
        {
            title: "到期时间",
            dataIndex: "expiresAt",
            align: "center",
            sorter: true,
            sortOrder: getSortOrder(query, "expiresAt"),
            render(value) {
                return formatTime(value)
            },
        },
        {
            title: "备注",
            dataIndex: "remark",
            align: "center",
            render(value) {
                return value || "-"
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
            render(value) {
                return (
                    <div className="inline-flex gap-1">
                        <Button size="small" color="primary" variant="text" disabled={isRequesting} onClick={() => onDownload(value)}>
                            下载
                        </Button>
                        <Popconfirm title="确认重新生成自签证书" onConfirm={() => regenerateCertificateAsync(value)}>
                            <Button size="small" color="purple" variant="text" disabled={isRequesting}>
                                重签
                            </Button>
                        </Popconfirm>
                        <Popconfirm title="确认删除自签证书" description="正在被代理服务使用的证书不能删除" onConfirm={() => deleteCertificateAsync(value)}>
                            <Button size="small" color="danger" variant="text" disabled={isRequesting}>
                                删除
                            </Button>
                        </Popconfirm>
                    </div>
                )
            },
        },
    ]

    async function onDownload(id: string) {
        const certificate = await downloadCertificateAsync(id)
        const blob = new Blob([certificate.content], { type: "application/x-pem-file" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")

        link.href = url
        link.download = certificate.filename
        document.body.append(link)
        link.click()
        link.remove()

        window.setTimeout(() => URL.revokeObjectURL(url), 0)
    }

    const onChange: TableProps<Certificate>["onChange"] = function onChange(pagination, filters, sorter) {
        if (Array.isArray(sorter)) return

        setQuery(prev => ({
            ...prev,
            sortBy: sorter.field as CertificateSortByParams,
            sortOrder: (sorter.order ? sorter.order.slice(0, -3) : undefined) as SortOrderParams,
        }))
    }

    return (
        <div className="flex h-full flex-col gap-4 pt-4">
            <title>自签证书</title>
            <div className="flex-none px-4">
                <Form<FormParams> name="query-certificate-form" className="gap-y-4" layout="inline" onFinish={setQuery}>
                    <FormItem<FormParams> name="name" label="证书名称">
                        <Input allowClear />
                    </FormItem>
                    <FormItem<FormParams> name="address" label="访问地址">
                        <Input allowClear />
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
                    <Button className="ml-auto" color="primary" disabled={isRequesting} onClick={() => setShowEditor(true)}>
                        生成自签证书
                    </Button>
                </Form>
            </div>
            <div ref={container} className="px-4 fill-y">
                <CertificateEditor open={showEditor} onClose={() => setShowEditor(false)} />
                <Table<Certificate>
                    columns={columns}
                    dataSource={data?.list}
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
