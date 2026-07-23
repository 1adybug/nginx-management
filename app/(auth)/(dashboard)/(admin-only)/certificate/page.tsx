"use client"

import { type FC, useEffect, useState } from "react"

import { useForm } from "@tanstack/react-form"
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table"
import { DownloadIcon, PlusIcon } from "lucide-react"
import type { StateToQueryFnMap } from "soda-hooks"
import { useQueryState } from "soda-next"
import { z } from "zod/v4"

import { CertificateEditor } from "@/components/CertificateEditor"
import { ConfirmButton } from "@/components/ConfirmButton"
import { DataTable } from "@/components/DataTable"
import { DatePicker } from "@/components/DatePicker"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useDeleteCertificate } from "@/hooks/useDeleteCertificate"
import { useDownloadCertificate } from "@/hooks/useDownloadCertificate"
import { useQueryCertificate } from "@/hooks/useQueryCertificate"
import { useRegenerateCertificate } from "@/hooks/useRegenerateCertificate"

import type { Certificate } from "@/prisma/generated/client"

import { getParser } from "@/schemas"
import { type CertificateSortByParams, certificateSortBySchema } from "@/schemas/certificateSortBy"
import { pageNumParser } from "@/schemas/pageNum"
import { pageSizeParser } from "@/schemas/pageSize"
import { sortOrderSchema } from "@/schemas/sortOrder"

import { formatDateTime } from "@/utils/formatDateTime"
import { parseQueryDate, stringifyQueryEndDate, stringifyQueryStartDate } from "@/utils/queryDate"

interface CertificateFilterValues {
    name: string
    address: string
    createdAfter?: Date
    createdBefore?: Date
    updatedAfter?: Date
    updatedBefore?: Date
}

