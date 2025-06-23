import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

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

    const response: ResponseData = {
      drivers: [],
      emts: [],
    };

    for (const employee of employees) {
      const userRole = employee.category?.name.toLowerCase();
      if (!userRole || !['driver', 'emt'].includes(userRole)) continue;

      // Group attendance records by date
      const attendanceByDate = new Map<string, any[]>();
      for (const att of employee.Attendance) {
        if (!att.date) continue;
        attendanceByDate.set(att.date, [...(attendanceByDate.get(att.date) || []), att]);
      }

      // Process grouped attendance records
      const attendanceRecords: AttendanceRecord[] = [];
      for (const [date, records] of attendanceByDate) {
        const presentRecord = records.find((r) => r.status === 'Present');
        const completeRecord = records.find((r) => r.status === 'Complete');

        let punchIn = '';
        let punchOut = '';
        let totalWorkingHour = 0;

        if (presentRecord?.punchTime && completeRecord?.punchTime) {
          punchIn = presentRecord.punchTime.split('|')[0] || '';
          punchOut = completeRecord.punchTime.split('|')[0] || '';

          if (punchIn && punchOut) {
            const punchInDate = new Date(punchIn);
            const punchOutDate = new Date(punchOut);
            if (!isNaN(punchInDate.getTime()) && !isNaN(punchOutDate.getTime())) {
              totalWorkingHour = (punchOutDate.getTime() - punchInDate.getTime()) / (1000 * 60 * 60);
              totalWorkingHour = Number(totalWorkingHour.toFixed(2));
            }
          }
        }

        attendanceRecords.push({
          date,
          status: presentRecord && completeRecord ? 'Complete' : (presentRecord ? 'Present' : ''),
          reason: '',
          punchIn,
          punchOut,
          totalWorkingHour,
          ambulanceNumber: presentRecord?.ambulance?.ambulanceNumber || completeRecord?.ambulance?.ambulanceNumber || '',
        });
      }

      const employeeData: EmployeeData = {
        id: `DRV${employee.id.toString().padStart(5, '0')}`,
        name: employee.name,
        phoneNumber: employee.phoneNumber || '',
        userRole,
        attendance: attendanceRecords,
      };

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