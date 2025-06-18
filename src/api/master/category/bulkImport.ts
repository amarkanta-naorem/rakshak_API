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
        const rawRows: CategoryRow[] = xlsx.utils.sheet_to_json(sheet, {
            header: ['Name', 'Description'],
            range: 1,
        });

        const cleanedRows = rawRows.map((row) => ({
            Name: typeof row.Name === 'string' ? row.Name.trim() : '',
            Description: typeof row.Description === 'string' ? row.Description.trim() : undefined,
        })) as CategoryRow[];

        const validatedRows = cleanedRows.filter(row => {
            return row.Name && typeof row.Name === 'string' && (!row.Description || typeof row.Description === 'string');
        });

        if (validatedRows.length === 0) {
            return res.status(400).json({ message: 'Excel file is empty or contains no valid rows' });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
        };

        const fileNamesSet = new Set<string>();
        const duplicateInFile = new Set<string>();

        for (const row of validatedRows) {
            const normalized = row.Name.toLowerCase();
            if (fileNamesSet.has(normalized)) {
                duplicateInFile.add(normalized);
            } else {
                fileNamesSet.add(normalized);
            }
        }

        const existingCategories = await prisma.category.findMany({
            where: {
                name: {
                    in: Array.from(fileNamesSet),
                    mode: 'insensitive',
                },
            },
            select: { name: true },
        });

        const existingNamesSet = new Set(existingCategories.map(cat => cat.name.toLowerCase()));

        await prisma.$transaction(async (tx) => {
            for (const [index, row] of validatedRows.entries()) {
                const rowNum = index + 2;
                const { isValid, errors } = validateRow(row);
                const normalized = row.Name.toLowerCase();

                if (!isValid) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: ${errors.join(', ')}`);
                    continue;
                }

                if (duplicateInFile.has(normalized)) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Duplicate name '${row.Name}' found in file`);
                    continue;
                }

                if (existingNamesSet.has(normalized)) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Category '${row.Name}' already exists`);
                    continue;
                }

                try {
                    await tx.category.create({
                        data: {
                            name: row.Name,
                            description: row.Description ?? null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        } as Prisma.CategoryCreateInput,
                    });
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push(`Row ${rowNum}: Failed to save category - ${error instanceof Error ? error.message : 'Unknown error'}`);
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