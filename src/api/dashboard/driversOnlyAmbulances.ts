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

// Define Attendance type to match Prisma's schema
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
  // Include other possible fields from Prisma schema
  gpsStatus?: string | null;
  imageCapture?: string | null;
  // Add other fields as needed based on your schema
}

router.get<{}, DriverAttendanceResponse | { error: string }>("/", async (req, res) => {
  try {
    // Get Driver category ID
    const driverCategory = await prisma.category.findFirst({ where: { name: 'Driver' } });
    if (!driverCategory) throw new Error('Driver category not found');

    // Set dynamic date ranges based on CURDATE()
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const yesterdayStartISO = yesterdayStart.toISOString();
    const todayEndISO = todayEnd.toISOString();

    // Fetch ambulances with driver attendance
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

    // Track assigned drivers to prevent duplicates
    const assignedDrivers = new Set<string>();
    const processedDrivers: DriverAttendanceResponse['drivers'] = ambulances
      .filter((ambulance) =>
        ambulance.Attendance.some(
          (att: AttendanceRecord) => !att.employee.employeeSystemId?.toLowerCase().includes('itg'),
        ),
      )
      .map((ambulance) => {
        // Get latest valid PunchIn for this ambulance, excluding already assigned drivers
        const driverAttendance = ambulance.Attendance
          .filter(
            (att: AttendanceRecord) =>
              att.status === 'PunchIn' &&
              att.punchTime &&
              !assignedDrivers.has(att.employee.employeeSystemId),
          )
          .sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.punchTime!).getTime() - new Date(a.punchTime!).getTime())
          .find((att: AttendanceRecord) => {
            const punchTime = new Date(att.punchTime!);
            const hasPunchOut = ambulance.Attendance.some(
              (a2: AttendanceRecord) =>
                a2.employeeId === att.employeeId &&
                a2.status === 'PunchOut' &&
                a2.punchTime &&
                new Date(a2.punchTime) > punchTime,
            );
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

    // Add drivers without an ambulance (inactive drivers)
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
      .filter((driver) => {
        const latestAttendance = driver.Attendance.sort(
          (a, b) => new Date(b.punchTime || '').getTime() - new Date(a.punchTime || '').getTime(),
        )[0];
        return !assignedDrivers.has(driver.employeeSystemId ?? '') && (!latestAttendance || latestAttendance.status !== 'PunchIn');
      })
      .map((driver) => ({
        ambulanceNumber: null,
        info: [{
          employeeSystemId: driver.employeeSystemId,
          name: driver.name,
          phoneNumber: driver.phoneNumber,
          designation: driver.category?.name ?? null,
          latestPunchTime: driver.Attendance.length > 0 ? driver.Attendance[0].punchTime : null,
          latestStatus: driver.Attendance.length > 0 ? driver.Attendance[0].status : null,
          punchOutType: driver.Attendance.length > 0 ? driver.Attendance[0].punchOutType : null,
          ambulanceNumber: null,
        }],
      }));

    // Combine active and inactive drivers
    const drivers = [...processedDrivers, ...inactiveDriverGroups].filter((group) => group.info.length > 0);

    // Calculate counts
    const totalDrivers = allDrivers.length;
    const activeDrivers = processedDrivers.filter((group) => group.info.length > 0).length;
    const totalAmbulances = new Set(processedDrivers.map((group) => group.ambulanceNumber)).size;
    const inactiveDrivers = totalDrivers - activeDrivers;

    // Prepare response
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