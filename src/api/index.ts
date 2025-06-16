import express from 'express';

import categories from './master/category/categories';
import ambulances from './master/ambulance/ambulances';
import MessageResponse from '../interfaces/MessageResponse';
import bulkImportCategories from './master/category/bulkImport';

const router = express.Router();

router.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'V1 API',
  });
});

router.use('/master/categories', categories);
router.use('/master/ambulance', ambulances);
router.use('/master/category/import', bulkImportCategories);

export default router;
