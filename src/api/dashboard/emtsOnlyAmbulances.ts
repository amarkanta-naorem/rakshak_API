import express from "express";
import { PrismaClient, PunchOutType } from "@prisma/client";

interface EMTAttendanceResponse {
  totalEmployees: number;
  totalAmbulances: number;
  activeEMTs: number;
  inactiveEMTs: number;
  employees: {
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
  gpsStatus?: string | null;
  imageCapture?: string | null;
}

router.get<{}, EMTAttendanceResponse | { error: string }>("/", async (req, res) => {
  try {
    // Get EMT category ID
    const emtCategory = await prisma.category.findFirst({ where: { name: 'EMT' } });
    if (!emtCategory) throw new Error('EMT category not found');

    // Set dynamic date range for current day
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayStartISO = todayStart.toISOString();
    const todayEndISO = todayEnd.toISOString();

    // Fetch ambulances with EMT attendance
    const ambulances = await prisma.ambulance.findMany({
      where: {
        isSpareAmbulance: false,
        ambulanceNumber: { not: { contains: 'itg' } },
        deletedAt: null,
      },
      include: {
        Attendance: {
          where: {
            employee: { categoryId: emtCategory.id },
            OR: [
              { status: 'PunchIn', punchTime: { gte: todayStartISO, lte: todayEndISO } },
              { status: 'PunchOut', punchTime: { gte: todayStartISO, lte: todayEndISO } },
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

    // Track assigned EMTs to ensure one EMT per ambulance and no duplicates
    const assignedEMTs = new Set<string>();
    const processedEMTs: EMTAttendanceResponse['employees'] = ambulances
      .map((ambulance) => {
        // Get latest valid PunchIn for this ambulance, excluding already assigned EMTs
        const emtAttendance = ambulance.Attendance
          .filter(
            (att: AttendanceRecord) =>
              att.status === 'PunchIn' &&
              att.punchTime &&
              !att.employee.employeeSystemId?.toLowerCase().includes('itg') &&
              !assignedEMTs.has(att.employee.employeeSystemId),
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

        if (emtAttendance) {
          assignedEMTs.add(emtAttendance.employee.employeeSystemId);
          return {
            ambulanceNumber: ambulance.ambulanceNumber,
            info: [{
              employeeSystemId: emtAttendance.employee.employeeSystemId,
              name: emtAttendance.employee.name,
              phoneNumber: emtAttendance.employee.phoneNumber,
              designation: emtAttendance.employee.category?.name ?? null,
              latestPunchTime: emtAttendance.punchTime,
              latestStatus: emtAttendance.status,
              punchOutType: emtAttendance.punchOutType,
              ambulanceNumber: ambulance.ambulanceNumber,
            }],
          };
        }
        return { ambulanceNumber: ambulance.ambulanceNumber, info: [] };
      })
      .filter((group) => group.info.length > 0);

    // Add EMTs without an ambulance (inactive EMTs)
    const allEMTs = await prisma.employee.findMany({
      where: {
        categoryId: emtCategory.id,
        employeeSystemId: { not: { contains: 'itg' } },
        deletedAt: null,
      },
      include: {
        category: { select: { name: true } },
        Attendance: {
          where: {
            OR: [
              { status: 'PunchIn', punchTime: { gte: todayStartISO, lte: todayEndISO } },
              { status: 'PunchOut', punchTime: { gte: todayStartISO, lte: todayEndISO } },
            ],
          },
          include: {
            ambulance: { select: { ambulanceNumber: true } },
          },
        },
      },
    });

    const inactiveEMTGroups: EMTAttendanceResponse['employees'] = allEMTs
      .filter((emt) => {
        const latestAttendance = emt.Attendance.sort(
          (a, b) => new Date(b.punchTime || '').getTime() - new Date(a.punchTime || '').getTime(),
        )[0];
        return !assignedEMTs.has(emt.employeeSystemId ?? '') && (!latestAttendance || latestAttendance.status !== 'PunchIn');
      })
      .map((emt) => ({
        ambulanceNumber: null,
        info: [{
          employeeSystemId: emt.employeeSystemId,
          name: emt.name,
          phoneNumber: emt.phoneNumber,
          designation: emt.category?.name ?? null,
          latestPunchTime: emt.Attendance.length > 0 ? emt.Attendance[0].punchTime : null,
          latestStatus: emt.Attendance.length > 0 ? emt.Attendance[0].status : null,
          punchOutType: emt.Attendance.length > 0 ? emt.Attendance[0].punchOutType : null,
          ambulanceNumber: null,
        }],
      }));

    // Combine active and inactive EMTs
    const employees = [...processedEMTs, ...inactiveEMTGroups].filter((group) => group.info.length > 0);

    // Calculate counts
    const totalEmployees = allEMTs.length;
    const activeEMTs = processedEMTs.length;
    const totalAmbulances = new Set(processedEMTs.map((group) => group.ambulanceNumber)).size;
    const inactiveEMTs = totalEmployees - activeEMTs;

    // Prepare response
    const response: EMTAttendanceResponse = {
      totalEmployees,
      totalAmbulances,
      activeEMTs,
      inactiveEMTs,
      employees,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;