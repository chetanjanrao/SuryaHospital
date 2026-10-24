import { useCallback, useEffect, useMemo, useState, type SubmitEvent } from "react";
import {
    Search,
    Plus,
    Eye,
    Pencil,
    Trash2,
    X,
    Stethoscope,
    Phone,
    Mail,
    CalendarDays,
} from "lucide-react";
import "./Doctors.css";

const API_URL = "http://localhost:8080/api/doctors";

type Doctor = {
    id: number;
    name: string;
    specialization: string;
    email: string;
    phone: string;
    experienceYears: number;
    consultationFee: number;
    available: boolean;
};

type DoctorForm = Omit<Doctor, "id">;

type ModalMode = "add" | "edit" | "view" | null;

const emptyForm: DoctorForm = {
    name: "",
    specialization: "General Medicine",
    email: "",
    phone: "",
    experienceYears: 0,
    consultationFee: 0,
    available: true,
};

// Reads the XSRF-TOKEN cookie that Spring Security sets.
// Must be synchronous (not async) so it can be used directly inside headers.
function getCsrfToken(): string {
    const match = document.cookie
        .split("; ")
        .find((c) => c.startsWith("XSRF-TOKEN="));
    return match ? decodeURIComponent(match.split("=")[1]) : "";
}

// Builds a readable error message from a failed response
async function readError(response: Response, fallback: string) {
    let details = "";
    try {
        details = (await response.text()).slice(0, 200);
    } catch {
        // ignore – we just use the fallback
    }
    return `${fallback} (status ${response.status})${details ? `: ${details}` : ""}`;
}

