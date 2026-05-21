import { ComponentProps, FC, Fragment, useEffect } from "react"

import { IconPlus, IconTrash } from "@tabler/icons-react"
import { Button, Form, Input, InputNumber, Modal, Select, Switch } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { isNonNullable } from "deepsea-tools"
import { schemaToRule } from "soda-antd"

import { useAddProxyService } from "@/hooks/useAddProxyService"
import { useGetProxyService } from "@/hooks/useGetProxyService"
import { useQueryCertificate } from "@/hooks/useQueryCertificate"
import { useUpdateProxyService } from "@/hooks/useUpdateProxyService"

import { ProxyService } from "@/prisma/generated/client"

import { AddProxyServiceParams, defaultProxyServiceHttpPort, defaultProxyServiceHttpsPort } from "@/schemas/addProxyService"
import { certificateIdSchema } from "@/schemas/certificateId"
import { proxyServiceAddressSchema } from "@/schemas/proxyServiceAddress"
import {
    dynamicProxyServiceTargetAllowPatternSchema,
    dynamicProxyServiceTargetQueryNameSchema,
    getProxyServiceLocations,
    ProxyServiceLocationParams,
} from "@/schemas/proxyServiceLocation"
import { proxyServiceLocationPathSchema } from "@/schemas/proxyServiceLocationPath"
import { ProxyServiceLocationTargetMode } from "@/schemas/proxyServiceLocationTargetMode"
import { proxyServiceHttpPortSchema, proxyServicePortSchema } from "@/schemas/proxyServicePort"
import { proxyServiceTargetPathSchema } from "@/schemas/proxyServiceTargetPath"
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

export function getDefaultProxyServiceLocationFormValues(): ProxyServiceLocationParams {
    return {
        locationPath: "/",
        targetMode: ProxyServiceLocationTargetMode.静态,
        targetProtocol: ProxyTargetProtocol.HTTP,
        targetHost: "",
        targetPort: 80,
        targetPath: "/",
        dynamicTargetQueryName: "url",
    }
}

export function getDefaultProxyServiceFormValues({ serviceType = ProxyServiceType.反向代理 }: GetDefaultProxyServiceFormValuesParams = {}) {
    const values: Partial<AddProxyServiceParams> = {
        serviceType,
        httpPort: defaultProxyServiceHttpPort,
        httpsPort: defaultProxyServiceHttpsPort,
        targetProtocol: ProxyTargetProtocol.HTTP,
        websocketEnabled: true,
        corsEnabled: false,
        tcpForwardEnabled: true,
        udpForwardEnabled: false,
        enabled: true,
        httpsEnabled: false,
        http2HttpsEnabled: false,
    }

    if (serviceType === ProxyServiceType.反向代理) values.locations = [getDefaultProxyServiceLocationFormValues()]

    return values
}

export function getProxyServiceFormValues(data: ProxyService) {
    const values = {
        serviceType: data.serviceType,
        sourceAddress: data.sourceAddress,
        httpPort: data.httpPort,
        httpsPort: data.httpsPort,
        targetProtocol: data.targetProtocol,
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
    } as AddProxyServiceParams

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
        form.setFieldsValue(getProxyServiceFormValues(data))
    }, [open, data, form])

    useEffect(() => {
        if (open) return
        form.resetFields()
    }, [open, form])

    useEffect(() => {
        if (!open || isUpdate || isPortForward) return

        const locations = form.getFieldValue("locations")
        if (locations?.length > 0) return

        form.setFieldValue("locations", [getDefaultProxyServiceLocationFormValues()])
    }, [open, isUpdate, isPortForward, form])

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

