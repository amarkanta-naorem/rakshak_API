import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const upload = multer();

interface EmployeeRequestBody {
    name?: string;
    phoneNumber?: string;
    categoryName?: string;
    awsFaceId?: string | null;
    faceImageData?: string | null;
}

function validateEmployeeRequest(req: Request<{}, {}, EmployeeRequestBody>, res: Response, next: NextFunction): Response | void {
    const { name, phoneNumber, categoryName } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Employee name is required.' });
    }

    if (!phoneNumber || phoneNumber.trim() === '') {
        return res.status(400).json({ error: 'Phone number is required.' });
    }

    if (!categoryName || categoryName.trim() === '') {
        return res.status(400).json({ error: 'Employee role is required.' });
    }

    next();
}

router.post('/', upload.none(), validateEmployeeRequest, async (req: Request<{}, {}, EmployeeRequestBody>, res: Response) => {
    try {
        const { name, phoneNumber, categoryName, awsFaceId, faceImageData } = req.body;

        const existingEmployee = await prisma.employee.findUnique({
            where: { phoneNumber: phoneNumber! },
        });

        if (existingEmployee) {
            return res.status(409).json({ error: 'Employee phone number already exists.' });
        }

        const category = await prisma.category.findFirst({
            where: {
                name: {
                    equals: categoryName!,
                },
            },
        });

        if (!category) {
            return res.status(400).json({ error: `Category '${categoryName}' not found.` });
        }

        if (faceImageData && typeof faceImageData !== 'string') {
            return res.status(400).json({ error: 'Invalid face image data.' });
        }

        const newEmployee = await prisma.employee.create({
            data: {
                name: name!,
                phoneNumber: phoneNumber!,
                categoryId: category.id,
                awsFaceId: awsFaceId || null,
                faceImageData: faceImageData || null,
            },
            include: {
                category: true,
            },
        });

        const { createdAt, updatedAt, deletedAt, category: cat, categoryId, ...rest } = newEmployee;

        res.status(201).json({ ...rest, categoryName: cat?.name || null });
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to create employee.',
            details: error.message,
        });
    }
});

export default router;