function Doctors() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // loadError: problem loading the list (shown at the top of the page)
    // formError: problem saving (shown inside the modal)
    // actionError: problem deleting (shown at the top of the page)
    const [loadError, setLoadError] = useState("");
    const [formError, setFormError] = useState("");
    const [actionError, setActionError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [search, setSearch] = useState("");
    const [specializationFilter, setSpecializationFilter] = useState("All");

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [form, setForm] = useState<DoctorForm>({ ...emptyForm });

    // GET: Fetch doctors from Spring Boot.
    const loadDoctors = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError("");

            const response = await fetch(API_URL, { credentials: "include" });

            if (!response.ok) {
                setLoadError(
                    await readError(response, "Failed to fetch doctors")
                );
                return;
            }

            const data: Doctor[] = await response.json();

            const formattedDoctors: Doctor[] = data.map((item) => ({
                id: item.id,
                name: item.name ?? "",
                specialization: item.specialization ?? "",
                email: item.email ?? "",
                phone: item.phone ?? "",
                experienceYears: Number(item.experienceYears ?? 0),
                consultationFee: Number(item.consultationFee ?? 0),
                available: item.available ?? true,
            }));

            setDoctors(formattedDoctors);
        } catch (err) {
            setLoadError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while fetching doctors."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDoctors();
    }, [loadDoctors]);

    // Build the specialization dropdown options.
    const specialties = useMemo(
        () => [
            "All",
            ...new Set(
                doctors
                    .map((doctor) => doctor.specialization)
                    .filter(Boolean)
            ),
        ],
        [doctors]
    );

    // Search and filter doctors.
    const filteredDoctors = useMemo(() => {
        const query = search.trim().toLowerCase();

        return doctors.filter((doctor) => {
            const matchesSearch =
                doctor.name.toLowerCase().includes(query) ||
                doctor.email.toLowerCase().includes(query) ||
                doctor.specialization.toLowerCase().includes(query) ||
                String(doctor.id).includes(query);

            const matchesSpecialization =
                specializationFilter === "All" ||
                doctor.specialization === specializationFilter;

            return matchesSearch && matchesSpecialization;
        });
    }, [doctors, search, specializationFilter]);

    const availableCount = doctors.filter(
        (doctor) => doctor.available
    ).length;

    // Open the Add Doctor modal.
    const openAddModal = () => {
        setForm({ ...emptyForm });
        setSelectedDoctor(null);
        setFormError("");
        setActionError("");
        setSuccessMessage("");
        setModalMode("add");
    };

    // Open the Edit Doctor modal.
    const openEditModal = (doctor: Doctor) => {
        setForm({
            name: doctor.name,
            specialization: doctor.specialization,
            email: doctor.email,
            phone: doctor.phone,
            experienceYears: doctor.experienceYears,
            consultationFee: doctor.consultationFee,
            available: doctor.available,
        });

        setSelectedDoctor(doctor);
        setFormError("");
        setActionError("");
        setSuccessMessage("");
        setModalMode("edit");
    };

    // Open the View Doctor modal.
    const openViewModal = (doctor: Doctor) => {
        setSelectedDoctor(doctor);
        setFormError("");
        setModalMode("view");
    };

    const closeModal = () => {
        if (saving) return;

        setModalMode(null);
        setSelectedDoctor(null);
        setFormError("");
    };

    // Update individual form fields.
    const updateField = <K extends keyof DoctorForm>(
        field: K,
        value: DoctorForm[K]
    ) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    // POST: Add a doctor. PUT: Update an existing doctor.
    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (saving) return;

        try {
            setSaving(true);
            setFormError("");
            setSuccessMessage("");

            const isEditing =
                modalMode === "edit" && selectedDoctor !== null;

            const url = isEditing
                ? `${API_URL}/${selectedDoctor.id}`
                : API_URL;

            const method = isEditing ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify({
                    name: form.name.trim(),
                    specialization: form.specialization,
                    email: form.email.trim(),
                    phone: form.phone.trim(),
                    experienceYears: Number(form.experienceYears),
                    consultationFee: Number(form.consultationFee),
                    available: form.available,
                }),
            });

            if (!response.ok) {
                setFormError(
                    await readError(
                        response,
                        `Failed to ${isEditing ? "update" : "add"} doctor`
                    )
                );
                return;
            }

            await loadDoctors();

            setSuccessMessage(
                isEditing
                    ? "Doctor updated successfully."
                    : "Doctor added successfully."
            );

            setModalMode(null);
            setSelectedDoctor(null);
        } catch (err) {
            setFormError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while saving the doctor."
            );
        } finally {
            setSaving(false);
        }
    };

    // DELETE: Remove a doctor from the backend.
    const handleDelete = async (doctor: Doctor) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${doctor.name}?`
        );

        if (!confirmed) return;

        try {
            setActionError("");
            setSuccessMessage("");

            const response = await fetch(`${API_URL}/${doctor.id}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "X-XSRF-TOKEN": getCsrfToken(),
                },
            });

            if (!response.ok) {
                setActionError(
                    await readError(response, "Failed to delete doctor")
                );
                return;
            }

            setDoctors((current) =>
                current.filter((item) => item.id !== doctor.id)
            );

            if (selectedDoctor?.id === doctor.id) {
                setSelectedDoctor(null);
                setModalMode(null);
            }

            setSuccessMessage("Doctor deleted successfully.");
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong while deleting the doctor."
            );
        }
    };

    return (
        <section className="doctors-page">
            <div className="doctors-heading">
                <div>
                    <h1>Doctors</h1>
                    <p>Manage your hospital's medical professionals.</p>
                </div>

                <button
                    type="button"
                    className="doctor-primary-btn"
                    onClick={openAddModal}
                >
                    <Plus size={18} />
                    Add Doctor
                </button>
            </div>

            {(loadError || actionError) && (
                <p role="alert" className="doctor-error-message">
                    {loadError || actionError}
                </p>
            )}

            {successMessage && (
                <p role="status" className="doctor-success-message">
                    {successMessage}
                </p>
            )}

            <div className="doctor-stats">
                <div className="doctor-stat-card">
                    <div className="doctor-stat-icon purple">
                        <Stethoscope size={22} />
                    </div>
                    <div>
                        <span>Total Doctors</span>
                        <h2>{doctors.length}</h2>
                    </div>
                </div>

                <div className="doctor-stat-card">
                    <div className="doctor-stat-icon green">
                        <span className="doctor-status-dot" />
                    </div>
                    <div>
                        <span>Available Today</span>
                        <h2>{availableCount}</h2>
                    </div>
                </div>

                <div className="doctor-stat-card">
                    <div className="doctor-stat-icon blue">
                        <CalendarDays size={22} />
                    </div>
                    <div>
                        <span>Specialties</span>
                        <h2>{specialties.length - 1}</h2>
                    </div>
                </div>
            </div>

            <div className="doctors-panel">
                <div className="doctors-toolbar">
                    <div className="doctor-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search name, specialization, email or ID..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <select
                        value={specializationFilter}
                        onChange={(event) =>
                            setSpecializationFilter(event.target.value)
                        }
                        aria-label="Filter by specialization"
                    >
                        {specialties.map((specialization) => (
                            <option
                                key={specialization}
                                value={specialization}
                            >
                                {specialization === "All"
                                    ? "All Specialties"
                                    : specialization}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="doctors-table-wrap">
                    {loading ? (
                        <p role="status">Loading doctors...</p>
                    ) : (
                        <table className="doctors-table">
                            <thead>
                            <tr>
                                <th>Doctor</th>
                                <th>Specialization</th>
                                <th>Experience</th>
                                <th>Contact</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                            </thead>

                            <tbody>
                            {filteredDoctors.map((doctor) => (
                                <tr key={doctor.id}>
                                    <td>
                                        <div className="doctor-identity">
                                            <div className="doctor-avatar">
                                                {doctor.name
                                                    .replace(/^Dr\.\s*/i, "")
                                                    .split(" ")
                                                    .map((part) => part[0])
                                                    .slice(0, 2)
                                                    .join("")}
                                            </div>

                                            <div>
                                                <strong>{doctor.name}</strong>
                                                <span>DOC-{doctor.id}</span>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <span className="doctor-specialization">
                                            {doctor.specialization}
                                        </span>
                                    </td>

                                    <td>{doctor.experienceYears} years</td>

                                    <td>
                                        <div className="doctor-contact">
                                            <span>
                                                <Mail size={14} />
                                                {doctor.email}
                                            </span>
                                            <span>
                                                <Phone size={14} />
                                                {doctor.phone}
                                            </span>
                                        </div>
                                    </td>

                                    <td>
                                        <span
                                            className={`doctor-status ${
                                                doctor.available
                                                    ? "available"
                                                    : "unavailable"
                                            }`}
                                        >
                                            {doctor.available
                                                ? "Available"
                                                : "Unavailable"}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="doctor-actions">
                                            <button
                                                type="button"
                                                title="View doctor"
                                                aria-label={`View ${doctor.name}`}
                                                onClick={() =>
                                                    openViewModal(doctor)
                                                }
                                            >
                                                <Eye size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                title="Edit doctor"
                                                aria-label={`Edit ${doctor.name}`}
                                                onClick={() =>
                                                    openEditModal(doctor)
                                                }
                                            >
                                                <Pencil size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                title="Delete doctor"
                                                aria-label={`Delete ${doctor.name}`}
                                                onClick={() =>
                                                    void handleDelete(doctor)
                                                }
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredDoctors.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="doctor-empty"
                                    >
                                        {doctors.length === 0
                                            ? "No doctors available. Add your first doctor."
                                            : "No doctors found. Try another search or filter."}
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="doctors-table-footer">
                    Showing {filteredDoctors.length} of {doctors.length} doctors
                </div>
            </div>

            {modalMode && (
                <div
                    className="doctor-modal-backdrop"
                    onClick={closeModal}
                >
                    <div
                        className="doctor-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="doctor-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="doctor-modal-heading">
                            <div>
                                <h2 id="doctor-modal-title">
                                    {modalMode === "add"
                                        ? "Add New Doctor"
                                        : modalMode === "edit"
                                            ? "Edit Doctor"
                                            : "Doctor Details"}
                                </h2>

                                <p>
                                    {modalMode === "view"
                                        ? "Professional and contact information"
                                        : "Enter the doctor's information below."}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="doctor-modal-close"
                                onClick={closeModal}
                                aria-label="Close dialog"
                                disabled={saving}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {modalMode === "view" && selectedDoctor ? (
                            <div className="doctor-details">
                                <div className="doctor-details-avatar">
                                    {selectedDoctor.name
                                        .replace(/^Dr\.\s*/i, "")
                                        .split(" ")
                                        .map((part) => part[0])
                                        .slice(0, 2)
                                        .join("")}
                                </div>

                                <h3>{selectedDoctor.name}</h3>
                                <p>{selectedDoctor.specialization}</p>

                                <div className="doctor-detail-row">
                                    <span>Doctor ID</span>
                                    <strong>DOC-{selectedDoctor.id}</strong>
                                </div>

                                <div className="doctor-detail-row">
                                    <span>Experience</span>
                                    <strong>
                                        {selectedDoctor.experienceYears} years
                                    </strong>
                                </div>

                                <div className="doctor-detail-row">
                                    <span>Consultation Fee</span>
                                    <strong>
                                        ₹{selectedDoctor.consultationFee.toFixed(2)}
                                    </strong>
                                </div>

                                <div className="doctor-detail-row">
                                    <span>Email</span>
                                    <strong>{selectedDoctor.email}</strong>
                                </div>

                                <div className="doctor-detail-row">
                                    <span>Phone</span>
                                    <strong>{selectedDoctor.phone}</strong>
                                </div>

                                <div className="doctor-detail-row">
                                    <span>Availability</span>
                                    <strong>
                                        {selectedDoctor.available
                                            ? "Available"
                                            : "Unavailable"}
                                    </strong>
                                </div>

                                <button
                                    type="button"
                                    className="doctor-primary-btn doctor-modal-submit"
                                    onClick={() =>
                                        openEditModal(selectedDoctor)
                                    }
                                >
                                    <Pencil size={16} />
                                    Edit Doctor
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="doctor-form-grid">
                                    <label>
                                        Full Name *
                                        <input
                                            required
                                            minLength={2}
                                            value={form.name}
                                            onChange={(event) =>
                                                updateField(
                                                    "name",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="e.g. Dr. Ananya Sharma"
                                        />
                                    </label>

                                    <label>
                                        Specialization *
                                        <select
                                            required
                                            value={form.specialization}
                                            onChange={(event) =>
                                                updateField(
                                                    "specialization",
                                                    event.target.value
                                                )
                                            }
                                        >
                                            <option>General Medicine</option>
                                            <option>Cardiology</option>
                                            <option>Orthopedics</option>
                                            <option>Pediatrics</option>
                                            <option>Neurology</option>
                                            <option>Dermatology</option>
                                            <option>Gynecology</option>
                                            <option>ENT</option>
                                            <option>Ophthalmology</option>
                                            <option>Radiology</option>
                                        </select>
                                    </label>

                                    <label>
                                        Phone Number *
                                        <input
                                            required
                                            type="tel"
                                            pattern="[0-9+\- ]{10,16}"
                                            value={form.phone}
                                            onChange={(event) =>
                                                updateField(
                                                    "phone",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Phone number"
                                        />
                                    </label>

                                    <label>
                                        Email Address *
                                        <input
                                            required
                                            type="email"
                                            value={form.email}
                                            onChange={(event) =>
                                                updateField(
                                                    "email",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="doctor@hospital.com"
                                        />
                                    </label>

                                    <label>
                                        Experience (years) *
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            max={70}
                                            value={form.experienceYears}
                                            onChange={(event) =>
                                                updateField(
                                                    "experienceYears",
                                                    Number(event.target.value)
                                                )
                                            }
                                        />
                                    </label>

                                    <label>
                                        Consultation Fee (₹) *
                                        <input
                                            required
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={form.consultationFee}
                                            onChange={(event) =>
                                                updateField(
                                                    "consultationFee",
                                                    Number(event.target.value)
                                                )
                                            }
                                        />
                                    </label>

                                    <label className="doctor-full-width">
                                        Availability *
                                        <select
                                            value={String(form.available)}
                                            onChange={(event) =>
                                                updateField(
                                                    "available",
                                                    event.target.value === "true"
                                                )
                                            }
                                        >
                                            <option value="true">
                                                Available
                                            </option>
                                            <option value="false">
                                                Unavailable
                                            </option>
                                        </select>
                                    </label>
                                </div>

                                {formError && (
                                    <p role="alert" className="doctor-error-message">
                                        {formError}
                                    </p>
                                )}

                                <div className="doctor-form-actions">
                                    <button
                                        type="button"
                                        className="doctor-secondary-btn"
                                        onClick={closeModal}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="doctor-primary-btn"
                                        disabled={saving}
                                    >
                                        {saving
                                            ? "Saving..."
                                            : modalMode === "edit"
                                                ? "Save Changes"
                                                : "Add Doctor"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

export default Doctors;