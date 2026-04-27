import { SystemSettingKey } from "@/constants/systemSettings"

import { getCachedSystemSettingValue } from "./systemSettings"

export function getTempEmail(phoneNumber: string) {
    const defaultEmailDomain = getCachedSystemSettingValue(SystemSettingKey.默认邮箱域名)
    return `${crypto.randomUUID()}@${defaultEmailDomain}`
}
