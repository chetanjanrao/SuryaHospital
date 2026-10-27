import ProtectedRoute from "./ProtectedRoute";
import {BrowserRouter, Navigate, Routes,Route} from "react-router-dom";

import Login from "./components/auth/Login.tsx";
import Layout from "./Layout.tsx";
import Dashboard from "./components/dashboard/Dashboard.tsx";
import Patients from "./components/patients/Patients.tsx";
import Doctors from "./components/doctors/Doctors.tsx";
import Appointments from "./components/appointments/Appointments.tsx";
import MedicalRecords from "./components/medical-records/MedicalRecords.tsx";
import Departments from "./components/departments/Departments.tsx";
import BedManagement from "./components/bed-management/BedManagement.tsx";
import Billing from "./components/billing/Billing.tsx";
import Setting from "./components/setting/Setting.tsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute />}>
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
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}