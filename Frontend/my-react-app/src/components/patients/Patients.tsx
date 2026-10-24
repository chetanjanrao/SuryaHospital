import { useEffect, useMemo, useState, type SubmitEvent } from "react";

import { Search, Plus, Eye, Pencil, X, Users } from "lucide-react";
import "./Patients.css";

type Patient = {
    id: number;
    name: string;
    age?: number;
    gender?: "Male" | "Female" | "Other";
    phone?: string;
    email: string;
    bloodGroup?: string;
    registeredOn?: string;
};

const API_URL = "http://localhost:8080/api/patients";

const emptyForm = {
    name: "",
    age: "",
    gender: "Male" as Patient["gender"],
    phone: "",
    email: "",
    bloodGroup: "O+",
};

// Reads the XSRF-TOKEN cookie that Spring Security sets.
// Must be synchronous (not async) so it can be used directly inside headers.
function getCsrfToken(): string {
    const match = document.cookie
        .split("; ")
        .find((c) => c.startsWith("XSRF-TOKEN="));
    return match ? decodeURIComponent(match.split("=")[1]) : "";
}

export default function Patients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // loadError: problem loading the list (shown instead of the table)
    // formError: problem saving/deleting (shown in the modal or above the table)
    const [loadError, setLoadError] = useState("");
    const [formError, setFormError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState("");

    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [form, setForm] = useState(emptyForm);

    const filteredPatients = useMemo(() => {
        const query = search.trim().toLowerCase();

        return patients.filter(
            (patient) =>
                patient.name.toLowerCase().includes(query) ||
                String(patient.id).includes(query) ||
                (patient.phone ?? "").includes(query)
        );
    }, [patients, search]);

    function openAddForm() {
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError("");
        setShowForm(true);
    }

    function openEditForm(patient: Patient) {
        setEditingId(patient.id);
        setForm({
            name: patient.name,
            age: patient.age !== undefined ? String(patient.age) : "",
            gender: patient.gender ?? "Male",
            phone: patient.phone ?? "",
            email: patient.email,
            bloodGroup: patient.bloodGroup ?? "O+",
        });
        setFieldErrors({});
        setFormError("");
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError("");
    }

    function validateForm(): boolean {
        const errors: Record<string, string> = {};

        if (!form.name.trim()) {
            errors.name = "Patient name is required.";
        } else if (form.name.trim().length < 2) {
            errors.name = "Name must contain at least 2 characters.";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!form.email.trim()) {
            errors.email = "Email is required.";
        } else if (!emailRegex.test(form.email.trim())) {
            errors.email = "Enter a valid email address.";
        }

        if (form.age.trim() === "") {
            errors.age = "Age is required.";
        } else {
            const age = Number(form.age);
            if (!Number.isInteger(age) || age < 0 || age > 120) {
                errors.age = "Age must be a whole number between 0 and 120.";
            }
        }

        const phone = form.phone.trim();
        if (!phone) {
            errors.phone = "Phone number is required.";
        } else if (!/^\d{10}$/.test(phone)) {
            errors.phone = "Enter a 10-digit phone number.";
        }

        if (!form.gender) {
            errors.gender = "Please select a gender.";
        }

        if (!form.bloodGroup) {
            errors.bloodGroup = "Please select a blood group.";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
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

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError("");
        setSuccessMessage("");

        if (!validateForm()) {
            return;
        }

        setSaving(true);

        const patientData = {
            name: form.name.trim(),
            email: form.email.trim(),
            age: Number(form.age),
            gender: form.gender,
            phone: form.phone.trim(),
            bloodGroup: form.bloodGroup,
            registeredOn: new Date().toISOString().slice(0, 10),
        };

        const isEditing = editingId !== null;

        try {
            const response = await fetch(
                isEditing ? `${API_URL}/${editingId}` : API_URL,
                {
                    method: isEditing ? "PUT" : "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "X-XSRF-TOKEN": getCsrfToken(),
                    },
                    body: JSON.stringify(patientData),
                }
            );

            if (!response.ok) {
                setFormError(
                    await readError(
                        response,
                        isEditing
                            ? "Failed to update patient"
                            : "Failed to save patient"
                    )
                );
                return;
            }

            const savedPatient: Patient = await response.json();

            if (isEditing) {
                setPatients((current) =>
                    current.map((patient) =>
                        patient.id === editingId ? savedPatient : patient
                    )
                );
                setSuccessMessage("Patient updated successfully.");
            } else {
                setPatients((current) => [savedPatient, ...current]);
                setSuccessMessage("Patient added successfully.");
            }

            closeForm();
        } catch (err) {
            setFormError(
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred."
            );
        } finally {
            setSaving(false);
        }
    }

    async function deletePatient(id: number) {
        setFormError("");
        setSuccessMessage("");
        setDeletingId(id);

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "X-XSRF-TOKEN": getCsrfToken(),
                },
            });

            if (!response.ok) {
                setFormError(
                    await readError(response, "Failed to delete patient")
                );
                return;
            }

            setPatients((current) =>
                current.filter((patient) => patient.id !== id)
            );
            setSuccessMessage("Patient deleted successfully.");
        } catch (err) {
            setFormError(
                err instanceof Error
                    ? err.message
                    : "Failed to delete patient"
            );
        } finally {
            setDeletingId(null);
        }
    }

    // Fetch the patient list from the backend when the page loads
    useEffect(() => {
        async function fetchPatients() {
            try {
                const response = await fetch(API_URL, {
                    credentials: "include",
                });

                if (!response.ok) {
                    setLoadError(
                        await readError(response, "Failed to fetch patients")
                    );
                    return;
                }

                const data: Patient[] = await response.json();
                setPatients(data);
            } catch {
                setLoadError(
                    "Unable to load patients. Please check whether the backend is running."
                );
            } finally {
                setLoading(false);
            }
        }

        void fetchPatients();
    }, []);

    return (
        <section className="patients-page">
            {successMessage && (
                <div
                    role="status"
                    className="mb-4 rounded-lg bg-green-50 p-3 text-green-700"
                >
                    {successMessage}
                </div>
            )}

            {/* Errors from delete show here; errors from add/edit show in the modal */}
            {formError && !showForm && (
                <div
                    role="alert"
                    className="mb-4 rounded-lg bg-red-50 p-3 text-red-700"
                >
                    {formError}
                </div>
            )}

            <div className="patients-heading">
                <div>
                    <h1>Patients</h1>
                    <p>Manage patient records and information.</p>
                </div>

                <button className="add-patient-btn" onClick={openAddForm}>
                    <Plus size={18} />
                    Add Patient
                </button>
            </div>

            <div className="patient-stats">
                <div className="patient-stat-card">
                    <div className="patient-stat-icon">
                        <Users size={22} />
                    </div>
                    <div>
                        <p>Total Patients</p>
                        <h2>{patients.length}</h2>
                    </div>
                </div>
            </div>

            <div className="patients-table-card">
                <div className="patients-toolbar">
                    <div>
                        <h2>Patient Directory</h2>
                        <p>View and manage registered patients.</p>
                    </div>

                    <label className="patient-search">
                        <Search size={18} />
                        <input
                            type="search"
                            placeholder="Search name, ID or phone..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                </div>

                {loading ? (
                    <p className="py-8 text-center">Loading patients...</p>
                ) : loadError ? (
                    <p role="alert" className="py-8 text-center text-red-500">
                        {loadError}
                    </p>
                ) : filteredPatients.length === 0 ? (
                    <p className="py-8 text-center">No patients found.</p>
                ) : (
                    <div className="patients-table-wrapper">
                        <table className="patients-table">
                            <thead>
                            <tr>
                                <th>Patient ID</th>
                                <th>Patient</th>
                                <th>Age / Gender</th>
                                <th>Phone</th>
                                <th>Blood Group</th>
                                <th>Registered</th>
                                <th>Actions</th>
                            </tr>
                            </thead>

                            <tbody>
                            {filteredPatients.map((patient) => (
                                <tr key={patient.id}>
                                    <td>PT-{patient.id}</td>
                                    <td>
                                        <div className="patient-name-cell">
                                            <div className="patient-avatar">
                                                {patient.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <strong>{patient.name}</strong>
                                                <span>{patient.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {patient.age ?? " "} / {patient.gender ?? " "}
                                    </td>
                                    <td>{patient.phone ?? " "}</td>
                                    <td>
                                        <span className="blood-group">
                                            {patient.bloodGroup ?? " "}
                                        </span>
                                    </td>
                                    <td>{patient.registeredOn ?? " "}</td>
                                    <td>
                                        <div className="patient-actions">
                                            <button
                                                title="View patient"
                                                aria-label="View patient"
                                                onClick={() => setSelectedPatient(patient)}
                                            >
                                                <Eye size={17} />
                                            </button>
                                            <button
                                                title="Edit patient"
                                                aria-label="Edit patient"
                                                onClick={() => openEditForm(patient)}
                                            >
                                                <Pencil size={17} />
                                            </button>
                                            <button
                                                className="delete-action"
                                                title="Delete patient"
                                                aria-label="Delete patient"
                                                disabled={deletingId === patient.id}
                                                onClick={() => void deletePatient(patient.id)}
                                            >
                                                {deletingId === patient.id
                                                    ? "Deleting..."
                                                    : "Delete"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showForm && (
                <div className="patient-modal-backdrop">
                    <form className="patient-modal" onSubmit={handleSubmit}>
                        <div className="patient-modal-heading">
                            <div>
                                <h2>{editingId !== null ? "Edit Patient" : "Add Patient"}</h2>
                                <p>Enter the patient's information.</p>
                            </div>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeForm}
                                aria-label="Close form"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {formError && (
                            <div
                                role="alert"
                                className="mb-4 rounded-lg bg-red-50 p-3 text-red-700"
                            >
                                {formError}
                            </div>
                        )}

                        <div className="patient-form-grid">
                            <label>
                                Full Name
                                <input
                                    required
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm({ ...form, name: e.target.value })
                                    }
                                    placeholder="Enter full name"
                                />
                                {fieldErrors.name && (
                                    <p className="text-sm text-red-500">
                                        {fieldErrors.name}
                                    </p>
                                )}
                            </label>

                            <label>
                                Age
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={form.age}
                                    onChange={(e) =>
                                        setForm({ ...form, age: e.target.value })
                                    }
                                    placeholder="Enter age"
                                />
                                {fieldErrors.age && (
                                    <p className="text-sm text-red-500">
                                        {fieldErrors.age}
                                    </p>
                                )}
                            </label>

                            <label>
                                Gender
                                <select
                                    value={form.gender}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            gender: e.target.value as Patient["gender"],
                                        })
                                    }
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                                {fieldErrors.gender && (
                                    <p className="text-sm text-red-500">
                                        {fieldErrors.gender}
                                    </p>
                                )}
                            </label>

                            <label>
                                Phone
                                <input
                                    required
                                    type="tel"
                                    pattern="[0-9]{10}"
                                    title="Enter a 10-digit phone number"
                                    value={form.phone}
                                    onChange={(e) =>
                                        setForm({ ...form, phone: e.target.value })
                                    }
                                    placeholder="10-digit phone number"
                                />
                                {fieldErrors.phone && (
                                    <p className="text-sm text-red-500">
                                        {fieldErrors.phone}
                                    </p>
                                )}
                            </label>

                            <label className="patient-form-full">
                                Email
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm({ ...form, email: e.target.value })
                                    }
                                    placeholder="patient@example.com"
                                />
                                {fieldErrors.email && (
                                    <p className="text-sm text-red-500">
                                        {fieldErrors.email}
                                    </p>
                                )}
                            </label>

                            <label>
                                Blood Group
                                <select
                                    value={form.bloodGroup}
                                    onChange={(e) =>
                                        setForm({ ...form, bloodGroup: e.target.value })
                                    }
                                >
                                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                                        (group) => (
                                            <option key={group}>{group}</option>
                                        )
                                    )}
                                </select>
                                {fieldErrors.bloodGroup && (
                                    <p className="text-sm text-red-500">
                                        {fieldErrors.bloodGroup}
                                    </p>
                                )}
                            </label>
                        </div>

                        <div className="patient-modal-actions">
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={closeForm}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="add-patient-btn"
                            >
                                {saving
                                    ? "Saving..."
                                    : editingId !== null
                                        ? "Update Patient"
                                        : "Add Patient"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {selectedPatient && (
                <div className="patient-modal-backdrop">
                    <div className="patient-modal patient-details-modal">
                        <div className="patient-modal-heading">
                            <div>
                                <h2>Patient Details</h2>
                                <p>PT-{selectedPatient.id}</p>
                            </div>
                            <button
                                className="modal-close"
                                onClick={() => setSelectedPatient(null)}
                                aria-label="Close details"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <h3>{selectedPatient.name}</h3>
                        <p>Email: {selectedPatient.email}</p>
                        <p>Age: {selectedPatient.age}</p>
                        <p>Gender: {selectedPatient.gender}</p>
                        <p>Phone: {selectedPatient.phone}</p>
                        <p>Blood group: {selectedPatient.bloodGroup}</p>
                        <p>Registered: {selectedPatient.registeredOn}</p>
                    </div>
                </div>
            )}
        </section>
    );
}