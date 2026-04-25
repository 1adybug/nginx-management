import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"

import { ProxyServiceOrderByWithRelationInput } from "@/prisma/generated/internal/prismaNamespace"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { queryProxyServiceSchema } from "@/schemas/queryProxyService"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

export const queryProxyService = createSharedFn({
    name: "queryProxyService",
    schema: queryProxyServiceSchema,
    filter: isAdmin,
})(async function queryProxyService({
    id,
    serviceType,
    sourceAddress = "",
    targetHost = "",
    enabled,
    httpsEnabled,
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    pageNum = defaultPageNum,
    pageSize = defaultPageSize,
    sortBy = "createdAt",
    sortOrder = "desc",
}) {
    const sourceAddressItems = sourceAddress.split(/\s+/).filter(Boolean)
    const targetHostItems = targetHost.split(/\s+/).filter(Boolean)

    const where = id
        ? { id }
        : {
              createdAt: {
                  gte: createdAfter,
                  lte: createdBefore,
              },
              updatedAt: {
                  gte: updatedAfter,
                  lte: updatedBefore,
              },
              serviceType,
              enabled,
              httpsEnabled,
              AND: [
                  ...sourceAddressItems.map(item => ({
                      sourceAddress: {
                          contains: item,
                      },
                  })),
                  ...targetHostItems.map(item => ({
                      targetHost: {
                          contains: item,
                      },
                  })),
              ],
          }

    const orderBy: ProxyServiceOrderByWithRelationInput[] = [
        {
            createdAt: sortBy === "createdAt" ? sortOrder : "desc",
        },
    ]

    if (sortBy !== "createdAt") {
        if (
            sortBy === "serviceType" ||
            sortBy === "sourceAddress" ||
            sortBy === "targetHost" ||
            sortBy === "targetPort" ||
            sortBy === "enabled" ||
            sortBy === "httpsEnabled" ||
            sortBy === "updatedAt"
        ) {
            orderBy.unshift({
                [sortBy]: sortOrder,
            })
        }
    }

    const data = await prisma.proxyService.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy,
    })

    const total = await prisma.proxyService.count({ where })

    return getPagination({
        data,
        exact: true,
        total,
        pageNum,
        pageSize,
    })
})
