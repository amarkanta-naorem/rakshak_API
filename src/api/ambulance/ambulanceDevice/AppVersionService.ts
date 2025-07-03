import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

router.get('/:ambulanceDeviceId/app/:currentAppVersion', async (req, res) => {
  const { ambulanceDeviceId, currentAppVersion } = req.params;

  try {
    const deviceId = parseInt(ambulanceDeviceId);

    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid ambulanceDeviceId' });
    }

    const device = await prisma.ambulanceDevice.findUnique({
      where: {
        id: deviceId,
      },
    });

    if (!device) {
      return res.status(404).json({ error: 'Ambulance device not found' });
    }

    let updatedDevice = device;

    if (device.latestAppVersion === currentAppVersion) {
      updatedDevice = await prisma.ambulanceDevice.update({
        where: { id: deviceId },
        data: {
          currentAppVersion: currentAppVersion,
          updatedAt: new Date(),
        },
      });
    }

    return res.json({
      ambulanceDeviceId: updatedDevice.id,
      currentAppVersion: updatedDevice.currentAppVersion,
      latestAppVersion: updatedDevice.latestAppVersion,
    });

  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;
