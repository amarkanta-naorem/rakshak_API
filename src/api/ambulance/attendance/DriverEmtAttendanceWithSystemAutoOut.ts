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

function formatDateToMySQLStyle(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

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
          status: 'PunchIn',
          punchOutType: 'manual',
          date: date
        },
        include: {
          employee: {
            select: { categoryId: true, name: true, employeeSystemId: true }
          }
        }
      });

      let responseRecords = [];

      // Handle case: Same employee PunchIn without PunchOut, now PunchOut from different ambulance
      if (existingAttendance && status === 'PunchOut' && ambulanceId && existingAttendance.ambulanceId !== Number(ambulanceId)) {
        const autoPunchOutTime = new Date();
        autoPunchOutTime.setMinutes(autoPunchOutTime.getMinutes() - 1);
        const autoPunchOut = await prisma.attendance.create({
          data: {
            employeeId: existingAttendance.employeeId,
            ambulanceId: existingAttendance.ambulanceId,
            shiftType: existingAttendance.shiftType,
            punchTime: formatDateToMySQLStyle(autoPunchOutTime),
            punchLocation: existingAttendance.punchLocation,
            status: 'PunchOut',
            deviceMode: existingAttendance.deviceMode,
            date: existingAttendance.date,
            imageCapture: existingAttendance.imageCapture,
            responseStatus: 'Success',
            punchOutType: 'auto'
          },
          include: {
            employee: { select: { name: true, employeeSystemId: true } },
            ambulance: { select: { ambulanceNumber: true } }
          }
        });
        // responseRecords.push({
        //   ...autoPunchOut,
        //   employeeName: autoPunchOut.employee.name,
        //   ambulanceNumber: autoPunchOut.ambulance?.ambulanceNumber || null
        // });
        responseRecords.push({
          id: autoPunchOut.id,
          employeeId: autoPunchOut.employeeId,
          employeeSystemId: autoPunchOut.employee.employeeSystemId,
          ambulanceId: autoPunchOut.ambulanceId,
          shiftType: autoPunchOut.shiftType,
          punchTime: autoPunchOut.punchTime,
          punchLocation: autoPunchOut.punchLocation,
          status: autoPunchOut.status,
          punchOutType: autoPunchOut.punchOutType,
          deviceMode: autoPunchOut.deviceMode,
          imageCapture: autoPunchOut.imageCapture,
          date: autoPunchOut.date,
          responseStatus: autoPunchOut.responseStatus,
          employeeName: autoPunchOut.employee.name,
          ambulanceNumber: autoPunchOut.ambulance?.ambulanceNumber || null
        });
      }

      // Handle case: Same employee PunchIn without PunchOut
      if (existingAttendance && status === 'PunchIn') {
        const autoPunchOutTime = new Date();
        autoPunchOutTime.setMinutes(autoPunchOutTime.getMinutes() - 1);
        const autoPunchOut = await prisma.attendance.create({
          data: {
            employeeId: existingAttendance.employeeId,
            ambulanceId: existingAttendance.ambulanceId,
            shiftType: existingAttendance.shiftType,
            punchTime: formatDateToMySQLStyle(autoPunchOutTime),
            punchLocation: existingAttendance.punchLocation,
            status: 'PunchOut',
            deviceMode: existingAttendance.deviceMode,
            date: existingAttendance.date,
            imageCapture: existingAttendance.imageCapture,
            responseStatus: 'Success',
            punchOutType: 'auto'
          },
          include: {
            employee: { select: { name: true, employeeSystemId: true } },
            ambulance: { select: { ambulanceNumber: true } }
          }
        });
        // responseRecords.push({
        //   ...autoPunchOut,
        //   employeeName: autoPunchOut.employee.name,
        //   ambulanceNumber: autoPunchOut.ambulance?.ambulanceNumber || null
        // });
        responseRecords.push({
          id: autoPunchOut.id,
          employeeId: autoPunchOut.employeeId,
          employeeSystemId: autoPunchOut.employee.employeeSystemId,
          ambulanceId: autoPunchOut.ambulanceId,
          shiftType: autoPunchOut.shiftType,
          punchTime: autoPunchOut.punchTime,
          punchLocation: autoPunchOut.punchLocation,
          status: autoPunchOut.status,
          punchOutType: autoPunchOut.punchOutType,
          deviceMode: autoPunchOut.deviceMode,
          imageCapture: autoPunchOut.imageCapture,
          date: autoPunchOut.date,
          responseStatus: autoPunchOut.responseStatus,
          employeeName: autoPunchOut.employee.name,
          ambulanceNumber: autoPunchOut.ambulance?.ambulanceNumber || null
        });
      }

      let imageCapture: string | undefined;
      if (req.file) {
        imageCapture = `${req.protocol}://${req.get('host')}/api/v1/uploads/${req.file.filename}`;
      }

      const currentEmployee = await prisma.employee.findUnique({
        where: { id: Number(employeeId) },
        select: { categoryId: true, name: true, employeeSystemId: true }
      });

      if (!currentEmployee) {
        return res.status(404).json({ message: 'Employee not found.', data: [] });
      }

      let currentAmbulanceNumber: string | undefined;
      if (ambulanceId) {
        const ambulance = await prisma.ambulance.findUnique({
          where: { id: Number(ambulanceId) },
          select: { ambulanceNumber: true }
        });
        currentAmbulanceNumber = ambulance && ambulance.ambulanceNumber ? ambulance.ambulanceNumber : undefined;
      }

      if (status === 'PunchIn' && ambulanceId) {
        const employeeLatestRecords = await prisma.attendance.groupBy({
          by: ['employeeId'],
          _max: {
            punchTime: true
          },
          where: {
            ambulanceId: Number(ambulanceId),
            status: 'PunchIn',
            punchOutType: 'manual'
          }
        }).then(async (grouped) => {
          const latestRecords = await Promise.all(grouped.map(async (group) => {
            return prisma.attendance.findFirst({
              where: {
                employeeId: group.employeeId,
                punchTime: group._max.punchTime,
                ambulanceId: Number(ambulanceId),
                status: 'PunchIn',
                punchOutType: 'manual'
              },
              include: {
                employee: {
                  select: { categoryId: true, name: true, employeeSystemId: true }
                },
                ambulance: {
                  select: { ambulanceNumber: true }
                }
              }
            });
          }));
          return latestRecords.filter(r => r !== null);
        });

        const existingAttendanceWithSameCategory = employeeLatestRecords.find(record => 
          record?.status === 'PunchIn' && 
          record.punchOutType === 'manual' && 
          record.employeeId !== Number(employeeId) && 
          record.employee?.categoryId === currentEmployee.categoryId
        );

        if (existingAttendanceWithSameCategory && existingAttendanceWithSameCategory.punchTime) {
          // Check if the employee already has an auto PunchOut for this date
          const hasRecentAutoPunchOut = await prisma.attendance.findFirst({
            where: {
              employeeId: existingAttendanceWithSameCategory.employeeId,
              ambulanceId: existingAttendanceWithSameCategory.ambulanceId,
              status: 'PunchOut',
              punchOutType: 'auto',
              date: existingAttendanceWithSameCategory.date,
              punchTime: {
                gte: existingAttendanceWithSameCategory.punchTime as string
              }
            }
          });

          if (!hasRecentAutoPunchOut) {
            const autoPunchOutTime = new Date();
            autoPunchOutTime.setMinutes(autoPunchOutTime.getMinutes() - 1);
            const autoPunchOut = await prisma.attendance.create({
              data: {
                employeeId: existingAttendanceWithSameCategory.employeeId,
                ambulanceId: existingAttendanceWithSameCategory.ambulanceId,
                shiftType: existingAttendanceWithSameCategory.shiftType,
                punchTime: formatDateToMySQLStyle(autoPunchOutTime),
                punchLocation: existingAttendanceWithSameCategory.punchLocation,
                status: 'PunchOut',
                deviceMode: existingAttendanceWithSameCategory.deviceMode,
                date: existingAttendanceWithSameCategory.date,
                imageCapture: existingAttendanceWithSameCategory.imageCapture,
                responseStatus: 'Success',
                punchOutType: 'auto'
              },
              include: {
                employee: { select: { name: true, employeeSystemId: true } },
                ambulance: { select: { ambulanceNumber: true } }
              }
            });
          // responseRecords.push({
          //   ...autoPunchOut,
          //   employeeName: autoPunchOut.employee.name,
          //   ambulanceNumber: autoPunchOut.ambulance?.ambulanceNumber || null
          // });

            responseRecords.push({
              id: autoPunchOut.id,
              employeeId: autoPunchOut.employeeId,
              employeeSystemId: autoPunchOut.employee.employeeSystemId,
              ambulanceId: autoPunchOut.ambulanceId,
              shiftType: autoPunchOut.shiftType,
              punchTime: autoPunchOut.punchTime,
              punchLocation: autoPunchOut.punchLocation,
              status: autoPunchOut.status,
              punchOutType: autoPunchOut.punchOutType,
              deviceMode: autoPunchOut.deviceMode,
              imageCapture: autoPunchOut.imageCapture,
              date: autoPunchOut.date,
              responseStatus: autoPunchOut.responseStatus,
              employeeName: autoPunchOut.employee.name,
              ambulanceNumber: autoPunchOut.ambulance?.ambulanceNumber || null
            });
          }
        }
      }

      const newAttendance = await prisma.attendance.create({
        data: {
          employeeId: Number(employeeId),
          ambulanceId: ambulanceId ? Number(ambulanceId) : undefined,
          shiftType,
          punchTime: punchTime || formatDateToMySQLStyle(new Date()),
          punchLocation,
          status,
          deviceMode,
          date,
          imageCapture,
          responseStatus: responseStatus || 'Success',
          punchOutType: 'manual'
        },
        include: {
          employee: { select: { name: true, employeeSystemId: true } },
          ambulance: { select: { ambulanceNumber: true } }
        }
      });

      // responseRecords.unshift({
      //   ...newAttendance,
      //   employeeName: newAttendance.employee.name,
      //   ambulanceNumber: newAttendance.ambulance?.ambulanceNumber || null
      // });

      responseRecords.unshift({
        id: newAttendance.id,
        employeeId: newAttendance.employeeId,
        employeeSystemId: newAttendance.employee.employeeSystemId,
        ambulanceId: newAttendance.ambulanceId,
        shiftType: newAttendance.shiftType,
        punchTime: newAttendance.punchTime,
        punchLocation: newAttendance.punchLocation,
        status: newAttendance.status,
        punchOutType: newAttendance.punchOutType,
        deviceMode: newAttendance.deviceMode,
        imageCapture: newAttendance.imageCapture,
        date: newAttendance.date,
        responseStatus: newAttendance.responseStatus,
        employeeName: newAttendance.employee.name,
        ambulanceNumber: newAttendance.ambulance?.ambulanceNumber || null
      });

      let message = `Employee has mark Manual Attendance Successfully`;
      if (responseRecords.length > 1) {
        message = `Employee has mark Manual Attendance Successfully and Existing employee has system automatic PunchOut`;
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