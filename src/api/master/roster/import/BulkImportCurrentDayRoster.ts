import express, { RequestHandler } from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import MessageResponse from '../../../../interfaces/MessageResponse';

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed') as any, false);
    }
  },
  limits: { fileSize: 1024 * 1024 * 1024 },
});

interface RosterRow {
  'CALL SIGN': string;
  'ZONE': string;
  'AMBULANCE NUMBER': string;
  'LOCATION': string;
  'MDT MOBILE NUMBER': string;
  'MANAGER NAME': string;
  'MANAGER PHONE NUMBER': string;
  'EMT NAME': string;
  'EMT PHONE NUMBER': string;
  'DRIVER NAME': string;
  'DRIVER PHONE NUMBER': string;
}

interface RosterRequestBody {
  rosterDate: string;
  shift: string;
}

const cleanGeneralString = (val: any): string => {
  if (val === null || val === undefined || val === '') return '';
  return String(val).trim().replace(/\s+/g, ' ');
};

const cleanPhoneString = (val: any): string | null => {
  if (val === null || val === undefined || val === '') return null;
  let str = String(val).trim();
  
  if (str.endsWith('.0') && !isNaN(Number(str))) {
    str = str.slice(0, -2);
  }
  
  str = str.replace(/[^0-9]/g, '');
  return str || null;
};

router.post<{}, MessageResponse, RosterRequestBody>('/', upload.single('file'), (async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!req.body.rosterDate || !req.body.shift) {
      return res.status(400).json({ message: 'rosterDate and shift are required in request body' });
    }

    const rosterDate = req.body.rosterDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rosterDate)) {
      return res.status(400).json({ message: 'Invalid rosterDate format. Use YYYY-MM-DD' });
    }

    const shift = req.body.shift;
    if (!['Day Shift', 'Night Shift'].includes(shift)) {
      return res.status(400).json({ message: 'Invalid shift. Must be "Day Shift" or "Night Shift"' });
    }

    const workbook = xlsx.read(req.file.buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
    });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawRows: RosterRow[] = xlsx.utils.sheet_to_json(sheet, {
      defval: '',
      raw: true,
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const validRows = [];
    const requiredCategories = ['Manager', 'EMT', 'Driver'];
    const categories = await prisma.category.findMany({
      where: { name: { in: requiredCategories } },
    });

    if (categories.length !== requiredCategories.length) {
      const missing = requiredCategories.filter(
        name => !categories.some(c => c.name === name)
      );
      return res.status(400).json({ message: `Missing required categories: ${missing.join(', ')}` });
    }

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      const rowNum = index + 2;

      try {
        const callSign = cleanGeneralString(row['CALL SIGN']);
        const zone = cleanGeneralString(row['ZONE']);
        const ambulanceNumber = cleanGeneralString(row['AMBULANCE NUMBER']);
        const location = cleanGeneralString(row['LOCATION']);
        const mdtMobileNumber = cleanPhoneString(row['MDT MOBILE NUMBER']);
        const managerName = cleanGeneralString(row['MANAGER NAME']);
        const managerPhone = cleanPhoneString(row['MANAGER PHONE NUMBER']);
        const emtName = cleanGeneralString(row['EMT NAME']);
        const emtPhone = cleanPhoneString(row['EMT PHONE NUMBER']);
        const driverName = cleanGeneralString(row['DRIVER NAME']);
        const driverPhone = cleanPhoneString(row['DRIVER PHONE NUMBER']);

        const isEmptyRow = !callSign && !zone && !ambulanceNumber && 
                          !location && !mdtMobileNumber &&
                          !managerName && !managerPhone &&
                          !emtName && !emtPhone &&
                          !driverName && !driverPhone;

        if (isEmptyRow) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Skipped empty row`);
          continue;
        }

        const missingFields = [];
        if (!callSign) missingFields.push('Call Sign');
        if (!zone) missingFields.push('Zone');
        if (!ambulanceNumber) missingFields.push('Ambulance Number');
        if (!location) missingFields.push('Location');
        if (!managerName) missingFields.push('Manager Name');
        if (!managerPhone) missingFields.push('Manager Phone');
        if (!emtName) missingFields.push('EMT Name');
        if (!emtPhone) missingFields.push('EMT Phone');
        if (!driverName) missingFields.push('Driver Name');
        if (!driverPhone) missingFields.push('Driver Phone');

        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        const ambulance = await prisma.ambulance.findFirst({
          where: {
            callSign: { equals: callSign },
            ambulanceNumber: { equals: ambulanceNumber },
            mdtMobileNumber: mdtMobileNumber ?? null,
          },
        });

        if (!ambulance) {
          throw new Error(`Ambulance not found: ${callSign}, ${zone}, ${ambulanceNumber}, ${location}, ${mdtMobileNumber}`);
        }

        const manager = await prisma.employee.findFirst({
          where: {
            name: { equals: managerName },
            phoneNumber: managerPhone,
            category: { name: 'Manager' },
          },
        });

        if (!manager) {
          throw new Error(`Manager not found: ${managerName}, ${managerPhone}`);
        }

        const emt = await prisma.employee.findFirst({
          where: {
            name: { equals: emtName },
            phoneNumber: emtPhone,
            category: { name: 'EMT' },
          },
        });

        if (!emt) {
          throw new Error(`EMT not found: ${emtName}, ${emtPhone}`);
        }

        const driver = await prisma.employee.findFirst({
          where: {
            name: { equals: driverName },
            phoneNumber: driverPhone,
            category: { name: 'Driver' },
          },
        });

        if (!driver) {
          throw new Error(`Driver not found: ${driverName}, ${driverPhone}`);
        }

        const existingRoster = await prisma.roster.findFirst({
          where: {
            rosterDate: new Date(rosterDate),
            shift,
            ambulanceId: ambulance.id,
          },
        });

        if (existingRoster) {
          throw new Error(`Roster already exists for ambulance ${callSign} on ${rosterDate} (${shift})`);
        }

        validRows.push({
          rosterDate: new Date(rosterDate),
          shift,
          ambulanceId: ambulance.id,
          managerId: manager.id,
          emtId: emt.id,
          driverId: driver.id,
        });

      } catch (error: any) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Row ${rowNum}: ${errorMessage}`);
      }
    }

    if (validRows.length > 0) {
      await prisma.roster.createMany({
        data: validRows,
        skipDuplicates: true,
      });
      results.success = validRows.length;
    }

    return res.status(200).json({
      message: `Successfully imported ${results.success} roster record(s)`,
      ...(results.errors.length > 0 && {
        warning: `${results.failed} records failed to import`,
        errors: results.errors,
      }),
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ message: `Import failed: ${errorMessage}` });
  } finally {
    await prisma.$disconnect();
  }
}) as RequestHandler);

export default router;