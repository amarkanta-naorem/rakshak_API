import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const router = express.Router();

const fuelUploadDir = process.env.FUEL_UPLOAD_DIR || path.join(__dirname, '..', '..', '..', 'uploads', 'fuel_invoice');

try {
    if (!fs.existsSync(fuelUploadDir)) {
        fs.mkdirSync(fuelUploadDir, { recursive: true });
    }
} catch (err) {
    console.error(`FATAL: Could not initialize fuel upload directory at ${fuelUploadDir}`, err);
    process.exit(1);
}

const storage = multer.diskStorage({
    destination: fuelUploadDir,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}${ext}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG and JPG files are allowed'));
        }
    },
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
    upload.single('invoice')(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({ message: `File upload failed: ${err.message}` });
            }

            const { ambulanceId, fuelType, softwareReadingLitres, softwareReadingUnitPrice, softwareReadingTotalAmount, manualReadingLitres, manualReadingUnitPrice, manualReadingTotalAmount, fuelDateTime, location, latitude, longitude } = req.body;

            if (!req.file) {
                return res.status(400).json({ message: 'Invoice file is required.' });
            }
            if (!ambulanceId) {
                return res.status(400).json({ message: 'Ambulance ID is required.' });
            }
            if (!fuelType) {
                return res.status(400).json({ message: 'Fuel Type is required.' });
            }
            if (!softwareReadingLitres) {
                return res.status(400).json({ message: 'Software Reading Quantity is required.' });
            }
            if (!softwareReadingUnitPrice) {
                return res.status(400).json({ message: 'Software Reading Price Per Litre is required.' });
            }
            if (!softwareReadingTotalAmount) {
                return res.status(400).json({ message: 'Software Reading Total Amount is required.' });
            }
            if (!manualReadingLitres) {
                return res.status(400).json({ message: 'Manual Reading Quantity is required.' });
            }
            if (!manualReadingUnitPrice) {
                return res.status(400).json({ message: 'Manual Reading Price Per Litre is required.' });
            }
            if (!manualReadingTotalAmount) {
                return res.status(400).json({ message: 'Manual Reading Total Amount is required.' });
            }
            if (!fuelDateTime) {
                return res.status(400).json({ message: 'Fuel DateTime is required.' });
            }
            if (!location) {
                return res.status(400).json({ message: 'Location is required.' });
            }
            if (!latitude) {
                return res.status(400).json({ message: 'Latitude is required.' });
            }
            if (!longitude) {
                return res.status(400).json({ message: 'Longitude is required.' });
            }

            const ambulanceExists = await prisma.ambulance.findUnique({
                where: { id: Number(ambulanceId) },
            });

            if (!ambulanceExists) {
                return res.status(404).json({ message: 'Ambulance with the provided ID does not exist.' });
            }

            const invoiceFileUrl = `${req.protocol}://${req.get('host')}/api/v1/uploads/fuel_invoice/${req.file.filename}`;

            await prisma.ambulanceFuelLog.create({
                data: {
                    ambulanceId: Number(ambulanceId),
                    invoiceFileUrl,
                    fuelType,
                    softwareReadingLitres,
                    softwareReadingUnitPrice,
                    softwareReadingTotalAmount,
                    manualReadingLitres,
                    manualReadingUnitPrice,
                    manualReadingTotalAmount,
                    fuelDateTime,
                    location,
                    latitude,
                    longitude,
                },
            });

            return res.status(201).json({ message: 'Fuel log created successfully.' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return res.status(500).json({ message: `Failed to create fuel log: ${errorMessage}` });
        } finally {
            await prisma.$disconnect();
        }
    });
});

export default router;
