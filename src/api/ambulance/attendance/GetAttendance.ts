import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

interface AttendanceRecord {
  date: string;
  status: string;
  punchIn: string;
  punchOut: string | null;
  punchInLocation: string;
  punchOutLocation: string;
  totalWorkingHour: number;
  ambulanceNumber: string;
}

interface EmployeeData {
  id: number;
  employeeSystemId: string;
  name: string;
  phoneNumber: string;
  userRole: string;
  attendance: AttendanceRecord[];
}

interface ResponseData {
  supervisors: EmployeeData[];
  emts: EmployeeData[];
  drivers: EmployeeData[];
  ambulances: EmployeeData[];
  rexpress: EmployeeData[];
  office: EmployeeData[];
  others: EmployeeData[];
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
      supervisors: [],
      emts: [],
      drivers: [],
      ambulances: [],
      rexpress: [],
      office: [],
      others: [],
    };

    for (const employee of employees) {
      const userRole = employee.category?.name.toLowerCase();
      if (!userRole || !['supervisor', 'emt', 'driver', 'ambulance', 'rexpress', 'office', 'others'].includes(userRole)) continue;

      const attendanceByDate = new Map<string, any[]>();
      for (const att of employee.Attendance) {
        if (!att.date) continue;
        attendanceByDate.set(att.date, [...(attendanceByDate.get(att.date) || []), att]);
      }

      const attendanceRecords: AttendanceRecord[] = [];
      for (const [date, records] of attendanceByDate) {
        const sortedRecords = [...records].sort((a, b) => {
          const timeA = a.punchTime ? new Date(a.punchTime).getTime() : 0;
          const timeB = b.punchTime ? new Date(b.punchTime).getTime() : 0;
          return timeA - timeB;
        });

        const firstPunchInRecord = sortedRecords.find((r) => r.status === 'PunchIn');
        const lastRecord = sortedRecords[sortedRecords.length - 1];

        let punchIn = '';
        let punchOut: string | null = null;
        let totalWorkingHour = 0;
        let punchInLocation = '';
        let punchOutLocation = '';

        if (firstPunchInRecord?.punchTime) {
          punchIn = firstPunchInRecord.punchTime.split('|')[0] || '';
          punchInLocation = firstPunchInRecord.punchLocation || '';
        }

        if (lastRecord?.status === 'PunchOut' && lastRecord?.punchTime && punchIn && punchIn !== '') {
          punchOut = lastRecord.punchTime.split('|')[0] || '';
          punchOutLocation = lastRecord.punchLocation || '';

          if (punchOut && punchOut !== '') {
            const punchInDate = new Date(punchIn);
            const punchOutDate = new Date(punchOut);
            if (!isNaN(punchInDate.getTime()) && !isNaN(punchOutDate.getTime())) {
              totalWorkingHour = (punchOutDate.getTime() - punchInDate.getTime()) / (1000 * 60 * 60);
              totalWorkingHour = Number(totalWorkingHour.toFixed(2));
            }
          }
        }

        if (punchIn || punchOut) {
          attendanceRecords.push({
            date,
            status: firstPunchInRecord && lastRecord?.status === 'PunchOut' && punchIn && punchOut && punchIn !== '' && punchOut !== '' ? 'PunchOut' : firstPunchInRecord || lastRecord?.status === 'PunchIn' ? 'PunchIn' : '',
            punchIn,
            punchOut,
            punchInLocation,
            punchOutLocation,
            totalWorkingHour,
            ambulanceNumber: firstPunchInRecord?.ambulance?.ambulanceNumber || lastRecord?.ambulance?.ambulanceNumber || '',
          });
        }
      }

      const employeeData: EmployeeData = {
        id: Number(employee.id),
        employeeSystemId: employee.employeeSystemId,
        name: employee.name,
        phoneNumber: employee.phoneNumber || '',
        userRole,
        attendance: attendanceRecords,
      };

      switch (userRole) {
        case 'supervisor':
          response.supervisors.push(employeeData);
          break;
        case 'emt':
          response.emts.push(employeeData);
          break;
        case 'driver':
          response.drivers.push(employeeData);
          break;
        case 'ambulance':
          response.ambulances.push(employeeData);
          break;
        case 'rexpress':
          response.rexpress.push(employeeData);
          break;
        case 'office':
          response.office.push(employeeData);
          break;
        case 'others':
          response.others.push(employeeData);
          break;
      }
    }

    return res.status(200).json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(errorMessage);
    return res.status(500).json({ message: `Failed to fetch attendance records: ${errorMessage}` });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;