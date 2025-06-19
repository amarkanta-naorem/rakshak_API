import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, AmbulanceDevice } from '@prisma/client';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const upload = multer();

interface AmbulanceDeviceRequestBody {
  ambulanceId?: string;
  imei?: string;
  username?: string;
}

function validateAmbulanceDeviceRequest(req: Request<{}, {}, AmbulanceDeviceRequestBody>, res: Response, next: NextFunction): Response | void {
  const { ambulanceId, imei, username } = req.body;

  if (!ambulanceId || ambulanceId.trim() === '' || isNaN(Number(ambulanceId))) {
    return res.status(400).json({ error: 'Valid Ambulance ID is required.' });
  }

  if (!imei || imei.trim() === '') {
    return res.status(400).json({ error: 'IMEI is required.' });
  }

  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required.' });
  }

  next();
}

router.post('/', upload.none(), validateAmbulanceDeviceRequest, async (req: Request<{}, {}, AmbulanceDeviceRequestBody>, res: Response) => {
    try {
      const { ambulanceId, imei, username } = req.body;
      const parsedAmbulanceId = Number(ambulanceId);

      const imeiValue = imei!;
      const usernameValue = username!;

      const ambulance = await prisma.ambulance.findUnique({
        where: { id: parsedAmbulanceId },
      });

      if (!ambulance || !ambulance.ambulanceNumber) {
        return res.status(404).json({ error: 'Ambulance not found or has no ambulanceNumber.' });
      }

      const [existingImei, existingUsername] = await Promise.all([
        prisma.ambulanceDevice.findUnique({ where: { imei: imeiValue } }),
        prisma.ambulanceDevice.findUnique({ where: { username: usernameValue } }),
      ]);

      if (existingImei) {
        return res.status(409).json({ error: 'IMEI already exists.' });
      }

      if (existingUsername) {
        return res.status(409).json({ error: 'Username already exists.' });
      }

      const imeiLast4 = imeiValue.slice(-4);
      const ambulanceNumberLast4 = ambulance.ambulanceNumber.slice(-4);
      const generatedPassword = `${imeiLast4}@${ambulanceNumberLast4}`;

      const newDevice: AmbulanceDevice = await prisma.ambulanceDevice.create({
        data: {
          ambulanceId: parsedAmbulanceId,
          imei: imeiValue,
          username: usernameValue,
          password: generatedPassword,
        },
      });

      const { createdAt, updatedAt, deletedAt, ...filtered } = newDevice;

      res.status(201).json(filtered);
    } catch (error: any) {
      console.error('Error inserting ambulance device:', error);
      res.status(500).json({ error: 'Failed to insert ambulance device', details: error.message });
    }
  }
);

export default router;
