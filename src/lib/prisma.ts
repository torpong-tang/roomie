import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => new PrismaClient()

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const getPrismaClient = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error(
            'DATABASE_URL is required when Roomie API routes are executed. ' +
            'Frontend-only deployments must proxy /api requests to the Roomie API service.',
        )
    }

    if (!globalThis.prismaGlobal) {
        globalThis.prismaGlobal = prismaClientSingleton()
    }

    return globalThis.prismaGlobal
}

// Vercel hosts the frontend only and rewrites /api to the VPS API. Keeping the
// client lazy prevents Next.js page-data collection from opening a database.
const prisma = new Proxy({} as PrismaClient, {
    get(_target, property) {
        const client = getPrismaClient()
        const value = Reflect.get(client, property, client)
        return typeof value === 'function' ? value.bind(client) : value
    },
})

export default prisma
