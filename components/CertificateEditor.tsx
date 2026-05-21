"use client"

import { ComponentProps, FC, useEffect } from "react"

import { Button, Form, Input, InputNumber, Modal } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { schemaToRule } from "soda-antd"

import { useAddCertificate } from "@/hooks/useAddCertificate"

import { AddCertificateParams } from "@/schemas/addCertificate"
import { certificateNameSchema } from "@/schemas/certificateName"
import { proxyServiceAddressSchema } from "@/schemas/proxyServiceAddress"
import { defaultProxyServiceCertificateDays, proxyServiceCertificateDaysSchema } from "@/schemas/proxyServiceCertificateDays"

export interface CertificateEditorProps extends Omit<ComponentProps<typeof Modal>, "title" | "children" | "onOk" | "onClose"> {
    onClose?: () => void
}

export function getDefaultCertificateFormValues(): Partial<AddCertificateParams> {
    return {
        days: defaultProxyServiceCertificateDays,
    }
}

const CertificateEditor: FC<CertificateEditorProps> = ({
    open,
    mask = { enabled: true, closable: true, blur: true },
    onClose,
    okButtonProps: { loading: okButtonLoading, ...okButtonProps } = {},
    cancelButtonProps: { disabled: cancelButtonDisabled, ...cancelButtonProps } = {},
    ...rest
}) => {
    const { enabled, closable, blur } = typeof mask === "boolean" ? { enabled: mask, closable: true, blur: true } : mask
    const [form] = useForm<AddCertificateParams>()

    const { mutateAsync: addCertificate, isPending } = useAddCertificate({
        onSuccess() {
            onClose?.()
        },
    })

    useEffect(() => {
        if (!open) return

        form.setFieldsValue(getDefaultCertificateFormValues())
    }, [open, form])

    useEffect(() => {
        if (open) return

        form.resetFields()
    }, [open, form])

    function onFinish(values: AddCertificateParams) {
        addCertificate(values)
    }

    return (
        <Modal
            title="生成自签证书"
            open={open}
            mask={{ enabled, closable: closable && !isPending, blur }}
            onOk={() => form.submit()}
            okButtonProps={{ loading: isPending || okButtonLoading, ...okButtonProps }}
            cancelButtonProps={{ disabled: isPending || cancelButtonDisabled, ...cancelButtonProps }}
            onCancel={() => onClose?.()}
            {...rest}
        >
            <Form<AddCertificateParams>
                name="certificate-editor"
                form={form}
                disabled={isPending}
                labelCol={{ flex: "104px" }}
                initialValues={getDefaultCertificateFormValues()}
                onFinish={onFinish}
            >
                <FormItem<AddCertificateParams> name="name" label="证书名称" rules={[schemaToRule(certificateNameSchema.optional())]}>
                    <Input autoComplete="off" allowClear placeholder="默认使用访问地址" />
                </FormItem>
                <FormItem<AddCertificateParams> name="address" label="访问地址" rules={[schemaToRule(proxyServiceAddressSchema)]}>
                    <Input autoComplete="off" allowClear placeholder="example.com / 192.168.1.10 / fd00::1" />
                </FormItem>
                <FormItem<AddCertificateParams> label="证书有效期">
                    <div className="flex items-center gap-2">
                        <FormItem<AddCertificateParams> name="days" noStyle rules={[schemaToRule(proxyServiceCertificateDaysSchema)]}>
                            <InputNumber className="w-full" min={1} max={36500} />
                        </FormItem>
                        <span className="flex-none text-slate-500">天</span>
                    </div>
                </FormItem>
                <FormItem<AddCertificateParams> name="remark" label="备注">
                    <Input.TextArea autoComplete="off" allowClear autoSize={{ minRows: 2, maxRows: 6 }} />
                </FormItem>
                <FormItem<AddCertificateParams> noStyle>
                    <Button className="!hidden" htmlType="submit">
                        提交
                    </Button>
                </FormItem>
            </Form>
        </Modal>
    )
}

export default CertificateEditor
