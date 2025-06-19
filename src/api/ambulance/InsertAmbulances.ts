import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, Ambulance } from '@prisma/client';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const upload = multer();

interface AmbulanceRequestBody {
  type?: string;
  callSign?: string;
  ambulanceNumber?: string;
  zone?: string;
  location?: string;
  mdtMobileNumber?: string;
}

function validateRequestBody(req: Request<{}, {}, AmbulanceRequestBody>, res: Response, next: NextFunction): Response | void {
  const { type, callSign, ambulanceNumber, zone, location, mdtMobileNumber } = req.body;

  if (!type || type.trim() === '') {
    return res.status(400).json({ error: 'Ambulance type is required.' });
  }

  if (!callSign || callSign.trim() === '') {
    return res.status(400).json({ error: 'Call Sign is required.' });
  }

  if (!ambulanceNumber || ambulanceNumber.trim() === '') {
    return res.status(400).json({ error: 'Ambulance Number is required.' });
  }

  if (!zone || zone.trim() === '') {
    return res.status(400).json({ error: 'Zone is required.' });
  }

  if (!location || location.trim() === '') {
    return res.status(400).json({ error: 'Location is required.' });
  }

  if (!mdtMobileNumber || mdtMobileNumber.trim() === '') {
    return res.status(400).json({ error: 'MDT Mobile Number is required.' });
  }

  next();
}

router.post('/', upload.none(), validateRequestBody,async (req: Request<{}, {}, AmbulanceRequestBody>, res: Response) => {
    try {
      const { type, callSign, ambulanceNumber, zone, location, mdtMobileNumber } = req.body;

      const [existingCallSign, existingAmbulanceNumber, existingMdtMobileNumber] = await Promise.all([
        prisma.ambulance.findUnique({ where: { callSign } }),
        prisma.ambulance.findUnique({ where: { ambulanceNumber } }),
        prisma.ambulance.findUnique({ where: { mdtMobileNumber } }),
      ]);

      if (existingCallSign) {
        return res.status(409).json({ error: 'Call Sign already exists.' });
      }

      if (existingAmbulanceNumber) {
        return res.status(409).json({ error: 'Ambulance Number already exists.' });
      }

      if (existingMdtMobileNumber) {
        return res.status(409).json({ error: 'MDT Mobile Number already exists.' });
      }

      const newAmbulance: Ambulance = await prisma.ambulance.create({
        data: { type, callSign, ambulanceNumber, zone, location, mdtMobileNumber },
      });

      const { createdAt, updatedAt, deletedAt, ...filteredResponse } = newAmbulance;

      res.status(201).json(filteredResponse);
    } catch (error: any) {
      console.error('Error creating ambulance:', error);
      res.status(500).json({ error: 'Failed to create ambulance', details: error.message });
    }
  }
);

export default router;
