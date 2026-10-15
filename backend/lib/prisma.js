import { PrismaClient } from '@prisma/client'

// One database connection shared by the whole backend.
export const prisma = new PrismaClient()
