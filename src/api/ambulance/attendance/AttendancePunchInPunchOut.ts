import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', '..', 'uploads', 'attendance');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const testFile = path.join(uploadDir, `perm-test-${Date.now()}.txt`);
  fs.writeFileSync(testFile, 'Permission test');
  fs.unlinkSync(testFile);
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
  deviceMode: any;
  date: string;
  responseStatus: 'Success' | 'Failure';
}

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({ message: `File upload failed: ${err.message}` });
      }
      
      const body = req.body as AttendanceInsertBody;
      const { employeeId, ambulanceId, shiftType, punchTime, punchLocation, status, deviceMode, date, responseStatus } = body;
      
      let imageCapture: string | undefined;
      if (req.file) {
        imageCapture = `${req.protocol}://${req.get('host')}/api/v1/uploads/${req.file.filename}`;
      }

      await prisma.attendance.create({
        data: {
          employeeId: Number(employeeId),
          ambulanceId: ambulanceId ? Number(ambulanceId) : undefined,
          shiftType,
          punchTime,
          punchLocation,
          status,
          deviceMode,
          date,
          imageCapture,
          responseStatus
        },
      });

      return res.status(201).json({ message: 'Attendance record created successfully' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(500).json({ message: `Failed to create attendance record: ${errorMessage}` });
    } finally {
      await prisma.$disconnect();
    }
  });
});

export default router;