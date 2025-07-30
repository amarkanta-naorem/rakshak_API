import express from "express";
import { PrismaClient, PunchOutType } from "@prisma/client";

interface AmbulanceAttendanceResponse {
  totalAmbulances: number;
  totalActiveAmbulances: number;
  totalInActiveAmbulances: number;
  driversOnly: number;
  emtsOnly: number;
  totalDrivers: number;
  totalEmts: number;
  ambulances: {
    ambulanceNumber: string | null;
    driver: {
      name: string | null;
      employeeSystemId: string | null;
      phoneNumber: string | null;
      latestPunchTime: string | null;
      punchOutType: PunchOutType | null;
    };
    emt: {
      name: string | null;
      employeeSystemId: string | null;
      phoneNumber: string | null;
      latestPunchTime: string | null;
      punchOutType: PunchOutType | null;
    };
  }[];
}

const prisma = new PrismaClient();
const router = express.Router();

// Define type for Attendance records
type AttendanceRecord = {
  employeeId: number;
  employee: {
    name: string | null;
    employeeSystemId: string | null;
    phoneNumber: string | null;
    categoryId: number | null;
  };
  punchTime: string | null;
  punchOutType: PunchOutType | null;
  status: string | null;
};

router.get<{}, AmbulanceAttendanceResponse | { error: string }>("/", async (req, res) => {
  try {
    // Get Driver and EMT category IDs
    const [driverCategory, emtCategory] = await Promise.all([
      prisma.category.findFirst({ where: { name: 'Driver' } }),
      prisma.category.findFirst({ where: { name: 'EMT' } }),
    ]);

    if (!driverCategory || !emtCategory) {
      throw new Error('Driver or EMT category not found');
    }

    // Set dynamic date ranges based on CURDATE()
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();
    const todayEndISO = todayEnd.toISOString();
    const yesterdayStartISO = yesterdayStart.toISOString();

    // Fetch total counts
    const [totalAmbulances, totalDrivers, totalEmts] = await Promise.all([
      prisma.ambulance.count({
        where: {
          isSpareAmbulance: false,
          ambulanceNumber: { not: { contains: 'itg' } },
          deletedAt: null,
        },
      }),
      prisma.employee.count({
        where: {
          categoryId: driverCategory.id,
          employeeSystemId: { not: { contains: 'itg' } },
          deletedAt: null,
        },
      }),
      prisma.employee.count({
        where: {
          categoryId: emtCategory.id,
          employeeSystemId: { not: { contains: 'itg' } },
          deletedAt: null,
        },
      }),
    ]);

    // Fetch ambulances with their attendance
    const ambulances = await prisma.ambulance.findMany({
      where: {
        isSpareAmbulance: false,
        ambulanceNumber: { not: { contains: 'itg' } },
        deletedAt: null,
      },
      select: {
        id: true,
        ambulanceNumber: true,
        Attendance: {
          where: {
            OR: [
              {
                employee: { categoryId: driverCategory.id },
                status: 'PunchIn',
                punchTime: { gte: yesterdayStartISO, lte: todayEndISO },
              },
              {
                employee: { categoryId: emtCategory.id },
                status: 'PunchIn',
                punchTime: { gte: todayStartISO, lte: todayEndISO },
              },
              {
                employee: { categoryId: { in: [driverCategory.id, emtCategory.id] } },
                status: 'PunchOut',
                punchTime: { gte: yesterdayStartISO, lte: todayEndISO },
              },
            ],
          },
          select: {
            employeeId: true,
            employee: {
              select: {
                name: true,
                employeeSystemId: true,
                phoneNumber: true,
                categoryId: true,
              },
            },
            punchTime: true,
            punchOutType: true,
            status: true,
          },
        },
      },
    });

    // Collect all valid PunchIn records to prioritize latest
    const allPunchIns: (AttendanceRecord & { ambulanceNumber: string | null })[] = [];
    ambulances.forEach((ambulance) => {
      if (ambulance.ambulanceNumber) {
        ambulance.Attendance.forEach((att) => {
          if (
            att.status === 'PunchIn' &&
            att.punchTime &&
            !att.employee.employeeSystemId?.toLowerCase().includes('itg')
          ) {
            const punchTime = new Date(att.punchTime);
            const hasPunchOut = ambulance.Attendance.some(
              (a2: AttendanceRecord) =>
                a2.employeeId === att.employeeId &&
                a2.status === 'PunchOut' &&
                a2.punchTime &&
                new Date(a2.punchTime) > punchTime,
            );
            if (!hasPunchOut) {
              allPunchIns.push({ ...att, ambulanceNumber: ambulance.ambulanceNumber });
            }
          }
        });
      }
    });

    // Sort PunchIn records by punchTime (descending) to prioritize latest
    allPunchIns.sort((a, b) => new Date(b.punchTime!).getTime() - new Date(a.punchTime!).getTime());

    // Track assigned drivers and EMTs
    const assignedDrivers = new Set<string>();
    const assignedEMTs = new Set<string>();
    const ambulanceAssignments = new Map<
      string,
      { driver: AttendanceRecord | null; emt: AttendanceRecord | null }
    >();

    // Initialize assignments for all ambulances
    ambulances.forEach((ambulance) => {
      if (ambulance.ambulanceNumber) {
        ambulanceAssignments.set(ambulance.ambulanceNumber, { driver: null, emt: null });
      }
    });

    // Assign drivers and EMTs based on latest PunchIn
    allPunchIns.forEach((att) => {
      const employeeSystemId = att.employee.employeeSystemId ?? '';
      const isDriver = att.employee.categoryId === driverCategory.id;
      const isEMT = att.employee.categoryId === emtCategory.id;

      if (isDriver && !assignedDrivers.has(employeeSystemId)) {
        assignedDrivers.add(employeeSystemId);
        ambulanceAssignments.get(att.ambulanceNumber!)!.driver = att;
      } else if (isEMT && !assignedEMTs.has(employeeSystemId)) {
        assignedEMTs.add(employeeSystemId);
        ambulanceAssignments.get(att.ambulanceNumber!)!.emt = att;
      }
    });

    // Process ambulances into response format
    const processedAmbulances: AmbulanceAttendanceResponse['ambulances'] = Array.from(
      ambulanceAssignments.entries(),
    ).map(([ambulanceNumber, { driver, emt }]) => ({
      ambulanceNumber,
      driver: {
        name: driver?.employee.name ?? null,
        employeeSystemId: driver?.employee.employeeSystemId ?? null,
        phoneNumber: driver?.employee.phoneNumber ?? null,
        latestPunchTime: driver?.punchTime
          ? new Date(driver.punchTime).toISOString().replace('T', ' ').slice(0, 19)
          : null,
        punchOutType: driver?.punchOutType ?? null,
      },
      emt: {
        name: emt?.employee.name ?? null,
        employeeSystemId: emt?.employee.employeeSystemId ?? null,
        phoneNumber: emt?.employee.phoneNumber ?? null,
        latestPunchTime: emt?.punchTime
          ? new Date(emt.punchTime).toISOString().replace('T', ' ').slice(0, 19)
          : null,
        punchOutType: emt?.punchOutType ?? null,
      },
    }));

    // Calculate counts
    const totalActiveAmbulances = processedAmbulances.filter(
      (amb) => amb.driver.latestPunchTime && amb.emt.latestPunchTime,
    ).length;

    const totalInActiveAmbulances = processedAmbulances.filter(
      (amb) => !amb.driver.latestPunchTime && !amb.emt.latestPunchTime,
    ).length;

    const driversOnly = processedAmbulances.filter(
      (amb) => amb.driver.latestPunchTime && !amb.emt.latestPunchTime,
    ).length;

    const emtsOnly = processedAmbulances.filter(
      (amb) => !amb.driver.latestPunchTime && amb.emt.latestPunchTime,
    ).length;

    // Prepare response
    const response: AmbulanceAttendanceResponse = {
      totalAmbulances,
      totalActiveAmbulances,
      totalInActiveAmbulances,
      driversOnly,
      emtsOnly,
      totalDrivers,
      totalEmts,
      ambulances: processedAmbulances,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;