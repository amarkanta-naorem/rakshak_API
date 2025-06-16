import express, { RequestHandler } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { Prisma, PrismaClient } from '@prisma/client';
import MessageResponse from '../../../interfaces/MessageResponse';

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

interface CategoryRow {
    Name: string;
    Description?: string;
}

const validateRow = (row: CategoryRow): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!row.Name || typeof row.Name !== 'string' || row.Name.length > 100) {
        errors.push('Name is required and must be a string with max length 100');
    }

    if (row.Description && typeof row.Description !== 'string') {
        errors.push('Description must be a string');
    }

    return { isValid: errors.length === 0, errors };
};

router.post<{}, MessageResponse>('/', upload.single('file'), (async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: CategoryRow[] = xlsx.utils.sheet_to_json(sheet, { 
            header: ['Name', 'Description'],
            range: 1
        });

        const validatedRows = rows.filter(row => {
            return typeof row.Name === 'string' && (!row.Description || typeof row.Description === 'string');
        }) as CategoryRow[];

        if (validatedRows.length === 0) {
            return res.status(400).json({ message: 'Excel file is empty or contains no valid rows' });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
        };

        await prisma.$transaction(async (tx) => {
            for (const [index, row] of validatedRows.entries()) {
                const { isValid, errors } = validateRow(row);

                if (!isValid) {
                    results.failed++;
                    results.errors.push(`Row ${index + 2}: ${errors.join(', ')}`);
                    continue;
                }

                try {
                    await tx.category.create({
                        data: {
                            name: row.Name.trim(),
                            description: row.Description?.trim() ?? null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        } as Prisma.CategoryCreateInput,
                    });
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push(`Row ${index + 2}: Failed to save category - ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        });

        let message = `Import completed: ${results.success} categories imported successfully`;
        if (results.failed > 0) {
            message += `, ${results.failed} failed. Errors: ${results.errors.join('; ')}`;
        }

        return res.status(results.failed > 0 ? 207 : 200).json({ message });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({ message: `Import failed: ${errorMessage}` });
    } finally {
        await prisma.$disconnect();
    }
}) as RequestHandler);

export default router;