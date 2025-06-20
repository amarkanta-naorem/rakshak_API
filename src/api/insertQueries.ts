import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const router = Router();

// Safely resolve path to insert.sql file
const sqlFilePath = path.join(__dirname, '../../script/insert.sql'); // adjust based on your project layout
const sql = fs.readFileSync(sqlFilePath, 'utf-8');

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
