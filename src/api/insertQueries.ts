import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const router = Router();

// Read your SQL insert statements (or you can hardcode them directly here)
const sql = fs.readFileSync('src\api\insert.sql', 'utf-8');

router.post('/', async (req, res) => {
  if (req.headers['x-import-token'] !== process.env.IMPORT_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  try {
    await prisma.$executeRawUnsafe(sql);
    res.send('SQL import successful');
  } catch (error) {
    console.error(error);
    res.status(500).send('SQL import failed');
  }
});

export default router;
