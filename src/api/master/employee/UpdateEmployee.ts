import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

interface EmployeeWithCategory {
  employeeId: number;
  employeeSystemId: string;
  name: string;
  phoneNumber: string;
  categoryName: string | null;
}

const prisma = new PrismaClient();
const router = express.Router();

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { employeeSystemId, name, phoneNumber, categoryName } = req.body;

  try {
    if (!employeeSystemId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Employee name is required' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Employee phone number is required' });
    }
    if (!categoryName) {
      return res.status(400).json({ error: 'Employee designation is required' });
    }

    const category = await prisma.category.findFirst({
      where: {
        name: categoryName,
        deletedAt: null,
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedEmployee = await prisma.employee.update({
      where: {
        id: parseInt(id),
        deletedAt: null,
      },
      data: {
        employeeSystemId,
        name,
        phoneNumber,
        categoryId: category.id,
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
    });

    const formattedEmployee: EmployeeWithCategory = {
      employeeId: updatedEmployee.id,
      employeeSystemId: updatedEmployee.employeeSystemId,
      name: updatedEmployee.name,
      phoneNumber: updatedEmployee.phoneNumber!, // Type assertion since validation ensures phoneNumber is provided
      categoryName: updatedEmployee.category?.name ?? null,
    };

    res.json(formattedEmployee);
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