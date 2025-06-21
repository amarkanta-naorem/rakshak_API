import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

interface EmployeeWithCategory {
  id: number;
  name: string;
  awsFaceId: string | null;
  faceImageData: string | null;
  categoryName: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
}

const prisma = new PrismaClient();
const router = express.Router();
const upload = multer(); // Multer instance to parse form-data

// GET /api/v1/ambulance/employees
router.get('/', async (req, res) => {
  try {
    const { ambulanceNumber, rosterDate } = req.query; // Changed from req.query to req.body

    if (!ambulanceNumber || !rosterDate) {
      return res.status(400).json({ error: 'Ambulance Number and Roster Date not found' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(rosterDate as string)) {
      return res.status(400).json({ error: 'Invalid rosterDate format. Use YYYY-MM-DD' });
    }

    const ambulance = await prisma.ambulance.findFirst({
      where: {
        ambulanceNumber: ambulanceNumber as string,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!ambulance) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    const roster = await prisma.roster.findFirst({
      where: {
        rosterDate: new Date(rosterDate as string),
        ambulanceId: ambulance.id,
      },
      select: {
        emtId: true,
        driverId: true,
      },
    });

    if (!roster) {
      return res.status(404).json({ error: 'No roster found for the specified date and ambulance' });
    }

    const employeeIds = [roster.emtId, roster.driverId].filter(id => id !== null) as number[];
    if (employeeIds.length === 0) {
      return res.status(404).json({ error: 'No EMT or Driver assigned in the roster' });
    }

    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
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
      id: emp.id,
      name: emp.name,
      awsFaceId: emp.awsFaceId,
      faceImageData: emp.faceImageData ? Buffer.from(emp.faceImageData).toString('base64') : null,
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

// POST /roster (unchanged)
router.post('/roster', async (req, res) => {
  try {
    const ambulanceNumber = req.body.ambulanceNumber?.trim();
    const rosterDate = req.body.rosterDate?.trim();

    if (!ambulanceNumber || !rosterDate) {
      return res.status(400).json({ error: 'ambulanceNumber and rosterDate are required' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(rosterDate)) {
      return res.status(400).json({ error: 'Invalid rosterDate format. Use YYYY-MM-DD' });
    }

    const roster = await prisma.roster.findFirst({
      where: {
        rosterDate: new Date(rosterDate),
        ambulance: {
          ambulanceNumber: ambulanceNumber,
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: {
        ambulance: {
          select: {
            id: true,
            type: true,
            callSign: true,
            ambulanceNumber: true,
            zone: true,
            location: true,
            mdtMobileNumber: true,
          },
        },
      },
    });

    if (!roster) {
      return res.status(404).json({ error: 'No roster found for the specified date and ambulance' });
    }

    res.json({
      id: roster.id,
      rosterDate: roster.rosterDate,
      shift: roster.shift,
      ambulanceId: roster.ambulanceId,
      managerId: roster.managerId,
      emtId: roster.emtId,
      driverId: roster.driverId,
      createdAt: roster.createdAt,
      updatedAt: roster.updatedAt,
      deletedAt: roster.deletedAt,
      ambulance: roster.ambulance,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;