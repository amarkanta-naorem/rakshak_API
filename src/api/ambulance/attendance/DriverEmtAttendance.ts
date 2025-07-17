import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', '..', 'uploads', 'attendance');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.error(`FATAL: Could not initialize upload directory at ${uploadDir}`, err);
  process.exit(1);
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG/PNG/JPG images allowed'));
  },
  limits: { fileSize: 1024 * 1024 * 1024 }
});

const router = express.Router();
const prisma = new PrismaClient();

interface AttendanceInsertBody {
  employeeId: number;
  ambulanceId?: number;
  shiftType: string;
  punchTime?: string;
  punchLocation?: string;
  status: string;
  punchOutType: string;
  deviceMode: any;
  date: string;
  responseStatus: 'Success' | 'Failure';
}

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({ message: `File upload failed: ${err.message}`, data: [] });
      }
      
      const body = req.body as AttendanceInsertBody;
      const { employeeId, ambulanceId, shiftType, punchTime, punchLocation, status, deviceMode, date, responseStatus } = body;

      if (!employeeId) {
        return res.status(400).json({ message: 'Employee ID is required.', data: [] });
      }
      if (!status) {
        return res.status(400).json({ message: 'Status (PunchIn or PunchOut) is required.', data: [] });
      }
      if (!date) {
        return res.status(400).json({ message: 'Date is required.', data: [] });
      }

      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          employeeId: Number(employeeId),
          date: date,
          ambulanceId: { not: ambulanceId ? Number(ambulanceId) : undefined },
          status: { in: ['PunchIn', 'PunchOut'] }
        }
      });

      if (existingAttendance) {
        return res.status(400).json({
          message: 'Employee cannot mark attendance for multiple ambulances on the same day.',
          data: []
        });
      }

      let imageCapture: string | undefined;
      if (req.file) {
        imageCapture = `${req.protocol}://${req.get('host')}/api/v1/uploads/${req.file.filename}`;
      }

      const currentEmployee = await prisma.employee.findUnique({
        where: { id: Number(employeeId) },
        select: { categoryId: true }
      });

      if (!currentEmployee) {
        return res.status(404).json({ message: 'Employee not found.', data: [] });
      }

      let responseRecords = [];

      if (status === 'PunchIn' && ambulanceId) {
        const employeeLatestRecords = await prisma.attendance.groupBy({
          by: ['employeeId'],
          _max: {
            punchTime: true
          },
          where: {
            ambulanceId: Number(ambulanceId),
            date: date
          }
        }).then(async (grouped) => {
          const latestRecords = await Promise.all(grouped.map(async (group) => {
            return prisma.attendance.findFirst({
              where: {
                employeeId: group.employeeId,
                punchTime: group._max.punchTime,
                ambulanceId: Number(ambulanceId),
                date: date
              }
            });
          }));
          return latestRecords.filter(r => r !== null);
        });

        const existingAttendance = employeeLatestRecords.find(record => 
          record?.status === 'PunchIn' && 
          record.punchOutType === 'manual' && 
          record.employeeId !== Number(employeeId) && 
          !employeeLatestRecords.some(r => 
            r?.employeeId === record.employeeId && 
            r.punchTime != null && record.punchTime != null && 
            new Date(r.punchTime) > new Date(record.punchTime) && 
            r.status === 'PunchOut' && 
            r.punchOutType === 'manual'
          )
        );

        if (existingAttendance) {
          const autoPunchOut = await prisma.attendance.create({
            data: {
              employeeId: existingAttendance.employeeId,
              ambulanceId: existingAttendance.ambulanceId,
              shiftType: existingAttendance.shiftType,
              punchTime: new Date().toISOString(),
              punchLocation: existingAttendance.punchLocation,
              status: 'PunchOut',
              deviceMode: existingAttendance.deviceMode,
              date: existingAttendance.date,
              imageCapture: existingAttendance.imageCapture,
              responseStatus: 'Success',
              punchOutType: 'auto'
            }
          });
          responseRecords.push(autoPunchOut);
        }
      }

      const newAttendance = await prisma.attendance.create({
        data: {
          employeeId: Number(employeeId),
          ambulanceId: ambulanceId ? Number(ambulanceId) : undefined,
          shiftType,
          punchTime: punchTime || new Date().toISOString(),
          punchLocation,
          status,
          deviceMode,
          date,
          imageCapture,
          responseStatus: responseStatus || 'Success',
          punchOutType: 'manual'
        }
      });

      responseRecords.unshift(newAttendance);

      const employee = await prisma.employee.findUnique({
        where: { id: Number(employeeId) },
        select: { name: true }
      });

      const employeeName = employee?.name || 'Employee';

      let message = `${employeeName} has successfully recorded manual attendance.`;
      if (responseRecords.length > 1) {
        const autoPunchOutEmployee = await prisma.employee.findUnique({
          where: { id: responseRecords[1].employeeId },
          select: { name: true }
        });
        const autoPunchOutName = autoPunchOutEmployee?.name || 'Another employee';
        message = `${employeeName} has successfully recorded manual attendance, and ${autoPunchOutName} has been automatically punched out.`;
      }

      return res.status(201).json({
        message,
        data: responseRecords
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ message: `Failed to create attendance record: ${errorMessage}`, data: [] });
    } finally {
      await prisma.$disconnect();
    }
  });
});

export default router;