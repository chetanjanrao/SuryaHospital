
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./Layout";
import Dashboard from "./components/dashboard/Dashboard";
import Patients from "./components/patients/Patients";
import Doctors from "./components/doctors/Doctors";
import Appointments from "./components/appointments/Appointments";
import MedicalRecords from "./components/medical-records/MedicalRecords";
import Departments from "./components/departments/Departments";
import BedManagement from "./components/bed-management/BedManagement";
import Billing from "./components/billing/Billing";
import Setting from "./components/setting/Setting";
import Login from "./components/auth/Login";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/patients" element={<Patients />} />
                    <Route path="/doctors" element={<Doctors />} />
                    <Route path="/appointments" element={<Appointments />} />
                    <Route path="/medical-records" element={<MedicalRecords />} />
                    <Route path="/departments" element={<Departments />} />
                    <Route path="/bed-management" element={<BedManagement />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/settings" element={<Setting />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
