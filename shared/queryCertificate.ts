import { getPagination } from "deepsea-tools"

import { prisma } from "@/prisma"

import { CertificateOrderByWithRelationInput } from "@/prisma/generated/internal/prismaNamespace"

import { defaultPageNum } from "@/schemas/pageNum"
import { defaultPageSize } from "@/schemas/pageSize"
import { queryCertificateSchema } from "@/schemas/queryCertificate"

import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"

export const queryCertificate = createSharedFn({
    name: "queryCertificate",
    schema: queryCertificateSchema,
    filter: isAdmin,
})(async function queryCertificate({
    id,
    name = "",
    address = "",
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    pageNum = defaultPageNum,
    pageSize = defaultPageSize,
    sortBy = "createdAt",
    sortOrder = "desc",
}) {
    const nameItems = name.split(/\s+/).filter(Boolean)
    const addressItems = address.split(/\s+/).filter(Boolean)

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
              AND: [
                  ...nameItems.map(item => ({
                      name: {
                          contains: item,
                      },
                  })),
                  ...addressItems.map(item => ({
                      address: {
                          contains: item,
                      },
                  })),
              ],
          }

    const orderBy: CertificateOrderByWithRelationInput[] = [
        {
            createdAt: sortBy === "createdAt" ? sortOrder : "desc",
        },
    ]

    if (sortBy !== "createdAt") {
        if (sortBy === "name" || sortBy === "address" || sortBy === "expiresAt" || sortBy === "updatedAt") {
            orderBy.unshift({
                [sortBy]: sortOrder,
            })
        }
    }

    const data = await prisma.certificate.findMany({
        where,
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy,
    })

    const total = await prisma.certificate.count({ where })

    return getPagination({
        data,
        exact: true,
        total,
        pageNum,
        pageSize,
    })
})
