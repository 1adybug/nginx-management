import { ComponentProps, FC, useEffect } from "react"

import { Button, Form, Input, InputNumber, Modal, Select, Switch } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { isNonNullable } from "deepsea-tools"
import { schemaToRule } from "soda-antd"

import { useAddProxyService } from "@/hooks/useAddProxyService"
import { useGetProxyService } from "@/hooks/useGetProxyService"
import { useUpdateProxyService } from "@/hooks/useUpdateProxyService"

import { AddProxyServiceParams, defaultProxyServiceHttpPort, defaultProxyServiceHttpsPort } from "@/schemas/addProxyService"
import { proxyServiceAddressSchema } from "@/schemas/proxyServiceAddress"
import { defaultProxyServiceCertificateDays } from "@/schemas/proxyServiceCertificateDays"
import { proxyServicePortSchema } from "@/schemas/proxyServicePort"
import { ProxyServiceType } from "@/schemas/proxyServiceType"
import { ProxyTargetProtocol } from "@/schemas/proxyTargetProtocol"
import { UpdateProxyServiceParams } from "@/schemas/updateProxyService"

export interface ProxyServiceEditorProps extends Omit<ComponentProps<typeof Modal>, "title" | "children" | "onOk" | "onClose"> {
    id?: string
    defaultServiceType?: ProxyServiceType
    onClose?: () => void
}

export interface GetDefaultProxyServiceFormValuesParams {
    serviceType?: ProxyServiceType
}

export function getDefaultProxyServiceFormValues({ serviceType = ProxyServiceType.反向代理 }: GetDefaultProxyServiceFormValuesParams = {}) {
    const values: Partial<AddProxyServiceParams> = {
        serviceType,
        httpPort: defaultProxyServiceHttpPort,
        httpsPort: defaultProxyServiceHttpsPort,
        targetProtocol: ProxyTargetProtocol.HTTP,
        websocketEnabled: true,
        tcpForwardEnabled: true,
        udpForwardEnabled: false,
        enabled: true,
        httpsEnabled: false,
        http2HttpsEnabled: false,
        certificateDays: defaultProxyServiceCertificateDays,
    }

    return values
}

const ProxyServiceEditor: FC<ProxyServiceEditorProps> = ({
    id,
    defaultServiceType = ProxyServiceType.反向代理,
    open,
    mask = { enabled: true, closable: true, blur: true },
    onClose,
    okButtonProps: { loading: okButtonLoading, ...okButtonProps } = {},
    cancelButtonProps: { disabled: cancelButtonDisabled, ...cancelButtonProps } = {},
    ...rest
}) => {
    const { enabled, closable, blur } = typeof mask === "boolean" ? { enabled: mask, closable: true, blur: true } : mask
    const isUpdate = isNonNullable(id)
    const [form] = useForm<AddProxyServiceParams>()
    const serviceType = Form.useWatch("serviceType", form) ?? defaultServiceType
    const isPortForward = serviceType === ProxyServiceType.端口转发
    const { data, isLoading } = useGetProxyService(id, { enabled: !!open && isUpdate })

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

    useEffect(() => {
        if (!open) return
        if (isUpdate) return

        form.setFieldsValue(getDefaultProxyServiceFormValues({ serviceType: defaultServiceType }))
    }, [open, isUpdate, defaultServiceType, form])

    useEffect(() => {
        if (!open || !data) return
        form.setFieldsValue(data as AddProxyServiceParams)
    }, [open, data, form])

    useEffect(() => {
        if (open) return
        form.resetFields()
    }, [open, form])

    const isPending = isAddProxyServicePending || isUpdateProxyServicePending

    const isRequesting = isLoading || isPending

    function onFinish(values: AddProxyServiceParams) {
        if (isUpdate) updateProxyService({ id: id!, ...values } as UpdateProxyServiceParams)
        else addProxyService(values)
    }

    return (
        <Modal
            title={`${isUpdate ? "修改" : "新增"}${isPortForward ? "端口转发" : "反向代理"}`}
            open={open}
            mask={{ enabled, closable: closable && !isPending, blur }}
            onOk={() => form.submit()}
            okButtonProps={{ loading: isRequesting || okButtonLoading, ...okButtonProps }}
            cancelButtonProps={{ disabled: isPending || cancelButtonDisabled, ...cancelButtonProps }}
            onCancel={() => onClose?.()}
            {...rest}
        >
            <Form<AddProxyServiceParams>
                name="proxy-service-editor"
                form={form}
                disabled={isRequesting}
                labelCol={{ flex: "104px" }}
                initialValues={getDefaultProxyServiceFormValues({ serviceType: defaultServiceType })}
                onFinish={onFinish}
            >
                <FormItem<AddProxyServiceParams> name="serviceType" label="类型">
                    <Select
                        disabled={isUpdate}
                        options={[
                            { label: "反向代理", value: ProxyServiceType.反向代理 },
                            { label: "端口转发", value: ProxyServiceType.端口转发 },
                        ]}
                    />
                </FormItem>
                <FormItem<AddProxyServiceParams> name="enabled" label="启用服务" valuePropName="checked">
                    <Switch />
                </FormItem>
                {isPortForward ? <PortForwardDetailForm /> : <ReverseProxyDetailForm />}
                <SslForm isPortForward={isPortForward} />
                <FormItem<AddProxyServiceParams> name="remark" label="备注">
                    <Input.TextArea autoComplete="off" allowClear autoSize={{ minRows: 2, maxRows: 6 }} />
                </FormItem>
                <FormItem<AddProxyServiceParams> noStyle>
                    <Button className="!hidden" htmlType="submit">
                        提交
                    </Button>
                </FormItem>
            </Form>
        </Modal>
    )
}

