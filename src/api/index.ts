import express from 'express';

import MessageResponse from '../interfaces/MessageResponse';

import categories from './master/category/categories';
import ambulances from './master/ambulance/ambulances';
import insertEmployees from './master/employee/InsertEmployees';
import bulkImportCategories from './master/category/import/bulkImport';
import bulkImportRoster from './master/roster/import/BulkImportCurrentDayRoster';

import ambulanceLogin from './ambulance/auth/login';
import allAmbulances from './ambulance/GetAllAmbulanceCredentials';
import insertAmbulances from './ambulance/InsertAmbulances';
import insertAmbulanceDevices from './ambulance/ambulanceDevice/InsertAmbulanceDevices';
import GetAmbulanceEmployeeDetails from './ambulance/GetAmbulanceEmployeeDetails';

import PunchInPunchOutAttendance from './ambulance/attendance/AttendancePunchInPunchOut';

const router = express.Router();

router.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'V1 API',
  });
});

router.use('/master/categories', categories);
router.use('/master/ambulance', ambulances);
router.use('/master/employee', insertEmployees);
router.use('/master/category/import', bulkImportCategories);
router.use('/master/roster/import', bulkImportRoster);

router.use('/ambulance/auth/login', ambulanceLogin);
router.use('/ambulances/all', allAmbulances);
router.use('/ambulance', insertAmbulances);
router.use('/ambulance/device', insertAmbulanceDevices);
router.use('/ambulance/employees', GetAmbulanceEmployeeDetails);

router.use('/attendance', PunchInPunchOutAttendance);


export default router;
