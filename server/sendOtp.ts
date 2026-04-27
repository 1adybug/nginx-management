import { SystemSettingKey } from "@/constants/systemSettings"

import { sendAliyunSms } from "./sendAliyunSms"
import { sendQjpSms } from "./sendQjpSms"
import { getBooleanSystemSettingValue } from "./systemSettings"

export interface SendOtpParams {
    phoneNumber: string
    code: string
}

export async function sendOtp({ phoneNumber, code }: SendOtpParams) {
    const isIntranet = await getBooleanSystemSettingValue(SystemSettingKey.内网短信)

    if (isIntranet) return sendQjpSms({ phone: phoneNumber, content: `格数科技项目管理，你的登录验证码为 ${code}` })
    return sendAliyunSms({ phone: phoneNumber, signName: "格数科技", templateCode: "SMS_478995533", params: { code } })
}