const certificateFilterSchema = z.object({
    name: z.string(),
    address: z.string(),
    createdAfter: z.union([z.custom<Date>(), z.undefined()]),
    createdBefore: z.union([z.custom<Date>(), z.undefined()]),
    updatedAfter: z.union([z.custom<Date>(), z.undefined()]),
    updatedBefore: z.union([z.custom<Date>(), z.undefined()]),
})

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

    const [showEditor, setShowEditor] = useState(false)

    const form = useForm({
        defaultValues: {
            name: query.name ?? "",
            address: query.address ?? "",
            createdAfter: query.createdAfter,
            createdBefore: query.createdBefore,
            updatedAfter: query.updatedAfter,
            updatedBefore: query.updatedBefore,
        } satisfies CertificateFilterValues,
        validators: {
            onSubmit: certificateFilterSchema,
        },
        onSubmit({ value }) {
            setQuery(previous => ({
                ...previous,
                name: value.name.trim() || undefined,
                address: value.address.trim() || undefined,
                createdAfter: value.createdAfter,
                createdBefore: value.createdBefore,
                updatedAfter: value.updatedAfter,
                updatedBefore: value.updatedBefore,
                pageNum: 1,
            }))
        },
    })

    const { data, isLoading } = useQueryCertificate({
        name: query.name,
        address: query.address,
        createdAfter: query.createdAfter,
        createdBefore: query.createdBefore,
        updatedAfter: query.updatedAfter,
        updatedBefore: query.updatedBefore,
        pageNum: query.pageNum,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
    })

    const { mutateAsync: deleteCertificate, isPending: isDeleteCertificatePending } = useDeleteCertificate()
    const { mutateAsync: downloadCertificate, isPending: isDownloadCertificatePending } = useDownloadCertificate()
    const { mutateAsync: regenerateCertificate, isPending: isRegenerateCertificatePending } = useRegenerateCertificate()
    const isRequesting = isLoading || isDeleteCertificatePending || isDownloadCertificatePending || isRegenerateCertificatePending
    const sorting: SortingState = query.sortBy ? [{ id: query.sortBy, desc: query.sortOrder === "desc" }] : []

    useEffect(
        () =>
            void form.reset({
                name: query.name ?? "",
                address: query.address ?? "",
                createdAfter: query.createdAfter,
                createdBefore: query.createdBefore,
                updatedAfter: query.updatedAfter,
                updatedBefore: query.updatedBefore,
            }),
        [form, query.address, query.createdAfter, query.createdBefore, query.name, query.updatedAfter, query.updatedBefore],
    )

    const columns: ColumnDef<Certificate>[] = [
        {
            id: "index",
            header: "序号",
            size: 72,
            cell: ({ row }) => (query.pageNum - 1) * query.pageSize + row.index + 1,
        },
        { accessorKey: "name", header: "证书名称", enableSorting: true, size: 180 },
        { accessorKey: "address", header: "访问地址", enableSorting: true, size: 220 },
        {
            accessorKey: "days",
            header: "有效期",
            size: 100,
            cell: ({ row }) => `${row.original.days} 天`,
        },
        {
            accessorKey: "expiresAt",
            header: "到期时间",
            enableSorting: true,
            size: 180,
            cell: ({ row }) => formatDateTime(row.original.expiresAt),
        },
        {
            accessorKey: "remark",
            header: "备注",
            size: 220,
            cell: ({ row }) => row.original.remark || "-",
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
            size: 180,
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    <Button size="xs" variant="ghost" disabled={isRequesting} onClick={() => void onDownload(row.original.id)}>
                        <DownloadIcon />
                        下载
                    </Button>
                    <ConfirmButton
                        title="确认重新生成自签证书"
                        size="xs"
                        variant="ghost"
                        disabled={isRequesting}
                        pending={isRegenerateCertificatePending}
                        onConfirm={() => regenerateCertificate(row.original.id)}
                    >
                        重签
                    </ConfirmButton>
                    <ConfirmButton
                        title="确认删除自签证书"
                        description="正在被代理服务使用的证书不能删除。"
                        size="xs"
                        variant="destructive"
                        disabled={isRequesting}
                        pending={isDeleteCertificatePending}
                        onConfirm={() => deleteCertificate(row.original.id)}
                    >
                        删除
                    </ConfirmButton>
                </div>
            ),
        },
    ]

    function onSortingChange(updater: Updater<SortingState>) {
        const nextSorting = typeof updater === "function" ? updater(sorting) : updater
        const next = nextSorting[0]

        setQuery(previous => ({
            ...previous,
            sortBy: next?.id as CertificateSortByParams | undefined,
            sortOrder: next ? (next.desc ? "desc" : "asc") : undefined,
            pageNum: 1,
        }))
    }

    function onReset() {
        form.reset({
            name: "",
            address: "",
            createdAfter: undefined,
            createdBefore: undefined,
            updatedAfter: undefined,
            updatedBefore: undefined,
        })

        setQuery(previous => ({
            ...previous,
            name: undefined,
            address: undefined,
            createdAfter: undefined,
            createdBefore: undefined,
            updatedAfter: undefined,
            updatedBefore: undefined,
            pageNum: 1,
        }))
    }

    async function onDownload(id: string) {
        const certificate = await downloadCertificate(id)
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

    return (
        <div className="space-y-6">
            <title>自签证书</title>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">自签证书</h1>
                    <p className="mt-1 text-sm text-muted-foreground">生成、下载和维护代理服务使用的自签证书。</p>
                </div>
                <Button disabled={isRequesting} onClick={() => setShowEditor(true)}>
                    <PlusIcon />
                    生成自签证书
                </Button>
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
                        <form.Field name="name">
                            {field => (
                                <Field className="w-full sm:w-48">
                                    <FieldLabel htmlFor="certificate-filter-name">证书名称</FieldLabel>
                                    <Input id="certificate-filter-name" value={field.state.value} onChange={event => field.handleChange(event.target.value)} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="address">
                            {field => (
                                <Field className="w-full sm:w-56">
                                    <FieldLabel htmlFor="certificate-filter-address">访问地址</FieldLabel>
                                    <Input
                                        id="certificate-filter-address"
                                        value={field.state.value}
                                        onChange={event => field.handleChange(event.target.value)}
                                    />
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
                columnPinning={{ left: ["index", "name", "address"], right: ["actions"] }}
                columnSizingKey="certificate"
                data={data?.list}
                loading={isLoading}
                pageNum={query.pageNum}
                pageSize={query.pageSize}
                sorting={sorting}
                total={data?.total}
                getRowId={certificate => certificate.id}
                onPageChange={(pageNum, pageSize) => setQuery(previous => ({ ...previous, pageNum, pageSize }))}
                onSortingChange={onSortingChange}
            />
            <CertificateEditor open={showEditor} onClose={() => setShowEditor(false)} />
        </div>
    )
}

export default Page
