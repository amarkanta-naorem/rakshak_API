import multer from 'multer';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

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
  token: string;
  ambulanceDevice: {
    id: number;
    imei: string;
    username: string;
    ambulance: Ambulance | null;
  };
  roster?: {
    id: number;
    rosterDate: string;
    shift: string;
    ambulanceId: number | null;
    managerId: number | null;
    emtId: number | null;
    driverId: number | null;
  } | null;
}

interface MessageResponse {
  data?: AmbulanceDevice[] | LoginResponse;
  error?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'rakshak-auth-secret-key';
const TOKEN_EXPIRY = '24h';

const prisma = new PrismaClient();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

router.get<{}, MessageResponse>('/', authenticateToken, async (req, res) => {
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

  if (!ambulanceNumber || !password) {
    return res.status(400).json({ error: 'Ambulance number and password are required' });
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const roster = await prisma.roster.findFirst({
      where: {
        rosterDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        ambulanceId: ambulanceDevice.ambulance?.id,
      },
      select: {
        id: true,
        rosterDate: true,
        shift: true,
        ambulanceId: true,
        managerId: true,
        emtId: true,
        driverId: true,
      },
    });

    const token = jwt.sign(
      { id: ambulanceDevice.id, username: ambulanceDevice.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    const response: LoginResponse = {
      status: 200,
      message: 'Login successful',
      token,
      ambulanceDevice: {
        id: ambulanceDevice.id,
        imei: ambulanceDevice.imei,
        username: ambulanceDevice.username,
        ambulance: ambulanceDevice.ambulance,
      },
      roster: roster
        ? {
            id: roster.id,
            rosterDate: roster.rosterDate.toISOString().split('T')[0],
            shift: roster.shift,
            ambulanceId: roster.ambulanceId,
            managerId: roster.managerId,
            emtId: roster.emtId,
            driverId: roster.driverId,
          }
        : null,
    };

    res.status(200).json({ data: response });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred during login' });
  } finally {
    await prisma.$disconnect();
  }
});

export default router;