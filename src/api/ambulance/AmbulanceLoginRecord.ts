import express from "express";
import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";

interface AmbulanceResponse {
  ambulanceNumber: string | null;
  deviceLoginAt: string | null;
  manufacturer: string | null;
  deviceModelName: string | null;
}

const prisma = new PrismaClient();
const router = express.Router();

router.get<{}, AmbulanceResponse[] | { error: string }>("/", async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const ambulances = await prisma.ambulance.findMany({
      where: {
        deletedAt: null,
        devices: {
          some: {
            deviceLoginAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      },
      select: {
        ambulanceNumber: true,
        devices: {
          select: {
            deviceLoginAt: true,
            manufacturer: true,
            deviceModelName: true,
          },
          where: {
            deviceLoginAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          orderBy: { deviceLoginAt: "desc" },
          take: 1,
        },
      },
    });

    const response: AmbulanceResponse[] = ambulances.map((ambulance) => ({
      ambulanceNumber: ambulance.ambulanceNumber,
      deviceLoginAt: ambulance.devices[0]?.deviceLoginAt ? format(new Date(ambulance.devices[0].deviceLoginAt), "d MMMM, yyyy hh:mm:ss a") : null,
      manufacturer: ambulance.devices[0]?.manufacturer ?? null,
      deviceModelName: ambulance.devices[0]?.deviceModelName ?? null,
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;