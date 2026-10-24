import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
    Search,
    Plus,
    Building2,
    Users,
    Stethoscope,
    BedDouble,
    Eye,
    Pencil,
    X,
} from "lucide-react";
import "./Departments.css";

const API_URL = "http://localhost:8080/api/departments";

type DepartmentStatus = "Active" | "Inactive";

interface Department {
    id: number;
    name: string;
    code: string;
    head: string;
    location: string;
    doctors: number;
    beds: number;
    description: string;
    status: DepartmentStatus;
}

interface DepartmentForm {
    name: string;
    code: string;
    head: string;
    location: string;
    doctors: string;
    beds: string;
    description: string;
    status: DepartmentStatus;
}

const emptyForm: DepartmentForm = {
    name: "",
    code: "",
    head: "",
    location: "",
    doctors: "0",
    beds: "0",
    description: "",
    status: "Active",
};

// Read the CSRF token set by Spring Security's CookieCsrfTokenRepository.
// Cookies are scoped to the host, not the port, so this can read XSRF-TOKEN
// when both the frontend and backend use localhost.
function getCsrfToken(): string | null {
    const csrfCookie = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("XSRF-TOKEN="));

    if (!csrfCookie) {
        return null;
    }

    return decodeURIComponent(csrfCookie.substring("XSRF-TOKEN=".length));
}

async function apiRequest<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    // Spring Security requires the CSRF token header for POST/PUT/PATCH/DELETE.
    const method = (options.method ?? "GET").toUpperCase();
    const isUnsafeMethod = !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method);

    if (isUnsafeMethod) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            headers.set("X-XSRF-TOKEN", csrfToken);
        }
    }

    const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            errorText || `Request failed with status ${response.status}`
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    // Some successful endpoints (for example, a no-content response) may not
    // return JSON. Handle an empty body safely.
    const responseText = await response.text();
    if (!responseText) {
        return undefined as T;
    }

    return JSON.parse(responseText) as T;
}

