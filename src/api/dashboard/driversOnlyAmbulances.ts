import express from "express";
import { PrismaClient, PunchOutType } from "@prisma/client";

interface DriverAttendanceResponse {
  totalDrivers: number;
  totalAmbulances: number;
  activeDrivers: number;
  inactiveDrivers: number;
  drivers: {
    ambulanceNumber: string | null;
    info: {
      employeeSystemId: string | null;
      name: string | null;
      phoneNumber: string | null;
      designation: string | null;
      latestPunchTime: string | null;
      latestStatus: string | null;
      punchOutType: PunchOutType | null;
      ambulanceNumber: string | null;
    }[];
  }[];
}

const prisma = new PrismaClient();
const router = express.Router();

interface AttendanceRecord {
  id: number;
  employeeId: number;
  ambulanceId: number | null;
  status: string | null;
  punchTime: string | null;
  punchOutType: PunchOutType | null;
  employee: {
    name: string;
    employeeSystemId: string;
    phoneNumber: string | null;
    category: { name: string } | null;
  };
  gpsStatus?: string | null;
  imageCapture?: string | null;
}

router.get<{}, DriverAttendanceResponse | { error: string }>("/", async (req, res) => {
  try {
    const driverCategory = await prisma.category.findFirst({ where: { name: 'Driver' } });
    if (!driverCategory) throw new Error('Driver category not found');

    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const yesterdayStartISO = yesterdayStart.toISOString();
    const todayEndISO = todayEnd.toISOString();

    const ambulances = await prisma.ambulance.findMany({
      where: {
        isSpareAmbulance: false,
        ambulanceNumber: { not: { contains: 'itg' } },
        deletedAt: null,
      },
      include: {
        Attendance: {
          where: {
            employee: { categoryId: driverCategory.id },
            OR: [
              { status: 'PunchIn', punchTime: { gte: yesterdayStartISO, lte: todayEndISO } },
              { status: 'PunchOut', punchTime: { gte: yesterdayStartISO, lte: todayEndISO } },
            ],
          },
          include: {
            employee: {
              select: {
                name: true,
                employeeSystemId: true,
                phoneNumber: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const assignedDrivers = new Set<string>();
    const processedDrivers: DriverAttendanceResponse['drivers'] = ambulances
      .filter((ambulance) => ambulance.Attendance.some((att: AttendanceRecord) => !att.employee.employeeSystemId?.toLowerCase().includes('itg')))
      .map((ambulance) => {
        const driverAttendance = ambulance.Attendance
          .filter((att: AttendanceRecord) => att.status === 'PunchIn' && att.punchTime && !assignedDrivers.has(att.employee.employeeSystemId))
          .sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.punchTime!).getTime() - new Date(a.punchTime!).getTime())
          .find((att: AttendanceRecord) => {
            const punchTime = new Date(att.punchTime!);
            const hasPunchOut = ambulance.Attendance.some((a2: AttendanceRecord) => a2.employeeId === att.employeeId && a2.status === 'PunchOut' && a2.punchTime && new Date(a2.punchTime) > punchTime);
            return !hasPunchOut;
          });

        if (driverAttendance) {
          assignedDrivers.add(driverAttendance.employee.employeeSystemId);
          return {
            ambulanceNumber: ambulance.ambulanceNumber,
            info: [{
              employeeSystemId: driverAttendance.employee.employeeSystemId,
              name: driverAttendance.employee.name,
              phoneNumber: driverAttendance.employee.phoneNumber,
              designation: driverAttendance.employee.category?.name ?? null,
              latestPunchTime: driverAttendance.punchTime,
              latestStatus: driverAttendance.status,
              punchOutType: driverAttendance.punchOutType,
              ambulanceNumber: ambulance.ambulanceNumber,
            }],
          };
        }
        return { ambulanceNumber: ambulance.ambulanceNumber, info: [] };
      })
      .filter((group) => group.info.length > 0);

    const allDrivers = await prisma.employee.findMany({
      where: {
        categoryId: driverCategory.id,
        employeeSystemId: { not: { contains: 'itg' } },
        deletedAt: null,
      },
      include: {
        category: { select: { name: true } },
        Attendance: {
          where: {
            OR: [
              { status: 'PunchIn', punchTime: { gte: yesterdayStartISO, lte: todayEndISO } },
              { status: 'PunchOut', punchTime: { gte: yesterdayStartISO, lte: todayEndISO } },
            ],
          },
          include: {
            ambulance: { select: { ambulanceNumber: true } },
          },
        },
      },
    });

    const inactiveDriverGroups: DriverAttendanceResponse['drivers'] = allDrivers
      .filter((driver) => !assignedDrivers.has(driver.employeeSystemId ?? ''))
      .map((driver) => {
        const latestAttendance = driver.Attendance.sort((a, b) => new Date(b.punchTime || '').getTime() - new Date(a.punchTime || '').getTime())[0];
        return {
          ambulanceNumber: null,
          info: [{
            employeeSystemId: driver.employeeSystemId,
            name: driver.name,
            phoneNumber: driver.phoneNumber,
            designation: driver.category?.name ?? null,
            latestPunchTime: latestAttendance && latestAttendance.status === 'PunchIn' ? null : (driver.Attendance.length > 0 ? driver.Attendance[0].punchTime : null),
            latestStatus: driver.Attendance.length > 0 ? driver.Attendance[0].status : null,
            punchOutType: driver.Attendance.length > 0 ? driver.Attendance[0].punchOutType : null,
            ambulanceNumber: null,
          }],
        };
      });

    const drivers = [...processedDrivers, ...inactiveDriverGroups];

    const totalDrivers = allDrivers.length;
    const activeDrivers = processedDrivers.filter((group) => group.info.length > 0).length;
    const totalAmbulances = new Set(processedDrivers.map((group) => group.ambulanceNumber)).size;
    const inactiveDrivers = totalDrivers - activeDrivers;

    const response: DriverAttendanceResponse = {
      totalDrivers,
      totalAmbulances,
      activeDrivers,
      inactiveDrivers,
      drivers,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;