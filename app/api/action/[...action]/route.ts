import { NextRequest, NextResponse } from "next/server"

import { createRouteFn, OriginalResponseFn, RouteBodyType, RouteHandler } from "@/server/createResponseFn"

import { addProxyService } from "@/shared/addProxyService"
import { addUser } from "@/shared/addUser"
import { banUser } from "@/shared/banUser"
import { createFirstUser } from "@/shared/createFirstUser"
import { deleteProxyService } from "@/shared/deleteProxyService"
import { deleteUser } from "@/shared/deleteUser"
import { getProxyService } from "@/shared/getProxyService"
import { getUser } from "@/shared/getUser"
import { login } from "@/shared/login"
import { queryErrorLog } from "@/shared/queryErrorLog"
import { queryOperationLog } from "@/shared/queryOperationLog"
import { queryProxyService } from "@/shared/queryProxyService"
import { queryUser } from "@/shared/queryUser"
import { regenerateProxyServiceCertificate } from "@/shared/regenerateProxyServiceCertificate"
import { sendCurrentUserPhoneNumberOtp } from "@/shared/sendCurrentUserPhoneNumberOtp"
import { sendPhoneNumberOtp } from "@/shared/sendPhoneNumberOtp"
import { unbanUser } from "@/shared/unbanUser"
import { updateCurrentUserProfile } from "@/shared/updateCurrentUserProfile"
import { updateProxyService } from "@/shared/updateProxyService"
import { updateUser } from "@/shared/updateUser"

const routeMap = new Map<string, RouteHandler>()

function registerRoute<TParams extends [arg?: unknown], TData, TPathname extends string, TRouteBodyType extends RouteBodyType = "json">(
    fn: OriginalResponseFn<TParams, TData, TPathname, TRouteBodyType>,
) {
    if (!fn.route) return
    const pathname = fn.route.pathname.replace(/(^\/|\/$)/g, "")
    if (routeMap.has(pathname)) throw new Error(`pathname ${pathname} is duplicate`)
    routeMap.set(pathname, createRouteFn(fn))
}

registerRoute(addProxyService)
registerRoute(addUser)
registerRoute(banUser)
registerRoute(createFirstUser)
registerRoute(deleteProxyService)
registerRoute(deleteUser)
registerRoute(getProxyService)
registerRoute(getUser)
registerRoute(login)
registerRoute(queryErrorLog)
registerRoute(queryOperationLog)
registerRoute(queryProxyService)
registerRoute(queryUser)
registerRoute(regenerateProxyServiceCertificate)
registerRoute(sendCurrentUserPhoneNumberOtp)
registerRoute(sendPhoneNumberOtp)
registerRoute(unbanUser)
registerRoute(updateCurrentUserProfile)
registerRoute(updateProxyService)
registerRoute(updateUser)

export function POST(request: NextRequest) {
    const { pathname } = new URL(request.url)
    const routeHandler = routeMap.get(pathname.replace(/(^\/api\/action\/|\/$)/g, ""))

    if (!routeHandler) return NextResponse.json({ success: false, data: undefined, message: "Not Found", code: 404 }, { status: 404 })

    return routeHandler(request)
}
