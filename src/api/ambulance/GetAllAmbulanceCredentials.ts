import express from "express";
import { PrismaClient } from "@prisma/client";

interface AmbulanceResponse {
  ambulanceNumber: string | null;
  username: string | null;
  password: string | null;
}

const prisma = new PrismaClient();
const router = express.Router();

router.get<{}, AmbulanceResponse[] | { error: string }>("/", async (req, res) => {
    try {
      const ambulances = await prisma.ambulance.findMany({
        where: {
          deletedAt: null,
          devices: {
            some: {}
          }
        },
        select: {
          ambulanceNumber: true,
          devices: {
            select: {
              username: true,
              password: true,
              imei: true
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      const response: AmbulanceResponse[] = ambulances.map((ambulance) => ({
        ambulanceNumber: ambulance.ambulanceNumber,
        imei: ambulance.devices[0]?.imei ?? null,
        username: ambulance.devices[0]?.username ?? null,
        password: ambulance.devices[0]?.password ?? null
      }));

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      await prisma.$disconnect();
    }
  }
);

export default router;
