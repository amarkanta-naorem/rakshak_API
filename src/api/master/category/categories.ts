import express from 'express';
import { PrismaClient } from '@prisma/client';

interface Category {
  id: number;
  name: string;
  description: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
}

interface MessageResponse {
  data?: Category[];
  error?: string;
}

const prisma = new PrismaClient();
const router = express.Router();

router.get<{}, MessageResponse>('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, description: true, shiftStartTime: true, shiftEndTime: true },
    });

    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;