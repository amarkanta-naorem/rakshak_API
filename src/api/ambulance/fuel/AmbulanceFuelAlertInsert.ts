import express, { Request, Response, NextFunction } from 'express';
import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const router = express.Router();
const prisma = new PrismaClient();

const dbConfig = {
    host: '203.115.101.54',
    port: 3306,
    user: 'ashutosh54',
    password: 'ashutosh54098',
    database: 'alert_management'
};

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.none(), async (req: Request, res: Response, next: NextFunction) => {
    let connection;
    try {
        const { ambulanceNumber, alertMessage, latitude, longitude } = req.body;

        if (!ambulanceNumber) {
            return res.status(400).json({ message: 'Ambulance number is required.' });
        }
        if (!alertMessage) {
            return res.status(400).json({ message: 'Alert Message is required.' });
        }
        if (!latitude) {
            return res.status(400).json({ message: 'Latitude is required.' });
        }
        if (!longitude) {
            return res.status(400).json({ message: 'Longitude is required.' });
        }

        const ambulance = await prisma.ambulance.findFirst({
            where: { ambulanceNumber: ambulanceNumber },
            select: { sysServiceId: true }
        });

        let sysServiceId = null;
        if (ambulance) {
            sysServiceId = ambulance.sysServiceId;
        }

        connection = await mysql.createConnection(dbConfig);

        const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const insertQuery = `INSERT INTO alert_bank (user_id, group_id, Username, alert_type, vehicleno, sys_service_id, speed, gps_latitude, gps_longitude, aws_msg_id, number, email, msg, remark, issue, created_at, sent_at, status, popup_status, email_status, sms_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await connection.execute(insertQuery, [833193, 59961, 'kuberasolution', 'Ambulance Fueling', ambulanceNumber, sysServiceId, '0', latitude, longitude, null, null, null, alertMessage, null, null, currentDateTime, currentDateTime, 0, 0, 1, 0]);

        return res.status(201).json({ message: 'Success' });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(400).json({ message: `Failed to create alert: ${errorMessage}` });
    } finally {
        if (connection) {
            await connection.end();
        }
        await prisma.$disconnect();
    }
});

export default router;