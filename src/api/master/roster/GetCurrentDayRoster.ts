import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Define interfaces for the response structure
interface EmployeeDetails {
  name: string;
  phoneNumber: string | null;
  role: string;
}

interface AmbulanceDetails {
  callSign: string | null;
  zone: string | null;
  ambulanceNumber: string | null;
  location: string | null;
  mdtMobileNumber: string | null;
}

interface RosterRecord {
  rosterDate: string;
  shift: string;
  ambulance: AmbulanceDetails;
  manager: EmployeeDetails;
  emt: EmployeeDetails;
  driver: EmployeeDetails;
}

interface RosterResponse {
  rosters: RosterRecord[];
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract query parameters for filtering
    const { rosterDate, shift } = req.query;

    // Validate rosterDate format if provided
    if (rosterDate && !/^\d{4}-\d{2}-\d{2}$/.test(rosterDate as string)) {
      return res.status(400).json({ message: 'Invalid rosterDate format. Use YYYY-MM-DD' });
    }

    // Validate shift if provided
    if (shift && !['Day Shift', 'Night Shift'].includes(shift as string)) {
      return res.status(400).json({ message: 'Invalid shift. Must be "Day Shift" or "Night Shift"' });
    }

    // Fetch rosters with related data
    const rosters = await prisma.roster.findMany({
      where: {
        ...(rosterDate && { rosterDate: new Date(rosterDate as string) }),
        ...(shift && { shift: shift as string }),
        deletedAt: null, // Exclude soft-deleted records
      },
      include: {
        ambulance: true,
        manager: {
          include: { category: true },
        },
        emt: {
          include: { category: true },
        },
        driver: {
          include: { category: true },
        },
      },
    });

    // Structure the response
    const response: RosterResponse = {
      rosters: rosters.map((roster) => ({
        rosterDate: roster.rosterDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        shift: roster.shift,
        ambulance: {
          callSign: roster.ambulance?.callSign || null,
          zone: roster.ambulance?.zone || null,
          ambulanceNumber: roster.ambulance?.ambulanceNumber || null,
          location: roster.ambulance?.location || null,
          mdtMobileNumber: roster.ambulance?.mdtMobileNumber || null,
        },
        manager: {
          name: roster.manager?.name || '',
          phoneNumber: roster.manager?.phoneNumber || null,
          role: roster.manager?.category?.name || 'Manager',
        },
        emt: {
          name: roster.emt?.name || '',
          phoneNumber: roster.emt?.phoneNumber || null,
          role: roster.emt?.category?.name || 'EMT',
        },
        driver: {
          name: roster.driver?.name || '',
          phoneNumber: roster.driver?.phoneNumber || null,
          role: roster.driver?.category?.name || 'Driver',
        },
      })),
    };

    return res.status(200).json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ message: `Failed to fetch roster records: ${errorMessage}` });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;