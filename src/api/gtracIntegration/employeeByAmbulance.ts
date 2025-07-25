import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

interface AmbulanceCrew {
  ambulanceNumber: string;
  sysServiceId: string;
  date: string;
  currentEmt: {
    name: string;
    employeeSystemId: string;
    phoneNumber: string;
    category: string;
    attendances: {
      punchTime: string;
      punchLocation: string;
    };
  } | null;
  currentDriver: {
    name: string;
    employeeSystemId: string;
    phoneNumber: string;
    category: string;
    attendances: {
      punchTime: string;
      punchLocation: string;
    };
  } | null;
}

const categoryCache = new Map<number, string>();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const { ambulanceNumber } = req.query;

  try {
    const whereClause: any = {
      deletedAt: null,
    };

    if (ambulanceNumber) {
      whereClause.ambulanceNumber = ambulanceNumber as string;
    }

    const ambulancesPromise = prisma.ambulance.findMany({
      where: whereClause,
      select: {
        ambulanceNumber: true,
        sysServiceId: true,
        Attendance: {
          where: {
            date: new Date().toISOString().split('T')[0], // Current date
            responseStatus: 'Success',
          },
          select: {
            punchTime: true,
            punchLocation: true,
            employee: {
              select: {
                name: true,
                employeeSystemId: true,
                phoneNumber: true,
                categoryId: true,
              },
            },
          },
          orderBy: {
            punchTime: 'desc',
          },
        },
      },
    });

    const categoryIdsPromise = prisma.employee
      .findMany({
        where: {},
        select: { categoryId: true },
        distinct: ['categoryId'],
      })
      .then((emps) => emps.map((e) => e.categoryId).filter((id): id is number => id !== null));

    const [ambulances, categoryIds] = await Promise.all([ambulancesPromise, categoryIdsPromise]);

    let categoryMap = categoryCache;
    if (categoryIds.length > 0 && categoryMap.size === 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      });
      categoryMap = new Map(categories.map((cat) => [cat.id, cat.name.toLowerCase()]));
      categories.forEach((cat) => categoryMap.set(cat.id, cat.name.toLowerCase()));
    }

    const response: AmbulanceCrew[] = ambulances.map((ambulance) => {
      const emtAttendance = ambulance.Attendance.find((att) =>
        categoryMap.get(att.employee.categoryId!)?.includes('emt')
      );
      const driverAttendance = ambulance.Attendance.find((att) =>
        categoryMap.get(att.employee.categoryId!)?.includes('driver')
      );

      return {
        ambulanceNumber: ambulance.ambulanceNumber || '',
        sysServiceId: ambulance.sysServiceId || '',
        date: new Date().toISOString().split('T')[0],
        currentEmt: emtAttendance
          ? {
              name: emtAttendance.employee.name || '',
              employeeSystemId: emtAttendance.employee.employeeSystemId || '',
              phoneNumber: emtAttendance.employee.phoneNumber || '',
              category: emtAttendance.employee.categoryId
                ? categoryMap.get(emtAttendance.employee.categoryId) || 'unknown'
                : 'unknown',
              attendances: {
                punchTime: emtAttendance.punchTime || '',
                punchLocation: emtAttendance.punchLocation || '',
              },
            }
          : null,
        currentDriver: driverAttendance
          ? {
              name: driverAttendance.employee.name || '',
              employeeSystemId: driverAttendance.employee.employeeSystemId || '',
              phoneNumber: driverAttendance.employee.phoneNumber || '',
              category: driverAttendance.employee.categoryId
                ? categoryMap.get(driverAttendance.employee.categoryId) || 'unknown'
                : 'unknown',
              attendances: {
                punchTime: driverAttendance.punchTime || '',
                punchLocation: driverAttendance.punchLocation || '',
              },
            }
          : null,
      };
    });

    return res.status(200).json(response);
  } catch (error: unknown) {
    return res.status(500).json({
      message: `Failed to fetch ambulance crew data: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
    });
  }
});

export default router;