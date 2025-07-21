import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

interface AttendanceRecord {
  ambulanceNumber: string;
  punchTime: string;
  punchLocation: string;
  status: string | null;
  deviceMode: any;
  date: string;
  imageCapture: any;
  responseStatus: string;
  shiftType: string | null;
}

interface EmployeeData {
  id: number;
  employeeSystemId: string;
  name: string;
  phoneNumber: string;
  userRole: string;
  attendance: AttendanceRecord[];
}

const categoryCache = new Map<number, string>();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.query;
  const isValidDate = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

  if (!startDate || !endDate || !isValidDate(startDate as string) || !isValidDate(endDate as string)) {
    return res.status(400).json({ message: 'Valid start date and end date (YYYY-MM-DD) are required' });
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  if (start > end) {
    return res.status(400).json({ message: 'startDate cannot be after endDate' });
  }

  try {
    const employeesPromise = prisma.employee.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        employeeSystemId: true,
        name: true,
        phoneNumber: true,
        categoryId: true,
        Attendance: {
          where: {
            date: {
              gte: startDate as string,
              lte: endDate as string,
            },
          },
          select: {
            punchTime: true,
            punchLocation: true,
            status: true,
            punchOutType: true,
            deviceMode: true,
            date: true,
            shiftType: true,
            imageCapture: true,
            responseStatus: true,
            ambulance: {
              select: {
                ambulanceNumber: true,
              },
            },
          },
          orderBy: {
            punchTime: 'asc',
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

    const [employees, categoryIds] = await Promise.all([employeesPromise, categoryIdsPromise]);

    let categoryMap = categoryCache;
    if (categoryIds.length > 0 && categoryMap.size === 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      });
      categoryMap = new Map(categories.map((cat) => [cat.id, cat.name.toLowerCase()]));
      categories.forEach((cat) => categoryMap.set(cat.id, cat.name.toLowerCase()));
    }

    const response: EmployeeData[] = employees.map((employee) => ({
      id: Number(employee.id),
      employeeSystemId: employee.employeeSystemId,
      name: employee.name || '',
      phoneNumber: employee.phoneNumber || '',
      userRole: employee.categoryId ? categoryMap.get(employee.categoryId) || 'unknown' : 'unknown',
      attendance: employee.Attendance.map((att) => ({
        ambulanceNumber: att.ambulance?.ambulanceNumber || '',
        punchTime: att.punchTime || '',
        punchLocation: att.punchLocation || '',
        status: att.status,
        punchOutType: att.punchOutType,
        deviceMode: att.deviceMode,
        date: att.date || '',
        shiftType: att.shiftType || '',
        imageCapture: att.imageCapture || '',
        responseStatus: att.responseStatus || '',
      })),
    }));

    return res.status(200).json(response);
  } catch (error: unknown) {
    return res.status(500).json({
      message: `Failed to fetch attendance records: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
    });
  }
});

export default router;