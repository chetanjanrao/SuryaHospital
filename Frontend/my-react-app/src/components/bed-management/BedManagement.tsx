
import { useEffect, useState, type FormEvent } from "react";
import {
    BedDouble,
    Search,
    Plus,
    Users,
    CheckCircle,
    Wrench,
    Pencil,
    X,
    UserRound,
    Building2,
} from "lucide-react";
import "./BedManagement.css";



type BedStatus = "Available" | "Occupied" | "Maintenance";
type ApiBedStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";

interface HospitalBed {
    id: number;
    bedNumber: string;
    department: string;
    ward: string;
    bedType: string;
    status: BedStatus;
    patientName: string;
    patientId: number | null;
}

interface BedDTO {
    id: number;
    bedNumber: string;
    department: string;
    ward: string;
    bedType: string;
    status: ApiBedStatus;
    patientId: number | null;
    patientName: string | null;
}

interface Patient {
    id: number;
    name: string;
}

interface BedRequest {
    bedNumber: string;
    department: string;
    ward: string;
    bedType: string;
    status: ApiBedStatus;
    patientId: number | null;
}

interface BedForm {
    bedNumber: string;
    department: string;
    ward: string;
    bedType: string;
    status: BedStatus;
    patientId: string;
}


// These functions are kept in this same file.
// No separate bedService.ts is needed.

import  {API_URL} from "../../config.ts";

const BED_API_URL = `${API_URL}/api/beds`;
const PATIENT_API_URL = `${API_URL}/api/patients`;

function getCsrfToken(): string | null {
    const prefix = "XSRF-TOKEN=";
    const cookie = document.cookie
        .split("; ")
        .find((item) => item.startsWith(prefix));

    return cookie ? decodeURIComponent(cookie.substring(prefix.length)) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
    let token = getCsrfToken();

    if (token) {
        return token;
    }

    // Ask Spring Security to create/send the CSRF cookie before a write request.
    const response = await fetch("http://localhost:8080/api/auth/csrf", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
    });

    if (!response.ok) {
        throw new Error(
            `Unable to initialize CSRF protection (${response.status}).`
        );
    }

    token = getCsrfToken();

    // Some backend implementations return the token in JSON as well.
    if (!token) {
        try {
            const data: unknown = await response.json();
            if (
                data &&
                typeof data === "object" &&
                "token" in data &&
                typeof data.token === "string"
            ) {
                token = data.token;
            }
        } catch {
            // The cookie is the normal source for the CSRF token.
        }
    }

    return token;
}

async function apiRequest<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const unsafeMethod = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);

    if (unsafeMethod) {
        const csrfToken = await ensureCsrfToken();

        if (!csrfToken) {
            throw new Error(
                "CSRF token is missing. Refresh the page and sign in again."
            );
        }

        headers.set("X-XSRF-TOKEN", csrfToken);
    }

    const response = await fetch(url, {
        ...options,
        method,
        credentials: "include",
        headers,
    });

    const responseText = await response.text();

    if (!response.ok) {
        let message = responseText || `Request failed (${response.status})`;

        try {
            const errorData = JSON.parse(responseText);
            message =
                errorData.message ||
                errorData.error ||
                errorData.detail ||
                message;
        } catch {
            // Keep the original response text if it isn't JSON.
        }

        throw new Error(`${response.status}: ${message}`);
    }

    if (!responseText) {
        return undefined as T;
    }

    return JSON.parse(responseText) as T;
}

function toApiStatus(status: BedStatus): ApiBedStatus {
    switch (status) {
        case "Available":
            return "AVAILABLE";
        case "Occupied":
            return "OCCUPIED";
        case "Maintenance":
            return "MAINTENANCE";
    }
}

function toUiStatus(status: ApiBedStatus | string): BedStatus {
    switch (status.trim().toUpperCase()) {
        case "AVAILABLE":
            return "Available";
        case "OCCUPIED":
            return "Occupied";
        case "MAINTENANCE":
            return "Maintenance";
        default:
            throw new Error(`Unknown bed status received from API: ${status}`);
    }
}

function mapApiBed(bed: BedDTO): HospitalBed {
    return {
        id: bed.id,
        bedNumber: bed.bedNumber,
        department: bed.department,
        ward: bed.ward,
        bedType: bed.bedType,
        status: toUiStatus(bed.status),
        patientName: bed.patientName ?? "",
        patientId: bed.patientId ?? null,
    };
}

async function getBeds(): Promise<HospitalBed[]> {
    const data = await apiRequest<BedDTO[]>(BED_API_URL);
    return data.map(mapApiBed);
}

