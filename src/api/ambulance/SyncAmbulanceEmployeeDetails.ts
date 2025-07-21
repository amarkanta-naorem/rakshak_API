import express from 'express';
import { PrismaClient } from '@prisma/client';

interface EmployeeWithCategory {
  employeeId: number;
  employeeSystemId: string;
  name: string;
  awsFaceId: string | null;
  faceImageData: string | null;
  categoryName: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
}

const prisma = new PrismaClient();
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const lastEmployeeId = req.query.lastEmployeeId ? parseInt(req.query.lastEmployeeId as string) : undefined;

    const employees = await prisma.employee.findMany({
      where: {
        deletedAt: null,
        ...(lastEmployeeId !== undefined && { id: { gt: lastEmployeeId } }),
      },
      select: {
        id: true,
        employeeSystemId: true,
        name: true,
        phoneNumber: true,
        awsFaceId: true,
        faceImageData: true,
        category: {
          select: {
            name: true,
            shiftStartTime: true,
            shiftEndTime: true,
          },
        },
      },
    });

    const formattedEmployees: EmployeeWithCategory[] = employees.map(emp => ({
      employeeId: emp.id,
      employeeSystemId: emp.employeeSystemId,
      name: emp.name,
      phoneNumber: emp.phoneNumber,
      awsFaceId: emp.awsFaceId,
      faceImageData: emp.faceImageData ? emp.faceImageData : null,
      categoryName: emp.category?.name ?? null,
      shiftStartTime: emp.category?.shiftStartTime ?? null,
      shiftEndTime: emp.category?.shiftEndTime ?? null,
    }));

    res.json(formattedEmployees);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;