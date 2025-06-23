import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Define interfaces for the response structure
interface AttendanceRecord {
  date: string;
  status: string;
  reason: string;
  punchIn: string;
  punchOut: string;
  totalWorkingHour: number;
  ambulanceNumber: string;
}

interface EmployeeData {
  id: string;
  name: string;
  phoneNumber: string;
  userRole: string;
  attendance: AttendanceRecord[];
}

interface ResponseData {
  drivers: EmployeeData[];
  emts: EmployeeData[];
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch all employees with their category and attendance records
    const employees = await prisma.employee.findMany({
      include: {
        category: true,
        Attendance: {
          include: {
            ambulance: true,
          },
        },
      },
    });

    // Structure the response with explicit type
    const response: ResponseData = {
      drivers: [],
      emts: [],
    };

    // Process each employee
    for (const employee of employees) {
      const userRole = employee.category?.name.toLowerCase();
      if (!userRole || !['driver', 'emt'].includes(userRole)) continue;

      const employeeData: EmployeeData = {
        id: `DRV${employee.id.toString().padStart(5, '0')}`,
        name: employee.name,
        phoneNumber: employee.phoneNumber || '',
        userRole,
        attendance: employee.Attendance.map((att) => {
          // Calculate total working hours
          let totalWorkingHour = 0;
          if (att.punchTime) {
            const [punchIn, punchOut] = att.punchTime.split('|');
            if (punchIn && punchOut) {
              const punchInDate = new Date(punchIn);
              const punchOutDate = new Date(punchOut);
              totalWorkingHour = (punchOutDate.getTime() - punchInDate.getTime()) / (1000 * 60 * 60);
              totalWorkingHour = Number(totalWorkingHour.toFixed(2));
            }
          }

          return {
            date: att.date || '',
            status: att.status || '',
            reason: '',
            punchIn: att.punchTime?.split('|')[0] || '',
            punchOut: att.punchTime?.split('|')[1] || '',
            totalWorkingHour,
            ambulanceNumber: att.ambulance?.ambulanceNumber || '',
          } as AttendanceRecord;
        }),
      };

      // Push to appropriate array based on userRole
      if (userRole === 'driver') {
        response.drivers.push(employeeData);
      } else if (userRole === 'emt') {
        response.emts.push(employeeData);
      }
    }

    return res.status(200).json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ message: `Failed to fetch attendance records: ${errorMessage}` });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;