async function getPatients(): Promise<Patient[]> {
    return apiRequest<Patient[]>(PATIENT_API_URL);
}

async function createBed(bed: BedRequest): Promise<HospitalBed> {
    const data = await apiRequest<BedDTO>(BED_API_URL, {
        method: "POST",
        body: JSON.stringify(bed),
    });

    return mapApiBed(data);
}

async function updateBed(
    id: number,
    bed: BedRequest
): Promise<HospitalBed> {
    const data = await apiRequest<BedDTO>(`${BED_API_URL}/${id}`, {
        method: "PUT",
        body: JSON.stringify(bed),
    });

    return mapApiBed(data);
}

async function releaseBedApi(id: number): Promise<HospitalBed> {
    const data = await apiRequest<BedDTO>(`${BED_API_URL}/${id}/release`, {
        method: "PATCH",
    });

    return mapApiBed(data);
}

// ======================================================
// FORM DEFAULTS
// ======================================================

const emptyForm: BedForm = {
    bedNumber: "",
    department: "Cardiology",
    ward: "",
    bedType: "General",
    status: "Available",
    patientId: "",
};

// ======================================================
// COMPONENT
// ======================================================

export default function BedManagement() {
    const [beds, setBeds] = useState<HospitalBed[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [departmentFilter, setDepartmentFilter] = useState("All");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<BedForm>(emptyForm);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState<number | null>(null);
    const [error, setError] = useState("");

    // --------------------------------------------------
    // LOAD BEDS AND PATIENTS
    // --------------------------------------------------

    async function loadData() {
        setLoading(true);
        setError("");

        try {
            const [bedsData, patientsData] = await Promise.all([
                getBeds(),
                getPatients(),
            ]);

            setBeds(bedsData);
            setPatients(patientsData);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load beds and patients."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
    }, []);

    // --------------------------------------------------
    // DASHBOARD STATISTICS
    // --------------------------------------------------

    const totalBeds = beds.length;

    const availableBeds = beds.filter(
        (bed) => bed.status === "Available"
    ).length;

    const occupiedBeds = beds.filter(
        (bed) => bed.status === "Occupied"
    ).length;

    const maintenanceBeds = beds.filter(
        (bed) => bed.status === "Maintenance"
    ).length;

    const occupancyPercentage =
        totalBeds > 0
            ? Math.round((occupiedBeds / totalBeds) * 100)
            : 0;

    const departments = Array.from(
        new Set(beds.map((bed) => bed.department))
    );

    // --------------------------------------------------
    // SEARCH AND FILTER
    // --------------------------------------------------

    const filteredBeds = beds.filter((bed) => {
        const searchableText = [
            bed.bedNumber,
            bed.department,
            bed.ward,
            bed.patientName,
            bed.patientId === null ? "" : `PAT-${String(bed.patientId).padStart(3, "0")}`,
            bed.bedType,
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchableText.includes(
            search.toLowerCase()
        );

        const matchesStatus =
            statusFilter === "All" || bed.status === statusFilter;

        const matchesDepartment =
            departmentFilter === "All" ||
            bed.department === departmentFilter;

        return matchesSearch && matchesStatus && matchesDepartment;
    });

    // --------------------------------------------------
    // OPEN ADD / EDIT FORM
    // --------------------------------------------------

    const openAddForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setError("");
        setShowForm(true);
    };

    const openEditForm = (bed: HospitalBed) => {
        setForm({
            bedNumber: bed.bedNumber,
            department: bed.department,
            ward: bed.ward,
            bedType: bed.bedType,
            status: bed.status,
            patientId:
                bed.patientId === null ? "" : String(bed.patientId),
        });

        setEditingId(bed.id);
        setError("");
        setShowForm(true);
    };

    const closeForm = () => {
        if (saving) return;

        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setError("");
    };

    // --------------------------------------------------
    // CREATE / UPDATE BED
    // --------------------------------------------------

    const handleSaveBed = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError("");

        const normalizedBedNumber = form.bedNumber.trim().toLowerCase();

        const duplicateBed = beds.some(
            (bed) =>
                bed.bedNumber.trim().toLowerCase() ===
                normalizedBedNumber &&
                bed.id !== editingId
        );

        if (duplicateBed) {
            setError("This bed number already exists.");
            return;
        }

        if (!form.bedNumber.trim() || !form.ward.trim()) {
            setError("Bed number and ward are required.");
            return;
        }

        const isOccupied = form.status === "Occupied";

        const selectedPatientId = isOccupied
            ? Number(form.patientId)
            : null;

        if (isOccupied && !form.patientId) {
            setError("Please select a patient for this occupied bed.");
            return;
        }

        if (
            isOccupied &&
            !patients.some((patient) => patient.id === selectedPatientId)
        ) {
            setError("Please select a valid patient from the list.");
            return;
        }

        const request: BedRequest = {
            bedNumber: form.bedNumber.trim(),
            department: form.department,
            ward: form.ward.trim(),
            bedType: form.bedType,
            status: toApiStatus(form.status),
            patientId: isOccupied ? selectedPatientId : null,
        };

        setSaving(true);

        try {
            if (editingId !== null) {
                const updatedBed = await updateBed(editingId, request);

                setBeds((previous) =>
                    previous.map((bed) =>
                        bed.id === editingId ? updatedBed : bed
                    )
                );
            } else {
                const createdBed = await createBed(request);

                setBeds((previous) => [createdBed, ...previous]);
            }

            setShowForm(false);
            setEditingId(null);
            setForm(emptyForm);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save the bed."
            );
        } finally {
            setSaving(false);
        }
    };

    // --------------------------------------------------
    // RELEASE BED
    // --------------------------------------------------

    const releaseBed = async (id: number) => {
        const confirmed = window.confirm(
            "Are you sure you want to release this bed?"
        );

        if (!confirmed) return;

        setActionId(id);
        setError("");

        try {
            const updatedBed = await releaseBedApi(id);

            setBeds((previous) =>
                previous.map((bed) => (bed.id === id ? updatedBed : bed))
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to release this bed."
            );
        } finally {
            setActionId(null);
        }
    };

    // --------------------------------------------------
    // TOGGLE MAINTENANCE
    // --------------------------------------------------

    const toggleMaintenance = async (bed: HospitalBed) => {
        if (bed.status === "Occupied") {
            setError(
                "Discharge the patient before changing this bed's maintenance status."
            );
            return;
        }

        const newStatus: BedStatus =
            bed.status === "Maintenance" ? "Available" : "Maintenance";

        const request: BedRequest = {
            bedNumber: bed.bedNumber,
            department: bed.department,
            ward: bed.ward,
            bedType: bed.bedType,
            status: toApiStatus(newStatus),
            patientId: null,
        };

        setActionId(bed.id);
        setError("");

        try {
            const updatedBed = await updateBed(bed.id, request);

            setBeds((previous) =>
                previous.map((item) =>
                    item.id === bed.id ? updatedBed : item
                )
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update maintenance status."
            );
        } finally {
            setActionId(null);
        }
    };

    // ==================================================
    // UI
    // Existing CSS class names are preserved.
    // ==================================================

    return (
        <div className="bed-management-page">
            <div className="bed-management-header">
                <div>
                    <h1>Bed Management</h1>
                    <p>
                        Monitor bed availability, patient assignments, and ward
                        occupancy.
                    </p>
                </div>

                <button
                    className="bed-primary-btn"
                    onClick={openAddForm}
                    disabled={loading}
                >
                    <Plus size={18} />
                    Add New Bed
                </button>
            </div>

            {error && !showForm && (
                <div className="bed-error-message" role="alert">
                    {error}
                    <button
                        type="button"
                        onClick={() => setError("")}
                        aria-label="Dismiss error"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="bed-stats">
                <div className="bed-stat-card">
                    <div className="bed-stat-icon blue">
                        <BedDouble size={23} />
                    </div>
                    <div>
                        <p>Total Beds</p>
                        <h2>{totalBeds}</h2>
                    </div>
                </div>

                <div className="bed-stat-card">
                    <div className="bed-stat-icon green">
                        <CheckCircle size={23} />
                    </div>
                    <div>
                        <p>Available Beds</p>
                        <h2>{availableBeds}</h2>
                    </div>
                </div>

                <div className="bed-stat-card">
                    <div className="bed-stat-icon orange">
                        <Users size={23} />
                    </div>
                    <div>
                        <p>Occupied Beds</p>
                        <h2>{occupiedBeds}</h2>
                    </div>
                </div>

                <div className="bed-stat-card">
                    <div className="bed-stat-icon purple">
                        <Wrench size={23} />
                    </div>
                    <div>
                        <p>Under Maintenance</p>
                        <h2>{maintenanceBeds}</h2>
                    </div>
                </div>
            </div>

            <div className="bed-occupancy-panel">
                <div className="bed-occupancy-heading">
                    <div>
                        <h2>Bed Occupancy</h2>
                        <p>Current hospital bed utilization</p>
                    </div>
                    <strong>{occupancyPercentage}%</strong>
                </div>

                <div
                    className="bed-occupancy-track"
                    role="progressbar"
                    aria-label="Bed occupancy"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={occupancyPercentage}
                >
                    <div
                        className="bed-occupancy-fill"
                        style={{ width: `${occupancyPercentage}%` }}
                    />
                </div>

                <p className="bed-occupancy-caption">
                    {occupiedBeds} of {totalBeds} beds currently occupied
                </p>
            </div>

            <div className="bed-toolbar">
                <div className="bed-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search bed, patient, ward..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <select
                    aria-label="Filter by bed status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                >
                    <option value="All">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                </select>

                <select
                    aria-label="Filter by department"
                    value={departmentFilter}
                    onChange={(event) =>
                        setDepartmentFilter(event.target.value)
                    }
                >
                    <option value="All">All Departments</option>
                    {departments.map((department) => (
                        <option key={department} value={department}>
                            {department}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="bed-empty">
                    <BedDouble size={34} />
                    <h3>Loading beds...</h3>
                    <p>Fetching bed and patient information from the server.</p>
                </div>
            ) : (
                <div className="bed-grid">
                    {filteredBeds.map((bed) => (
                        <article className="bed-card" key={bed.id}>
                            <div className="bed-card-header">
                                <div className="bed-card-number">
                                    <BedDouble size={21} />
                                    <h3>{bed.bedNumber}</h3>
                                </div>

                                <span
                                    className={`bed-status ${bed.status
                                        .toLowerCase()
                                        .replace(" ", "-")}`}
                                >
                                    {bed.status}
                                </span>
                            </div>

                            <div className="bed-card-details">
                                <div>
                                    <Building2 size={16} />
                                    <span>{bed.department}</span>
                                </div>

                                <div>
                                    <span className="bed-detail-label">
                                        Ward
                                    </span>
                                    <strong>{bed.ward}</strong>
                                </div>

                                <div>
                                    <span className="bed-detail-label">
                                        Bed Type
                                    </span>
                                    <strong>{bed.bedType}</strong>
                                </div>
                            </div>

                            {bed.status === "Occupied" ? (
                                <div className="bed-patient-info">
                                    <div className="bed-patient-avatar">
                                        <UserRound size={18} />
                                    </div>
                                    <div>
                                        <span>Assigned Patient</span>
                                        <strong>{bed.patientName}</strong>
                                        <small>
                                            {bed.patientId !== null
                                                ? `PAT-${String(
                                                    bed.patientId
                                                ).padStart(3, "0")}`
                                                : "Patient ID unavailable"}
                                        </small>
                                    </div>
                                </div>
                            ) : (
                                <div className="bed-unassigned-info">
                                    {bed.status === "Available"
                                        ? "Ready for patient assignment"
                                        : "Unavailable during maintenance"}
                                </div>
                            )}

                            <div className="bed-card-actions">
                                {bed.status === "Available" && (
                                    <button
                                        className="bed-assign-btn"
                                        onClick={() => openEditForm(bed)}
                                        disabled={actionId === bed.id}
                                    >
                                        <Plus size={16} />
                                        Assign Patient
                                    </button>
                                )}

                                {bed.status === "Occupied" && (
                                    <button
                                        className="bed-release-btn"
                                        onClick={() => void releaseBed(bed.id)}
                                        disabled={actionId === bed.id}
                                    >
                                        {actionId === bed.id
                                            ? "Releasing..."
                                            : "Release Bed"}
                                    </button>
                                )}

                                {bed.status !== "Occupied" && (
                                    <button
                                        className="bed-maintenance-btn"
                                        onClick={() =>
                                            void toggleMaintenance(bed)
                                        }
                                        disabled={actionId === bed.id}
                                        title={
                                            bed.status === "Maintenance"
                                                ? "Mark as available"
                                                : "Mark under maintenance"
                                        }
                                        aria-label={
                                            bed.status === "Maintenance"
                                                ? `Make ${bed.bedNumber} available`
                                                : `Put ${bed.bedNumber} under maintenance`
                                        }
                                    >
                                        <Wrench size={16} />
                                    </button>
                                )}

                                <button
                                    className="bed-edit-btn"
                                    onClick={() => openEditForm(bed)}
                                    aria-label={`Edit ${bed.bedNumber}`}
                                >
                                    <Pencil size={16} />
                                </button>
                            </div>
                        </article>
                    ))}

                    {filteredBeds.length === 0 && (
                        <div className="bed-empty">
                            <BedDouble size={34} />
                            <h3>No beds found</h3>
                            <p>
                                {beds.length === 0
                                    ? "No beds have been added yet."
                                    : "Try changing your search or filters."}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {showForm && (
                <div className="bed-modal-overlay">
                    <div className="bed-modal">
                        <div className="bed-modal-header">
                            <div>
                                <h2>
                                    {editingId !== null
                                        ? "Edit Bed"
                                        : "Add New Bed"}
                                </h2>
                                <p>
                                    Enter bed details and patient assignment
                                    information.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="bed-close-btn"
                                onClick={closeForm}
                                aria-label="Close form"
                                disabled={saving}
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveBed}>
                            <div className="bed-form-grid">
                                <div className="bed-form-field">
                                    <label htmlFor="bed-number">
                                        Bed Number
                                    </label>
                                    <input
                                        id="bed-number"
                                        required
                                        value={form.bedNumber}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                bedNumber: event.target.value,
                                            })
                                        }
                                        placeholder="e.g. BED-109"
                                    />
                                </div>

                                <div className="bed-form-field">
                                    <label htmlFor="bed-department">
                                        Department
                                    </label>
                                    <select
                                        id="bed-department"
                                        required
                                        value={form.department}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                department: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="Cardiology">
                                            Cardiology
                                        </option>
                                        <option value="Neurology">
                                            Neurology
                                        </option>
                                        <option value="Orthopedics">
                                            Orthopedics
                                        </option>
                                        <option value="Pediatrics">
                                            Pediatrics
                                        </option>
                                        <option value="Dermatology">
                                            Dermatology
                                        </option>
                                        <option value="Emergency">
                                            Emergency
                                        </option>
                                        <option value="General Medicine">
                                            General Medicine
                                        </option>
                                        <option value="Oncology">
                                            Oncology
                                        </option>
                                    </select>
                                </div>

                                <div className="bed-form-field">
                                    <label htmlFor="bed-ward">Ward</label>
                                    <input
                                        id="bed-ward"
                                        required
                                        value={form.ward}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                ward: event.target.value,
                                            })
                                        }
                                        placeholder="e.g. Ward A"
                                    />
                                </div>

                                <div className="bed-form-field">
                                    <label htmlFor="bed-type">Bed Type</label>
                                    <select
                                        id="bed-type"
                                        value={form.bedType}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                bedType: event.target.value,
                                            })
                                        }
                                    >
                                        <option value="General">General</option>
                                        <option value="ICU">ICU</option>
                                        <option value="Private">Private</option>
                                        <option value="Pediatric">
                                            Pediatric
                                        </option>
                                        <option value="Emergency">
                                            Emergency
                                        </option>
                                    </select>
                                </div>

                                <div className="bed-form-field">
                                    <label htmlFor="bed-status">Status</label>
                                    <select
                                        id="bed-status"
                                        value={form.status}
                                        onChange={(event) => {
                                            const status = event.target
                                                .value as BedStatus;

                                            setForm({
                                                ...form,
                                                status,
                                                patientId:
                                                    status === "Occupied"
                                                        ? form.patientId
                                                        : "",
                                            });
                                        }}
                                    >
                                        <option value="Available">
                                            Available
                                        </option>
                                        <option value="Occupied">
                                            Occupied
                                        </option>
                                        <option value="Maintenance">
                                            Maintenance
                                        </option>
                                    </select>
                                </div>

                                {form.status === "Occupied" && (
                                    <div className="bed-form-field full-width">
                                        <label htmlFor="bed-patient">
                                            Select Patient
                                        </label>
                                        <select
                                            id="bed-patient"
                                            required
                                            value={form.patientId}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    patientId: event.target.value,
                                                })
                                            }
                                        >
                                            <option value="">
                                                -- Select a patient --
                                            </option>
                                            {patients.map((patient) => (
                                                <option
                                                    key={patient.id}
                                                    value={patient.id}
                                                >
                                                    {patient.name} (PAT-
                                                    {String(patient.id).padStart(
                                                        3,
                                                        "0"
                                                    )}
                                                    )
                                                </option>
                                            ))}
                                        </select>

                                        {patients.length === 0 && (
                                            <small>
                                                No patients found. Add a patient
                                                in the Patients page first.
                                            </small>
                                        )}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div
                                    className="bed-error-message"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}

                            <div className="bed-form-actions">
                                <button
                                    type="button"
                                    className="bed-cancel-btn"
                                    onClick={closeForm}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="bed-primary-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingId !== null
                                            ? "Save Changes"
                                            : "Add Bed"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}