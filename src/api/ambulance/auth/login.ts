import multer from 'multer';
import express from 'express';
import { PrismaClient } from '@prisma/client';

interface Ambulance {
  id: number;
  type: string | null;
  callSign: string | null;
  ambulanceNumber: string | null;
  zone: string | null;
  location: string | null;
  mdtMobileNumber: string | null;
}

interface AmbulanceDevice {
  id: number;
  imei: string;
  username: string;
  ambulance?: Ambulance | null;
}

interface LoginRequestBody {
  ambulanceNumber: string;
  password: string;
}

interface LoginResponse {
  status: number;
  message: string;
  ambulanceDevice: {
    id: number;
    imei: string;
    username: string;
    ambulance: Ambulance | null;
  };
}

interface MessageResponse {
  data?: AmbulanceDevice[] | LoginResponse;
  error?: string;
}

const prisma = new PrismaClient();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get<{}, MessageResponse>('/', async (req, res) => {
  try {
    const ambulanceDevices = await prisma.ambulanceDevice.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        imei: true,
        username: true,
        ambulance: {
          select: {
            id: true,
            type: true,
            callSign: true,
            ambulanceNumber: true,
            zone: true,
            location: true,
            mdtMobileNumber: true,
          },
        },
      },
    });

    res.json({ data: ambulanceDevices });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred while fetching ambulance devices' });
  } finally {
    await prisma.$disconnect();
  }
});

router.post<{}, MessageResponse, LoginRequestBody>('/', upload.none(), async (req, res) => {
  const { ambulanceNumber, password } = req.body;

  if (!ambulanceNumber) {
    return res.status(400).json({ error: 'Ambulance number are required' });
  }
  
  if (!password) {
    return res.status(400).json({ error: 'Password are required' });
  }

  try {
    const ambulanceDevice = await prisma.ambulanceDevice.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { username: ambulanceNumber },
          { ambulance: { ambulanceNumber: ambulanceNumber } },
        ],
      },
      select: {
        id: true,
        imei: true,
        username: true,
        password: true,
        ambulance: {
          select: {
            id: true,
            type: true,
            callSign: true,
            ambulanceNumber: true,
            zone: true,
            location: true,
            mdtMobileNumber: true,
          },
        },
      },
    });

    if (!ambulanceDevice) {
      return res.status(401).json({ error: 'Invalid ambulance number or password' });
    }

    if (ambulanceDevice.password !== password) {
      return res.status(401).json({ error: 'Invalid ambulance number or password' });
    }

    const response: LoginResponse = {
      status: 200,
      message: 'Login successful',
      ambulanceDevice: {
        id: ambulanceDevice.id,
        imei: ambulanceDevice.imei,
        username: ambulanceDevice.username,
        ambulance: ambulanceDevice.ambulance,
      }
    };

    res.status(200).json({ data: response });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred during login' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;