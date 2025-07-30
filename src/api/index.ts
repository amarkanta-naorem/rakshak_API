import express from 'express';

import MessageResponse from '../interfaces/MessageResponse';

import categories from './master/category/categories';
import ambulances from './master/ambulance/ambulances';
import fetchEmployee from './master/employee/FetchEmployees';
import insertEmployees from './master/employee/InsertEmployees';
import updateEmployees from './master/employee/UpdateEmployee';
import deleteEmployees from './master/employee/DeleteEmployee';
import bulkImportCategories from './master/category/import/bulkImport';

import ambulanceLogin from './ambulance/auth/login';
import allAmbulances from './ambulance/GetAllAmbulanceCredentials';
import insertAmbulances from './ambulance/InsertAmbulances';
import insertAmbulanceDevices from './ambulance/ambulanceDevice/InsertAmbulanceDevices';
import GetAmbulanceEmployeeDetails from './ambulance/GetAmbulanceEmployeeDetails';
import SyncAmbulanceEmployeeDetails from './ambulance/SyncAmbulanceEmployeeDetails';

import PunchInPunchOutAttendance from './ambulance/attendance/AttendancePunchInPunchOut';
import DiverEmtAttendance from './ambulance/attendance/DriverEmtAttendance';
import DiverEmtAttendanceWithSystemAutoOut from './ambulance/attendance/DriverEmtAttendanceWithSystemAutoOut';
import DriverEmtAttendanceWithSystemAutoOutWithGpsStatus from './ambulance/attendance/DriverEmtAttendanceWithSystemAutoOutAndGpsStatus';
import GetAttendance from './ambulance/attendance/GetAttendance';

import AppVersionService from './ambulance/ambulanceDevice/AppVersionService';
import AmbulanceLoginRecord from './ambulance/AmbulanceLoginRecord';

import AmbulanceFuelLog from './ambulance/fuel/AmbulanceFuelLog';
import AmbulanceFuelAlertInsert from './ambulance/fuel/AmbulanceFuelAlertInsert';

import EmployeeByAmbulance from './gtracIntegration/employeeByAmbulance';


// Dashboard APIs
import fetchActiveEmployeesByAmbulanceNumber from './dashboard/fetchActiveEmployeesByAmbulanceNumber'
import driversOnlyAmbulances from './dashboard/driversOnlyAmbulances';
import emtsOnlyAMbulances from './dashboard/emtsOnlyAmbulances';

const router = express.Router();

router.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'V1 API',
  });
});

router.use('/dashboard/ambulance/active/employees', fetchActiveEmployeesByAmbulanceNumber);
router.use('/dashboard/ambulance/driver/only', driversOnlyAmbulances);
router.use('/dashboard/ambulance/emt/only', emtsOnlyAMbulances);

router.use('/master/categories', categories);
router.use('/master/ambulance', ambulances);
router.use('/master/employee/all', fetchEmployee);
router.use('/master/employee', insertEmployees);
router.use('/master/employee', updateEmployees);
router.use('/master/employee', deleteEmployees);
router.use('/master/category/import', bulkImportCategories);

router.use('/ambulance/auth/login', ambulanceLogin);
router.use('/ambulances/all', allAmbulances);
router.use('/ambulance', insertAmbulances);
router.use('/ambulance/device', insertAmbulanceDevices);
router.use('/ambulance/employees', GetAmbulanceEmployeeDetails);
router.use('/ambulance/employees/sync', SyncAmbulanceEmployeeDetails);

router.use('/attendance', PunchInPunchOutAttendance);
router.use('/employee/attendance', DiverEmtAttendance);
router.use('/employee/attendance/latest', DiverEmtAttendanceWithSystemAutoOut);
router.use('/employee/attendance/latest/withGpsStatus', DriverEmtAttendanceWithSystemAutoOutWithGpsStatus);
router.use('/attendance', GetAttendance);

router.use('/ambulance/device', AppVersionService);
router.use('/ambulance/login/records', AmbulanceLoginRecord);

router.use('/ambulance/fuel/record', AmbulanceFuelLog);
router.use('/ambulance/fuel/alert', AmbulanceFuelAlertInsert);

router.use('/ambulance/employee', EmployeeByAmbulance);

export default router;
