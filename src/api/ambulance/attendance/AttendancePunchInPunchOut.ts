import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({ storage: multer.memoryStorage() });

interface AttendanceInsertBody {
  employeeId: number;
  ambulanceId?: number;
  rosterId?: number;
  shiftType: string;
  punchTime?: string; 
  punchLocation?: string;
  status: 'Present' | 'Late' | 'Absent';
  date: string; 
}

router.post('/', upload.none(), async (req: Request<{}, {}, AttendanceInsertBody>, res: Response, next: NextFunction) => {
    try {
      const { employeeId, ambulanceId, rosterId, shiftType, punchTime, punchLocation, status, date } = req.body;

      await prisma.attendance.create({
        data: {
          employeeId: Number(employeeId),
          ambulanceId: ambulanceId ? Number(ambulanceId) : undefined,
          rosterId: rosterId ? Number(rosterId) : undefined,
          shiftType: shiftType,
          punchTime: punchTime,
          punchLocation: punchLocation,
          status,
          date: date,
        },
      });

      return res.status(201).json({ message: 'Attendance record created successfully' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(500).json({ message: `Failed to create attendance record: ${errorMessage}` });
    } finally {
      await prisma.$disconnect();
    }
  }
);

export default router;