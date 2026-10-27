import { useEffect, useState, type SubmitEvent } from "react";
import {
    Search,
    Plus,
    FileText,
    ClipboardList,
    Activity,
    X,
    Eye,
} from "lucide-react";
import "./MedicalRecords.css";

/* ------------------------------------------------------------------ */
/* Medical record service (previously medicalRecordService.ts)         */
/* ------------------------------------------------------------------ */
import { API_URL } from "../../config.ts";
import { getCsrfToken } from "../../services/authService.ts";

const API_DATA = `${API_URL}/api/medical-records`;
// Patients and doctors have their own endpoints (not under /api/medical-records)
const PATIENT_API = `${API_URL}/api/patients`;
const DOCTOR_API = `${API_URL}/api/doctors`;

// Status values expected by the Spring Boot backend
export type ApiRecordStatus = "ACTIVE" | "FOLLOW_UP" | "CLOSED";

// Medical Record response received from the backend
export interface ApiMedicalRecord {
    id: number;
    patientId: number;
    patientName: string;
    doctorId: number;
    doctorName: string;
    visitDate: string;
    diagnosis: string;
    prescription: string;
    notes: string;
    status: ApiRecordStatus;
}

// Data required when creating or updating a record
export type MedicalRecordPayload = Omit<
    ApiMedicalRecord,
    "id" | "patientName" | "doctorName"
>;

// Handle API responses and errors
async function handleResponse<T>(
    response: Response
): Promise<T> {
    if (!response.ok) {
        let details = "";
        try {
            details = (await response.text()).slice(0, 200);
        } catch {
            // ignore – we just use the status below
        }

        throw new Error(
            `Request failed (status ${response.status})${details ? `: ${details}` : ""}`
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

// 1. Get all medical records
export async function getMedicalRecords(): Promise<ApiMedicalRecord[]> {
    const response = await fetch(API_DATA, { credentials: "include" });
    return handleResponse<ApiMedicalRecord[]>(response);
}

// 2. Get one medical record by ID
export async function getMedicalRecordById(
    id: number
): Promise<ApiMedicalRecord> {
    const response = await fetch(`${API_DATA}/${id}`, {
        credentials: "include",
    });
    return handleResponse<ApiMedicalRecord>(response);
}

// 3. Create a medical record
export async function createMedicalRecord(
    record: MedicalRecordPayload
): Promise<ApiMedicalRecord> {
    const csrfToken = await getCsrfToken();

    const response = await fetch(API_DATA, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify(record),
    });

    return handleResponse<ApiMedicalRecord>(response);
}

// 4. Update a medical record
export async function updateMedicalRecord(
    id: number,
    record: MedicalRecordPayload
): Promise<ApiMedicalRecord> {
    const csrfToken = await getCsrfToken();

    const response = await fetch(`${API_DATA}/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify(record),
    });

    return handleResponse<ApiMedicalRecord>(response);
}

// 5. Delete a medical record
export async function deleteMedicalRecord(
    id: number
): Promise<void> {
    const csrfToken = await getCsrfToken();

    const response = await fetch(`${API_DATA}/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "X-XSRF-TOKEN": csrfToken,
        },
    });

    await handleResponse<void>(response);
}

/* ------------------------------------------------------------------ */
/* Medical Records page component                                      */
/* ------------------------------------------------------------------ */

type RecordStatus = "Active" | "Follow-up" | "Closed";

interface MedicalRecord {
    id: number;
    patient: string;
    patientId: string;
    doctor: string;
    visitDate: string;
    diagnosis: string;
    prescription: string;
    notes: string;
    status: RecordStatus;
}

interface PatientOption {
    id: number;
    name: string;
}

interface DoctorOption {
    id: number;
    name: string;
    specialization: string;
    available: boolean;
}

const statusMap: Record<string, RecordStatus> = {
    ACTIVE: "Active",
    FOLLOW_UP: "Follow-up",
    CLOSED: "Closed",
    Active: "Active",
    "Follow-up": "Follow-up",
    Closed: "Closed",
};

function mapApiRecord(record: ApiMedicalRecord): MedicalRecord {
    return {
        id: record.id,
        patient: record.patientName ?? "Unknown Patient",
        patientId: `PAT-${String(record.patientId).padStart(3, "0")}`,
        doctor: record.doctorName ?? "Unknown Doctor",
        visitDate: record.visitDate ?? "",
        diagnosis: record.diagnosis ?? "",
        prescription: record.prescription ?? "",
        notes: record.notes ?? "",
        status: statusMap[String(record.status)] ?? "Active",
    };
}

const emptyForm = {
    patientId: "",
    doctorId: "",
    visitDate: "",
    diagnosis: "",
    prescription: "",
    notes: "",
    status: "Active" as RecordStatus,
};