export default function Departments() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedDepartment, setSelectedDepartment] =
        useState<Department | null>(null);
    const [form, setForm] = useState<DepartmentForm>(emptyForm);

    // GET: Load departments from Spring Boot
    useEffect(() => {
        let isMounted = true;

        const loadDepartments = async () => {
            try {
                setLoading(true);
                setError("");

                const data = await apiRequest<Department[]>(API_URL);

                if (isMounted) {
                    setDepartments(data);
                }
            } catch (err) {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load departments."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void loadDepartments();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredDepartments = departments.filter((department) => {
        const searchableText = [
            department.name,
            department.code,
            department.head,
            department.location,
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchableText.includes(
            search.toLowerCase()
        );

        const matchesStatus =
            statusFilter === "All" ||
            department.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalDoctors = departments.reduce(
        (total, department) => total + (department.doctors ?? 0),
        0
    );

    const totalBeds = departments.reduce(
        (total, department) => total + (department.beds ?? 0),
        0
    );

    const activeDepartments = departments.filter(
        (department) => department.status === "Active"
    ).length;

    const openAddForm = () => {
        setError("");
        setSuccessMessage("");
        setForm({ ...emptyForm });
        setEditingId(null);
        setShowForm(true);
    };

    const openEditForm = (department: Department) => {
        setError("");
        setSuccessMessage("");

        setForm({
            name: department.name,
            code: department.code,
            head: department.head,
            location: department.location,
            doctors: String(department.doctors),
            beds: String(department.beds),
            description: department.description ?? "",
            status: department.status,
        });

        setEditingId(department.id);
        setSelectedDepartment(null);
        setShowForm(true);
    };

    // POST: Create department; PUT: Update department
    const handleSaveDepartment = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError("");
        setSuccessMessage("");

        const normalizedCode = form.code.trim().toLowerCase();

        const duplicateCode = departments.some(
            (department) =>
                department.code.trim().toLowerCase() === normalizedCode &&
                department.id !== editingId
        );

        if (duplicateCode) {
            setError("This department code already exists.");
            return;
        }

        const departmentData = {
            name: form.name.trim(),
            code: form.code.trim(),
            head: form.head.trim(),
            location: form.location.trim(),
            doctors: Number(form.doctors),
            beds: Number(form.beds),
            description: form.description.trim(),
            status: form.status,
        };

        try {
            setSaving(true);

            if (editingId !== null) {
                const updatedDepartment = await apiRequest<Department>(
                    `${API_URL}/${editingId}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(departmentData),
                    }
                );

                setDepartments((previous) =>
                    previous.map((department) =>
                        department.id === editingId
                            ? updatedDepartment
                            : department
                    )
                );

                setSelectedDepartment((previous) =>
                    previous?.id === editingId
                        ? updatedDepartment
                        : previous
                );

                setSuccessMessage("Department updated successfully.");
            } else {
                const createdDepartment = await apiRequest<Department>(
                    API_URL,
                    {
                        method: "POST",
                        body: JSON.stringify(departmentData),
                    }
                );

                setDepartments((previous) => [
                    createdDepartment,
                    ...previous,
                ]);

                setSuccessMessage("Department added successfully.");
            }

            setShowForm(false);
            setEditingId(null);
            setForm({ ...emptyForm });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save department."
            );
        } finally {
            setSaving(false);
        }
    };

    // PUT: Persist Active/Inactive status in the database
    const toggleStatus = async (department: Department) => {
        setError("");
        setSuccessMessage("");

        const newStatus: DepartmentStatus =
            department.status === "Active" ? "Inactive" : "Active";

        const updatedData = {
            name: department.name,
            code: department.code,
            head: department.head,
            location: department.location,
            doctors: department.doctors,
            beds: department.beds,
            description: department.description ?? "",
            status: newStatus,
        };

        try {
            const updatedDepartment = await apiRequest<Department>(
                `${API_URL}/${department.id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(updatedData),
                }
            );

            setDepartments((previous) =>
                previous.map((item) =>
                    item.id === department.id
                        ? updatedDepartment
                        : item
                )
            );

            setSelectedDepartment((previous) =>
                previous?.id === department.id
                    ? updatedDepartment
                    : previous
            );

            setSuccessMessage(
                `Department ${newStatus === "Active" ? "activated" : "deactivated"} successfully.`
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update department status."
            );
        }
    };

    return (
        <div className="departments-page">
            <div className="departments-header">
                <div>
                    <h1>Departments</h1>
                    <p>Manage hospital departments and their resources.</p>
                </div>

                <button
                    className="department-primary-btn"
                    onClick={openAddForm}
                >
                    <Plus size={18} />
                    Add Department
                </button>
            </div>

            {error && (
                <div className="department-error" role="alert">
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

            {successMessage && (
                <div className="department-success" role="status">
                    {successMessage}
                    <button
                        type="button"
                        onClick={() => setSuccessMessage("")}
                        aria-label="Dismiss message"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="department-stats">
                <div className="department-stat-card">
                    <div className="department-stat-icon blue">
                        <Building2 size={23} />
                    </div>
                    <div>
                        <p>Total Departments</p>
                        <h2>{departments.length}</h2>
                    </div>
                </div>

                <div className="department-stat-card">
                    <div className="department-stat-icon purple">
                        <Stethoscope size={23} />
                    </div>
                    <div>
                        <p>Total Doctors</p>
                        <h2>{totalDoctors}</h2>
                    </div>
                </div>

                <div className="department-stat-card">
                    <div className="department-stat-icon green">
                        <BedDouble size={23} />
                    </div>
                    <div>
                        <p>Total Beds</p>
                        <h2>{totalBeds}</h2>
                    </div>
                </div>

                <div className="department-stat-card">
                    <div className="department-stat-icon orange">
                        <Users size={23} />
                    </div>
                    <div>
                        <p>Active Departments</p>
                        <h2>{activeDepartments}</h2>
                    </div>
                </div>
            </div>

            <div className="departments-toolbar">
                <div className="department-search">
                    <Search size={19} />
                    <input
                        type="text"
                        placeholder="Search departments, code, head..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <select
                    aria-label="Filter departments by status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                >
                    <option value="All">All Departments</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </div>

            <div className="departments-grid">
                {loading && (
                    <div className="department-empty">
                        <Building2 size={32} />
                        <h3>Loading departments...</h3>
                        <p>Please wait while we load data from the server.</p>
                    </div>
                )}

                {!loading &&
                    filteredDepartments.map((department) => (
                        <article
                            className="department-card"
                            key={department.id}
                        >
                            <div className="department-card-header">
                                <div className="department-card-icon">
                                    <Building2 size={23} />
                                </div>

                                <span
                                    className={`department-status ${department.status.toLowerCase()}`}
                                >
                                    {department.status}
                                </span>
                            </div>

                            <div className="department-card-title">
                                <h2>{department.name}</h2>
                                <span>{department.code}</span>
                            </div>

                            <p className="department-description">
                                {department.description}
                            </p>

                            <div className="department-head-info">
                                <span>Department Head</span>
                                <strong>{department.head}</strong>
                            </div>

                            <div className="department-location">
                                <Building2 size={15} />
                                <span>{department.location}</span>
                            </div>

                            <div className="department-resources">
                                <div>
                                    <Stethoscope size={17} />
                                    <span>Doctors</span>
                                    <strong>{department.doctors}</strong>
                                </div>

                                <div>
                                    <BedDouble size={17} />
                                    <span>Beds</span>
                                    <strong>{department.beds}</strong>
                                </div>
                            </div>

                            <div className="department-card-actions">
                                <button
                                    className="department-view-btn"
                                    onClick={() =>
                                        setSelectedDepartment(department)
                                    }
                                >
                                    <Eye size={16} />
                                    View Details
                                </button>

                                <button
                                    className="department-edit-btn"
                                    onClick={() => openEditForm(department)}
                                    aria-label={`Edit ${department.name}`}
                                >
                                    <Pencil size={16} />
                                </button>
                            </div>
                        </article>
                    ))}

                {!loading && filteredDepartments.length === 0 && (
                    <div className="department-empty">
                        <Building2 size={32} />
                        <h3>No departments found</h3>
                        <p>
                            Try another search or change the status filter.
                        </p>
                    </div>
                )}
            </div>

            {showForm && (
                <div className="department-modal-overlay">
                    <div className="department-modal">
                        <div className="department-modal-header">
                            <div>
                                <h2>
                                    {editingId !== null
                                        ? "Edit Department"
                                        : "Add Department"}
                                </h2>
                                <p>
                                    Enter the department information below.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="department-close-btn"
                                onClick={() => setShowForm(false)}
                                aria-label="Close form"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveDepartment}>
                            <div className="department-form-grid">
                                <div className="department-form-field">
                                    <label htmlFor="department-name">
                                        Department Name
                                    </label>
                                    <input
                                        id="department-name"
                                        required
                                        value={form.name}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                name: event.target.value,
                                            })
                                        }
                                        placeholder="e.g. Cardiology"
                                    />
                                </div>

                                <div className="department-form-field">
                                    <label htmlFor="department-code">
                                        Department Code
                                    </label>
                                    <input
                                        id="department-code"
                                        required
                                        value={form.code}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                code: event.target.value,
                                            })
                                        }
                                        placeholder="e.g. CARD-007"
                                    />
                                </div>

                                <div className="department-form-field">
                                    <label htmlFor="department-head">
                                        Department Head
                                    </label>
                                    <input
                                        id="department-head"
                                        required
                                        value={form.head}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                head: event.target.value,
                                            })
                                        }
                                        placeholder="Enter doctor name"
                                    />
                                </div>

                                <div className="department-form-field">
                                    <label htmlFor="department-location">
                                        Location
                                    </label>
                                    <input
                                        id="department-location"
                                        required
                                        value={form.location}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                location: event.target.value,
                                            })
                                        }
                                        placeholder="e.g. Block A - Floor 2"
                                    />
                                </div>

                                <div className="department-form-field">
                                    <label htmlFor="department-doctors">
                                        Number of Doctors
                                    </label>
                                    <input
                                        id="department-doctors"
                                        type="number"
                                        min="0"
                                        required
                                        value={form.doctors}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                doctors: event.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="department-form-field">
                                    <label htmlFor="department-beds">
                                        Number of Beds
                                    </label>
                                    <input
                                        id="department-beds"
                                        type="number"
                                        min="0"
                                        required
                                        value={form.beds}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                beds: event.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="department-form-field">
                                    <label htmlFor="department-status">
                                        Status
                                    </label>
                                    <select
                                        id="department-status"
                                        value={form.status}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                status: event.target.value as DepartmentStatus,
                                            })
                                        }
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                                <div className="department-form-field full-width">
                                    <label htmlFor="department-description">
                                        Description
                                    </label>
                                    <textarea
                                        id="department-description"
                                        rows={3}
                                        value={form.description}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                description: event.target.value,
                                            })
                                        }
                                        placeholder="Describe the department..."
                                    />
                                </div>
                            </div>

                            <div className="department-form-actions">
                                <button
                                    type="button"
                                    className="department-cancel-btn"
                                    onClick={() => setShowForm(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="department-primary-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingId !== null
                                            ? "Save Changes"
                                            : "Add Department"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedDepartment && (
                <div className="department-modal-overlay">
                    <div className="department-modal department-details-modal">
                        <div className="department-modal-header">
                            <div>
                                <h2>{selectedDepartment.name}</h2>
                                <p>{selectedDepartment.code}</p>
                            </div>

                            <button
                                type="button"
                                className="department-close-btn"
                                onClick={() => setSelectedDepartment(null)}
                                aria-label="Close department details"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <div className="department-details-list">
                            <div>
                                <span>Department Head</span>
                                <strong>{selectedDepartment.head}</strong>
                            </div>

                            <div>
                                <span>Location</span>
                                <strong>{selectedDepartment.location}</strong>
                            </div>

                            <div>
                                <span>Total Doctors</span>
                                <strong>{selectedDepartment.doctors}</strong>
                            </div>

                            <div>
                                <span>Total Beds</span>
                                <strong>{selectedDepartment.beds}</strong>
                            </div>

                            <div>
                                <span>Status</span>
                                <strong>{selectedDepartment.status}</strong>
                            </div>

                            <div className="department-detail-description">
                                <span>Description</span>
                                <p>
                                    {selectedDepartment.description ||
                                        "No description available."}
                                </p>
                            </div>
                        </div>

                        <div className="department-form-actions">
                            <button
                                className="department-cancel-btn"
                                onClick={() => void toggleStatus(selectedDepartment)}
                            >
                                {selectedDepartment.status === "Active"
                                    ? "Deactivate"
                                    : "Activate"}
                            </button>

                            <button
                                className="department-primary-btn"
                                onClick={() =>
                                    openEditForm(selectedDepartment)
                                }
                            >
                                <Pencil size={16} />
                                Edit Department
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}