import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';

import * as middlewares from './middlewares';
import api from './api';
import MessageResponse from './interfaces/MessageResponse';
import path from 'path';

require('dotenv').config();

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
      const allowedOrigins = ['http://localhost:3000', 'http://localhost:3535', 'http://203.115.101.51:3535', 'https://rrakshak.vercel.app'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
app.use(express.json());

const getUploadDir = () => {
  return process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads', 'attendance');
};

const uploadPath = getUploadDir();
app.use('/api/v1/uploads', express.static(uploadPath));
app.use('/api/v1/uploads/fuel_invoice', express.static(path.join(__dirname, '..', 'uploads', 'fuel_invoice')));


app.get<{}, MessageResponse>('/', (req, res) => {
  res.json({ message: 'API is working'});
});

app.use('/api/v1', api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