export default function MedicalRecords() {
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);

    const [loading, setLoading] = useState(true);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // error: problem loading the records list (shown at the top of the page)
    // optionsError: problem loading the patient/doctor dropdowns (shown in the modal)
    // formError: problem saving a record (shown in the modal)
    const [error, setError] = useState("");
    const [optionsError, setOptionsError] = useState("");
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const [showForm, setShowForm] = useState(false);
    const [selectedRecord, setSelectedRecord] =
        useState<MedicalRecord | null>(null);

    const [form, setForm] = useState(emptyForm);

    // Load existing medical records.
    async function loadRecords() {
        try {
            setLoading(true);
            setError("");

            const data = await getMedicalRecords();
            setRecords(data.map(mapApiRecord));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load medical records."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadRecords();
    }, []);

    // Load existing patients and doctors for the dropdowns.
    useEffect(() => {
        let cancelled = false;

        async function loadOptions() {
            try {
                setOptionsLoading(true);
                setOptionsError("");

                const [patientResponse, doctorResponse] =
                    await Promise.all([
                        fetch(PATIENT_API, { credentials: "include" }),
                        fetch(DOCTOR_API, { credentials: "include" }),
                    ]);

                if (!patientResponse.ok) {
                    throw new Error(
                        `Failed to load patients (${patientResponse.status}).`
                    );
                }

                if (!doctorResponse.ok) {
                    throw new Error(
                        `Failed to load doctors (${doctorResponse.status}).`
                    );
                }

                const patientData: PatientOption[] =
                    await patientResponse.json();

                const doctorData: DoctorOption[] =
                    await doctorResponse.json();

                if (!cancelled) {
                    setPatients(
                        patientData.map((patient) => ({
                            id: patient.id,
                            name: patient.name ?? "Unnamed Patient",
                        }))
                    );

                    setDoctors(
                        doctorData.map((doctor) => ({
                            id: doctor.id,
                            name: doctor.name ?? "Unnamed Doctor",
                            specialization:
                                doctor.specialization ?? "",
                            available: doctor.available ?? true,
                        }))
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setOptionsError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load patients and doctors."
                    );
                }
            } finally {
                if (!cancelled) {
                    setOptionsLoading(false);
                }
            }
        }

        void loadOptions();

        return () => {
            cancelled = true;
        };
    }, []);

    // Search and status filtering.
    const filteredRecords = records.filter((record) => {
        const searchText = [
            record.patient,
            record.patientId,
            record.doctor,
            record.diagnosis,
        ]
            .join(" ")
            .toLowerCase();

        return (
            searchText.includes(search.toLowerCase()) &&
            (statusFilter === "All" ||
                record.status === statusFilter)
        );
    });

    const availableDoctors = doctors.filter(
        (doctor) => doctor.available
    );

    // Open the form and reset previous values.
    function openAddForm() {
        setForm(emptyForm);
        setFormError("");
        setSuccessMessage("");
        setShowForm(true);
    }

    function closeForm() {
        if (saving) return;

        setShowForm(false);
        setFormError("");
    }

    // Save a new medical record through Spring Boot.
    async function handleAddRecord(
        event: SubmitEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (saving) return;

        if (!form.patientId || !form.doctorId) {
            setFormError("Please select a patient and a doctor.");
            return;
        }

        try {
            setSaving(true);
            setFormError("");
            setSuccessMessage("");

            const requestBody: MedicalRecordPayload = {
                patientId: Number(form.patientId),
                doctorId: Number(form.doctorId),
                visitDate: form.visitDate,
                diagnosis: form.diagnosis.trim(),
                prescription: form.prescription.trim(),
                notes: form.notes.trim(),
                status:
                    form.status === "Active"
                        ? "ACTIVE"
                        : form.status === "Follow-up"
                            ? "FOLLOW_UP"
                            : "CLOSED",
            };

            // Sends the session cookie and CSRF header (see createMedicalRecord above)
            const savedRecord = await createMedicalRecord(requestBody);

            // Use the actual record returned by the backend.
            setRecords((current) => [
                mapApiRecord(savedRecord),
                ...current,
            ]);

            setForm(emptyForm);
            setShowForm(false);
            setSuccessMessage(
                "Medical record saved successfully."
            );
        } catch (err) {
            setFormError(
                err instanceof Error
                    ? err.message
                    : "Failed to save medical record."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="medical-records-page">
            {/* Page header */}
            <div className="medical-records-header">
                <div>
                    <h1>Medical Records</h1>
                    <p>
                        View and manage patient medical histories
                        and diagnoses.
                    </p>
                </div>

                <button
                    type="button"
                    className="medical-primary-btn"
                    onClick={openAddForm}
                >
                    <Plus size={18} />
                    Add Medical Record
                </button>
            </div>

            {successMessage && (
                <p role="status" className="medical-success">
                    {successMessage}
                </p>
            )}

            {/* Statistics */}
            <div className="medical-stats">
                <div className="medical-stat-card">
                    <div className="medical-stat-icon blue">
                        <FileText size={23} />
                    </div>
                    <div>
                        <p>Total Records</p>
                        <h2>{records.length}</h2>
                    </div>
                </div>

                <div className="medical-stat-card">
                    <div className="medical-stat-icon orange">
                        <Activity size={23} />
                    </div>
                    <div>
                        <p>Active Records</p>
                        <h2>
                            {
                                records.filter(
                                    (record) =>
                                        record.status === "Active"
                                ).length
                            }
                        </h2>
                    </div>
                </div>

                <div className="medical-stat-card">
                    <div className="medical-stat-icon purple">
                        <ClipboardList size={23} />
                    </div>
                    <div>
                        <p>Follow-ups</p>
                        <h2>
                            {
                                records.filter(
                                    (record) =>
                                        record.status === "Follow-up"
                                ).length
                            }
                        </h2>
                    </div>
                </div>
            </div>

            {/* Search and filters */}
            <div className="medical-records-toolbar">
                <div className="medical-search">
                    <Search size={19} />
                    <input
                        type="text"
                        placeholder="Search patient, doctor or diagnosis..."
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(event) =>
                        setStatusFilter(event.target.value)
                    }
                    aria-label="Filter by record status"
                >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Closed">Closed</option>
                </select>
            </div>

            {loading && (
                <p role="status">Loading medical records...</p>
            )}

            {error && (
                <p role="alert" className="medical-error">
                    {error}
                </p>
            )}

            {/* Medical records table */}
            <div className="medical-records-table-wrapper">
                <table className="medical-records-table">
                    <thead>
                    <tr>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Visit Date</th>
                        <th>Diagnosis</th>
                        <th>Prescription</th>
                        <th>Status</th>
                        <th>Details</th>
                    </tr>
                    </thead>

                    <tbody>
                    {!loading &&
                        !error &&
                        filteredRecords.map((record) => (
                            <tr key={record.id}>
                                <td>
                                    <div className="medical-patient-cell">
                                        <div className="medical-patient-avatar">
                                            {record.patient
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <div>
                                            <strong>
                                                {record.patient}
                                            </strong>
                                            <span>
                                                {record.patientId}
                                            </span>
                                        </div>
                                    </div>
                                </td>

                                <td>{record.doctor}</td>
                                <td>{record.visitDate}</td>
                                <td>{record.diagnosis}</td>
                                <td>{record.prescription}</td>

                                <td>
                                    <span
                                        className={`medical-status ${record.status
                                            .toLowerCase()
                                            .replace("-", "")}`}
                                    >
                                        {record.status}
                                    </span>
                                </td>

                                <td>
                                    <button
                                        type="button"
                                        className="medical-view-btn"
                                        onClick={() =>
                                            setSelectedRecord(record)
                                        }
                                        aria-label={`View record for ${record.patient}`}
                                    >
                                        <Eye size={17} />
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}

                    {!loading &&
                        !error &&
                        filteredRecords.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="medical-empty"
                                >
                                    No medical records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Medical Record modal */}
            {showForm && (
                <div className="medical-modal-overlay">
                    <div className="medical-modal">
                        <div className="medical-modal-header">
                            <div>
                                <h2>Add Medical Record</h2>
                                <p>
                                    Select an existing patient and doctor.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="medical-close-btn"
                                onClick={closeForm}
                                disabled={saving}
                                aria-label="Close form"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        {(formError || optionsError) && (
                            <p
                                role="alert"
                                className="medical-error"
                            >
                                {formError || optionsError}
                            </p>
                        )}

                        <form onSubmit={handleAddRecord}>
                            <div className="medical-form-grid">
                                {/* Existing patient dropdown */}
                                <div className="medical-form-field">
                                    <label htmlFor="record-patient">
                                        Patient
                                    </label>

                                    <select
                                        id="record-patient"
                                        required
                                        value={form.patientId}
                                        disabled={
                                            optionsLoading ||
                                            patients.length === 0 ||
                                            saving
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                patientId:
                                                event.target.value,
                                            })
                                        }
                                    >
                                        <option value="">
                                            {optionsLoading
                                                ? "Loading patients..."
                                                : patients.length === 0
                                                    ? "No patients available"
                                                    : "Select a patient"}
                                        </option>

                                        {patients.map((patient) => (
                                            <option
                                                key={patient.id}
                                                value={patient.id}
                                            >
                                                {patient.name} (ID:{" "}
                                                {patient.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Existing doctor dropdown */}
                                <div className="medical-form-field">
                                    <label htmlFor="record-doctor">
                                        Doctor
                                    </label>

                                    <select
                                        id="record-doctor"
                                        required
                                        value={form.doctorId}
                                        disabled={
                                            optionsLoading ||
                                            availableDoctors.length === 0 ||
                                            saving
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                doctorId:
                                                event.target.value,
                                            })
                                        }
                                    >
                                        <option value="">
                                            {optionsLoading
                                                ? "Loading doctors..."
                                                : availableDoctors.length === 0
                                                    ? "No available doctors"
                                                    : "Select an available doctor"}
                                        </option>

                                        {availableDoctors.map((doctor) => (
                                            <option
                                                key={doctor.id}
                                                value={doctor.id}
                                            >
                                                {doctor.name} —{" "}
                                                {doctor.specialization}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="medical-form-field">
                                    <label htmlFor="record-date">
                                        Visit Date
                                    </label>
                                    <input
                                        id="record-date"
                                        type="date"
                                        required
                                        value={form.visitDate}
                                        disabled={saving}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                visitDate:
                                                event.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="medical-form-field">
                                    <label htmlFor="record-diagnosis">
                                        Diagnosis
                                    </label>
                                    <input
                                        id="record-diagnosis"
                                        required
                                        value={form.diagnosis}
                                        disabled={saving}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                diagnosis:
                                                event.target.value,
                                            })
                                        }
                                        placeholder="Enter diagnosis"
                                    />
                                </div>

                                <div className="medical-form-field">
                                    <label htmlFor="record-prescription">
                                        Prescription
                                    </label>
                                    <input
                                        id="record-prescription"
                                        required
                                        value={form.prescription}
                                        disabled={saving}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                prescription:
                                                event.target.value,
                                            })
                                        }
                                        placeholder="Enter prescribed treatment"
                                    />
                                </div>

                                <div className="medical-form-field">
                                    <label htmlFor="record-status">
                                        Record Status
                                    </label>
                                    <select
                                        id="record-status"
                                        value={form.status}
                                        disabled={saving}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                status: event.target
                                                    .value as RecordStatus,
                                            })
                                        }
                                    >
                                        <option value="Active">
                                            Active
                                        </option>
                                        <option value="Follow-up">
                                            Follow-up
                                        </option>
                                        <option value="Closed">
                                            Closed
                                        </option>
                                    </select>
                                </div>

                                <div className="medical-form-field full-width">
                                    <label htmlFor="record-notes">
                                        Clinical Notes
                                    </label>
                                    <textarea
                                        id="record-notes"
                                        rows={3}
                                        value={form.notes}
                                        disabled={saving}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                notes: event.target.value,
                                            })
                                        }
                                        placeholder="Enter visit notes..."
                                    />
                                </div>
                            </div>

                            <div className="medical-form-actions">
                                <button
                                    type="button"
                                    className="medical-cancel-btn"
                                    onClick={closeForm}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="medical-primary-btn"
                                    disabled={
                                        saving ||
                                        optionsLoading ||
                                        patients.length === 0 ||
                                        availableDoctors.length === 0
                                    }
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Save Record"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Medical Record Details modal */}
            {selectedRecord && (
                <div className="medical-modal-overlay">
                    <div className="medical-modal medical-details-modal">
                        <div className="medical-modal-header">
                            <div>
                                <h2>Medical Record Details</h2>
                                <p>{selectedRecord.patient}</p>
                            </div>

                            <button
                                type="button"
                                className="medical-close-btn"
                                onClick={() =>
                                    setSelectedRecord(null)
                                }
                                aria-label="Close details"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <div className="medical-detail-list">
                            <div>
                                <span>Patient ID</span>
                                <strong>
                                    {selectedRecord.patientId}
                                </strong>
                            </div>
                            <div>
                                <span>Doctor</span>
                                <strong>
                                    {selectedRecord.doctor}
                                </strong>
                            </div>
                            <div>
                                <span>Visit Date</span>
                                <strong>
                                    {selectedRecord.visitDate}
                                </strong>
                            </div>
                            <div>
                                <span>Diagnosis</span>
                                <strong>
                                    {selectedRecord.diagnosis}
                                </strong>
                            </div>
                            <div>
                                <span>Prescription</span>
                                <strong>
                                    {selectedRecord.prescription}
                                </strong>
                            </div>
                            <div>
                                <span>Status</span>
                                <strong>
                                    {selectedRecord.status}
                                </strong>
                            </div>
                            <div className="medical-notes">
                                <span>Clinical Notes</span>
                                <p>
                                    {selectedRecord.notes ||
                                        "No notes added."}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="medical-primary-btn medical-detail-close"
                            onClick={() =>
                                setSelectedRecord(null)
                            }
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}