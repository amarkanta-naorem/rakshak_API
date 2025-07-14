import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.employee.update({
      where: {
        id: parseInt(id),
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Employee not found' });
    } else {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  } finally {
    await prisma.$disconnect();
  }
});

export default router;