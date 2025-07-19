import express from 'express';

import MessageResponse from '../interfaces/MessageResponse';

import categories from './master/category/categories';
import ambulances from './master/ambulance/ambulances';
import fetchEmployee from './master/employee/FetchEmployees';
import insertEmployees from './master/employee/InsertEmployees';
import updateEmployees from './master/employee/UpdateEmployee';
import deleteEmployees from './master/employee/DeleteEmployee';
// import fetchSoftDetedEmployees from './master/employee/FetchSoftDeletedEmployees';
import bulkImportCategories from './master/category/import/bulkImport';

import ambulanceLogin from './ambulance/auth/login';
import allAmbulances from './ambulance/GetAllAmbulanceCredentials';
import insertAmbulances from './ambulance/InsertAmbulances';
import insertAmbulanceDevices from './ambulance/ambulanceDevice/InsertAmbulanceDevices';
import GetAmbulanceEmployeeDetails from './ambulance/GetAmbulanceEmployeeDetails';

import PunchInPunchOutAttendance from './ambulance/attendance/AttendancePunchInPunchOut';
import DiverEmtAttendance from './ambulance/attendance/DriverEmtAttendance';
import DiverEmtAttendanceWithSystemAutoOut from './ambulance/attendance/DriverEmtAttendanceWithSystemAutoOut';
import GetAttendance from './ambulance/attendance/GetAttendance';

import AppVersionService from './ambulance/ambulanceDevice/AppVersionService';
import AmbulanceLoginRecord from './ambulance/AmbulanceLoginRecord';

import AmbulanceFuelLog from './ambulance/fuel/AmbulanceFuelLog';
import AmbulanceFuelAlertInsert from './ambulance/fuel/AmbulanceFuelAlertInsert';

const router = express.Router();

router.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'V1 API',
  });
});

router.use('/master/categories', categories);
router.use('/master/ambulance', ambulances);
router.use('/master/employee/all', fetchEmployee);
router.use('/master/employee', insertEmployees);
router.use('/master/employee', updateEmployees);
router.use('/master/employee', deleteEmployees);
// router.use('/master/employee/softdeleted', fetchSoftDetedEmployees);
router.use('/master/category/import', bulkImportCategories);

router.use('/ambulance/auth/login', ambulanceLogin);
router.use('/ambulances/all', allAmbulances);
router.use('/ambulance', insertAmbulances);
router.use('/ambulance/device', insertAmbulanceDevices);
router.use('/ambulance/employees', GetAmbulanceEmployeeDetails);

router.use('/attendance', PunchInPunchOutAttendance);
router.use('/employee/attendance', DiverEmtAttendance);
router.use('/employee/attendance/latest', DiverEmtAttendanceWithSystemAutoOut);
router.use('/attendance', GetAttendance);

router.use('/ambulance/device', AppVersionService);
router.use('/ambulance/login/records', AmbulanceLoginRecord);

router.use('/ambulance/fuel/record', AmbulanceFuelLog);
router.use('/ambulance/fuel/alert', AmbulanceFuelAlertInsert);

export default router;
