import app from './app';
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()
const port = process.env.PORT || 5001;

dotenv.config();

const startServer = async () => {
    prisma
    .$connect()
    .then(() => {
        console.log("Database connected...");
        return prisma.$executeRaw`SELECT 1`;
    })
    .then(() => {
        console.log("Database is ready...");
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((error: any) => {
        console.error("Error connecting to the database:", error);
        process.exit(1);
    });
}

startServer();