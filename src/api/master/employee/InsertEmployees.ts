import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const upload = multer();

interface EmployeeRequestBody {
    employeeSystemId?: string;
    name?: string;
    phoneNumber?: string;
    categoryName?: string;
    awsFaceId?: string | null;
    faceImageData?: string | null;
}

function validateEmployeeRequest(req: Request<{}, {}, EmployeeRequestBody>, res: Response, next: NextFunction): Response | void {
    const { employeeSystemId, name, phoneNumber, categoryName, faceImageData } = req.body;

    if (!employeeSystemId || employeeSystemId.trim() === '') {
        return res.status(400).json({ error: 'Employee ID is required.' });
    }

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Employee name is required.' });
    }

    if (!phoneNumber || phoneNumber.trim() === '') {
        return res.status(400).json({ error: 'Phone number is required.' });
    }

    if (!categoryName || categoryName.trim() === '') {
        return res.status(400).json({ error: 'Employee role is required.' });
    }

    if (faceImageData && Buffer.from(faceImageData, 'base64').length > 10 * 1024 * 1024) { // 10MB limit
        return res.status(400).json({ error: 'Image data too large.' });
    }

    next();
}

router.post('/', upload.none(), validateEmployeeRequest, async (req: Request<{}, {}, EmployeeRequestBody>, res: Response) => {
    try {
        const { employeeSystemId, name, phoneNumber, categoryName, awsFaceId, faceImageData } = req.body;

        const existingPhoneEmployee = await prisma.employee.findUnique({
            where: { phoneNumber: phoneNumber! },
        });

        if (existingPhoneEmployee) {
            return res.status(409).json({ error: 'Employee phone number already exists.' });
        }

        const existingSystemIdEmployee = await prisma.employee.findFirst({
            where: { employeeSystemId },
        });

        if (existingSystemIdEmployee) {
            return res.status(409).json({ error: 'Employee ID already exists.' });
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

        const newEmployee = await prisma.employee.create({
            data: {
                employeeSystemId: employeeSystemId!,
                name: name!,
                phoneNumber: phoneNumber!,
                categoryId: category.id,
                awsFaceId: awsFaceId || null,
                faceImageData: faceImageData!,
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
}
);

export default router;
