import express from 'express';
import { PrismaClient } from '@prisma/client';

interface EmployeeWithCategory {
  employeeId: number;
  employeeSystemId: string;
  name: string;
  categoryName: string | null;
}


const prisma = new PrismaClient();
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        employeeSystemId: true,
        name: true,
        phoneNumber: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        id: 'desc'
      }
    });

    const formattedEmployees: EmployeeWithCategory[] = employees.map(emp => ({
      employeeId: emp.id,
      employeeSystemId: emp.employeeSystemId,
      name: emp.name,
      phoneNumber: emp.phoneNumber,
      categoryName: emp.category?.name ?? null
    }));

    res.json(formattedEmployees);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;