export interface SslFormProps {
    isPortForward: boolean
}

export const ReverseProxyDetailForm: FC = () => (
    <div>
        <FormItem<AddProxyServiceParams> name="sourceAddress" label="访问地址" rules={[schemaToRule(proxyServiceAddressSchema)]}>
            <Input autoComplete="off" allowClear placeholder="example.com / 192.168.1.10 / fd00::1" />
        </FormItem>
        <div className="grid grid-cols-2 gap-2">
            <FormItem<AddProxyServiceParams> name="httpPort" label="HTTP 端口" rules={[schemaToRule(proxyServicePortSchema)]}>
                <InputNumber className="w-full" min={1} max={65535} />
            </FormItem>
            <FormItem<AddProxyServiceParams> name="httpsPort" label="HTTPS 端口" rules={[schemaToRule(proxyServicePortSchema)]}>
                <InputNumber className="w-full" min={1} max={65535} />
            </FormItem>
        </div>
        <div className="grid grid-cols-4 gap-2">
            <FormItem<AddProxyServiceParams> name="targetProtocol" label="目标协议">
                <Select
                    options={[
                        { label: "HTTP", value: ProxyTargetProtocol.HTTP },
                        { label: "HTTPS", value: ProxyTargetProtocol.HTTPS },
                    ]}
                />
            </FormItem>
            <FormItem<AddProxyServiceParams> name="targetHost" label="目标地址" className="col-span-2" rules={[schemaToRule(proxyServiceAddressSchema)]}>
                <Input autoComplete="off" allowClear />
            </FormItem>
            <FormItem<AddProxyServiceParams> name="targetPort" label="目标端口" rules={[schemaToRule(proxyServicePortSchema)]}>
                <InputNumber className="w-full" min={1} max={65535} />
            </FormItem>
        </div>
        <div className="grid grid-cols-3 gap-2">
            <FormItem<AddProxyServiceParams> name="websocketEnabled" label="WebSocket" valuePropName="checked">
                <Switch />
            </FormItem>
            <FormItem<AddProxyServiceParams> name="httpsEnabled" label="HTTPS" valuePropName="checked">
                <Switch />
            </FormItem>
            <FormItem<AddProxyServiceParams> name="http2HttpsEnabled" label="HTTP 跳转" valuePropName="checked">
                <Switch />
            </FormItem>
        </div>
    </div>
)

export const PortForwardDetailForm: FC = () => (
    <div>
        <FormItem<AddProxyServiceParams> name="httpPort" label="入站端口" rules={[schemaToRule(proxyServicePortSchema)]}>
            <InputNumber className="w-full" min={1} max={65535} placeholder="eg: 8080" />
        </FormItem>
        <div className="grid grid-cols-[1fr_194px] gap-2">
            <FormItem<AddProxyServiceParams> name="targetHost" label="转发主机" rules={[schemaToRule(proxyServiceAddressSchema)]}>
                <Input autoComplete="off" allowClear placeholder="example.com or 10.0.0.1 or 2001:db8::1" />
            </FormItem>
            <FormItem<AddProxyServiceParams> name="targetPort" label="转发端口" rules={[schemaToRule(proxyServicePortSchema)]}>
                <InputNumber className="w-full" min={1} max={65535} placeholder="eg: 8081" />
            </FormItem>
        </div>
        <div className="grid grid-cols-3 gap-2">
            <FormItem<AddProxyServiceParams> name="tcpForwardEnabled" label="TCP" valuePropName="checked">
                <Switch />
            </FormItem>
            <FormItem<AddProxyServiceParams> name="udpForwardEnabled" label="UDP" valuePropName="checked">
                <Switch />
            </FormItem>
            <FormItem<AddProxyServiceParams> name="httpsEnabled" label="SSL 证书" valuePropName="checked">
                <Switch />
            </FormItem>
        </div>
    </div>
)

export const SslForm: FC<SslFormProps> = ({ isPortForward }) => (
    <div>
        <FormItem<AddProxyServiceParams> label="证书有效期">
            <div className="flex items-center gap-2">
                <FormItem<AddProxyServiceParams> name="certificateDays" noStyle>
                    <InputNumber className="w-full" min={1} max={36500} />
                </FormItem>
                <span className="flex-none text-slate-500">天</span>
            </div>
        </FormItem>
    </div>
)

export default ProxyServiceEditor