export const ReverseProxyDetailForm: FC = () => {
    const httpsEnabled = Form.useWatch("httpsEnabled")

    return (
        <div>
            {!httpsEnabled && (
                <FormItem<AddProxyServiceParams> name="sourceAddress" label="访问地址" rules={[schemaToRule(proxyServiceAddressSchema)]}>
                    <Input autoComplete="off" allowClear placeholder="example.com / 192.168.1.10 / fd00::1" />
                </FormItem>
            )}
            <div className="grid grid-cols-2 gap-2">
                <FormItem<AddProxyServiceParams> name="httpPort" label="HTTP 端口" rules={[schemaToRule(proxyServiceHttpPortSchema)]}>
                    <InputNumber className="w-full" min={0} max={65535} />
                </FormItem>
                <FormItem<AddProxyServiceParams> name="httpsPort" label="HTTPS 端口" rules={[schemaToRule(proxyServicePortSchema)]}>
                    <InputNumber className="w-full" min={1} max={65535} />
                </FormItem>
            </div>
            <FormItem<AddProxyServiceParams> label="路径规则" required>
                <Form.List name="locations">
                    {(fields, { add, remove }) => (
                        <div className="flex flex-col gap-3">
                            {fields.map((field, index) => (
                                <div key={field.key} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-slate-700">{index === 0 ? "Location" : `Location ${index + 1}`}</span>
                                        <Button
                                            danger
                                            type="text"
                                            size="small"
                                            disabled={fields.length <= 1}
                                            icon={<IconTrash size={16} />}
                                            onClick={() => remove(field.name)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(200px,1fr)_208px]">
                                        <FormItem name={[field.name, "locationPath"]} label="Location" rules={[schemaToRule(proxyServiceLocationPathSchema)]}>
                                            <Input autoComplete="off" allowClear placeholder="/path" />
                                        </FormItem>
                                        <FormItem name={[field.name, "targetMode"]} label="目标模式" rules={[{ required: true, message: "请选择目标模式" }]}>
                                            <Select
                                                options={[
                                                    { label: "静态目标", value: ProxyServiceLocationTargetMode.静态 },
                                                    { label: "动态 URL", value: ProxyServiceLocationTargetMode.动态 },
                                                ]}
                                            />
                                        </FormItem>
                                    </div>
                                    <FormItem<AddProxyServiceParams> noStyle shouldUpdate>
                                        {form => {
                                            const targetMode = form.getFieldValue(["locations", field.name, "targetMode"])

                                            if (targetMode === ProxyServiceLocationTargetMode.动态) {
                                                return (
                                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_minmax(260px,1fr)]">
                                                        <FormItem
                                                            name={[field.name, "dynamicTargetQueryName"]}
                                                            label="URL 参数名"
                                                            rules={[schemaToRule(dynamicProxyServiceTargetQueryNameSchema)]}
                                                        >
                                                            <Input autoComplete="off" allowClear placeholder="url" />
                                                        </FormItem>
                                                        <FormItem
                                                            name={[field.name, "dynamicTargetAllowPattern"]}
                                                            label="允许 URL 正则"
                                                            rules={[schemaToRule(dynamicProxyServiceTargetAllowPatternSchema)]}
                                                        >
                                                            <Input autoComplete="off" allowClear placeholder="^https://example\\.com/" />
                                                        </FormItem>
                                                    </div>
                                                )
                                            }

                                            return (
                                                <Fragment>
                                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(240px,1.6fr)_172px_minmax(188px,1.4fr)]">
                                                        <FormItem
                                                            name={[field.name, "targetHost"]}
                                                            label="转发主机 / IP"
                                                            rules={[schemaToRule(proxyServiceAddressSchema)]}
                                                        >
                                                            <Input autoComplete="off" allowClear placeholder="10.0.0.1" />
                                                        </FormItem>
                                                        <FormItem
                                                            name={[field.name, "targetPort"]}
                                                            label="转发端口"
                                                            rules={[schemaToRule(proxyServicePortSchema)]}
                                                        >
                                                            <InputNumber className="w-full" min={1} max={65535} />
                                                        </FormItem>
                                                        <FormItem
                                                            name={[field.name, "targetPath"]}
                                                            label="转发路径"
                                                            rules={[schemaToRule(proxyServiceTargetPathSchema)]}
                                                        >
                                                            <Input autoComplete="off" allowClear placeholder="/path/" />
                                                        </FormItem>
                                                    </div>
                                                    <FormItem name={[field.name, "targetProtocol"]} className="!mb-0" label="转发协议">
                                                        <Select
                                                            options={[
                                                                { label: "HTTP", value: ProxyTargetProtocol.HTTP },
                                                                { label: "HTTPS", value: ProxyTargetProtocol.HTTPS },
                                                            ]}
                                                        />
                                                    </FormItem>
                                                </Fragment>
                                            )
                                        }}
                                    </FormItem>
                                </div>
                            ))}
                            <Button type="dashed" icon={<IconPlus size={16} />} onClick={() => add(getDefaultProxyServiceLocationFormValues())}>
                                添加路径规则
                            </Button>
                        </div>
                    )}
                </Form.List>
            </FormItem>
            <div className="grid grid-cols-4 gap-2">
                <FormItem<AddProxyServiceParams> name="websocketEnabled" label="WebSocket" valuePropName="checked">
                    <Switch />
                </FormItem>
                <FormItem<AddProxyServiceParams> name="corsEnabled" label="关闭跨域" valuePropName="checked">
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
}

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

export const SslForm: FC<SslFormProps> = ({ isPortForward }) => <SslFormContent isPortForward={isPortForward} />

export const SslFormContent: FC<SslFormProps> = ({ isPortForward }) => {
    const httpsEnabled = Form.useWatch("httpsEnabled")
    const certificateRequired = !!httpsEnabled
    const { data, isLoading } = useQueryCertificate({ pageSize: 1000 }, { enabled: certificateRequired })

    const options = (data?.list ?? []).map(certificate => ({
        label: `${certificate.name}（${certificate.address}）`,
        value: certificate.id,
    }))

    if (!certificateRequired) return null

    return (
        <FormItem<AddProxyServiceParams>
            name="certificateId"
            label={isPortForward ? "SSL 证书" : "HTTPS 证书"}
            rules={[{ required: true, message: isPortForward ? "请选择 SSL 证书" : "请选择 HTTPS 证书" }, schemaToRule(certificateIdSchema)]}
        >
            <Select loading={isLoading} showSearch={{ optionFilterProp: "label" }} options={options} placeholder="请选择已有自签证书" />
        </FormItem>
    )
}

export default ProxyServiceEditor
