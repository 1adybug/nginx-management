"use client"

import { ComponentProps, FC, useId, useState } from "react"

import { Button } from "antd"
import { clsx, getErrorMessage, StrictOmit } from "deepsea-tools"
import { usePathname, useRouter } from "next/navigation"

import { User } from "@/prisma/generated/client"

import { isAdmin } from "@/server/isAdmin"

import { authClient } from "@/utils/authClient"
import { getPathnameAndSearchParams } from "@/utils/getPathnameAndSearchParams"

import Brand from "./Brand"
import { useUser } from "./UserProvider"

export interface NavItem {
    href: string
    name: string
    filter?: (user: User) => boolean
}

const navs: NavItem[] = [
    {
        href: "/",
        name: "首页",
    },
    {
        href: "/profile",
        name: "个人中心",
    },
    {
        href: "/user",
        name: "用户管理",
        filter: isAdmin,
    },
    {
        href: "/operation-log",
        name: "操作日志",
        filter: isAdmin,
    },
    {
        href: "/error-log",
        name: "错误日志",
        filter: isAdmin,
    },
]

export interface HeaderProps extends StrictOmit<ComponentProps<"header">, "children"> {}

const Header: FC<HeaderProps> = ({ className, ...rest }) => {
    const key = useId()
    const router = useRouter()
    const pathname = usePathname()
    const user = useUser()
    const [isSignOutPending, setIsSignOutPending] = useState(false)

    async function onSignOut() {
        if (isSignOutPending) return

        setIsSignOutPending(true)

        message.open({
            key,
            type: "loading",
            content: "注销中...",
            duration: 0,
        })

        try {
            const response = await authClient.signOut({})

            if (response.error) throw new Error(response.error.message || "注销失败")

            message.open({
                key,
                type: "success",
                content: "已注销",
            })

            router.refresh()
        } catch (error) {
            message.open({
                key,
                type: "error",
                content: getErrorMessage(error),
            })
        } finally {
            setIsSignOutPending(false)
        }
    }

    return (
        <header className={clsx("flex h-16 items-center gap-2 px-4", className)} {...rest}>
            <Brand className="flex-none" />
            <div className="flex flex-auto items-center gap-2">
                {navs.map(
                    ({ href, name, filter }) =>
                        (!filter || filter(user)) && (
                            <Button
                                key={href}
                                type="link"
                                color={pathname === getPathnameAndSearchParams(href).pathname ? "primary" : "default"}
                                variant="link"
                                href={href}
                            >
                                {name}
                            </Button>
                        ),
                )}
            </div>
            <div className="flex items-center gap-2">
                <div>{user?.name}</div>
                <Button size="small" color="orange" variant="filled" loading={isSignOutPending} onClick={onSignOut}>
                    注销
                </Button>
            </div>
        </header>
    )
}

export default Header
