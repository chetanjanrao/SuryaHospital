import { useEffect, useState, type SubmitEvent } from "react";
import {
    CalendarDays,
    Clock,
    Search,
    Plus,
    X,
} from "lucide-react";
import "./Appointments.css";

const API_URL = "http://localhost:8080/api";

type AppointmentStatus =
    | "SCHEDULED"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED";

interface Patient {
    id: number;
    name: string;
    email: string;
}

interface Doctor {
    id: number;
    name: string;
    specialization: string;
}

interface Appointment {
    id: number;
    patient: Patient;
    doctor: Doctor;
    appointmentDate: string;
    appointmentTime: string;
    reason: string;
    status: AppointmentStatus;
}

interface AppointmentForm {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason: string;
}

const emptyForm: AppointmentForm = {
    patientId: "",
    doctorId: "",
    date: "",
    time: "",
    reason: "",
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

export default function Appointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState<AppointmentForm>({
        ...emptyForm,
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // loadError: problem loading data (shown at the top of the page)
    // formError: problem creating an appointment (shown inside the modal)
    const [loadError, setLoadError] = useState("");
    const [formError, setFormError] = useState("");
    const [success, setSuccess] = useState("");

    // Load appointments, patients, and doctors from Spring Boot
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setLoadError("");

                const [
                    appointmentsResponse,
                    patientsResponse,
                    doctorsResponse,
                ] = await Promise.all([
                    fetch(`${API_URL}/appointments`, { credentials: "include" }),
                    fetch(`${API_URL}/patients`, { credentials: "include" }),
                    fetch(`${API_URL}/doctors`, { credentials: "include" }),
                ]);

                if (!appointmentsResponse.ok) {
                    setLoadError(
                        await readError(
                            appointmentsResponse,
                            "Failed to load appointments"
                        )
                    );
                    return;
                }

                if (!patientsResponse.ok) {
                    setLoadError(
                        await readError(
                            patientsResponse,
                            "Failed to load patients"
                        )
                    );
                    return;
                }

                if (!doctorsResponse.ok) {
                    setLoadError(
                        await readError(
                            doctorsResponse,
                            "Failed to load doctors"
                        )
                    );
                    return;
                }

                const appointmentsData: Appointment[] =
                    await appointmentsResponse.json();

                const patientsData: Patient[] =
                    await patientsResponse.json();

                const doctorsData: Doctor[] =
                    await doctorsResponse.json();

                setAppointments(appointmentsData);
                setPatients(patientsData);
                setDoctors(doctorsData);
            } catch (err: unknown) {
                setLoadError(
                    err instanceof Error
                        ? err.message
                        : "Unable to connect to the backend."
                );
            } finally {
                setLoading(false);
            }
        };

        void fetchData();
    }, []);

    // Search and filter appointments
    const filteredAppointments = appointments.filter((appointment) => {
        const patientName = appointment.patient?.name ?? "";
        const doctorName = appointment.doctor?.name ?? "";

        const matchesSearch =
            patientName.toLowerCase().includes(search.toLowerCase()) ||
            doctorName.toLowerCase().includes(search.toLowerCase());

        const matchesFilter =
            filter === "All" || appointment.status === filter;

        return matchesSearch && matchesFilter;
    });

    const openForm = () => {
        setForm({ ...emptyForm });
        setFormError("");
        setSuccess("");
        setShowForm(true);
    };

    const closeForm = () => {
        if (submitting) return;

        setShowForm(false);
        setFormError("");
    };

    // Create a new appointment in the backend
    const handleAddAppointment = async (
        event: SubmitEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (submitting) return;

        try {
            setSubmitting(true);
            setFormError("");
            setSuccess("");

            const requestBody = {
                appointmentDate: form.date,
                appointmentTime:
                    form.time.length === 5
                        ? `${form.time}:00`
                        : form.time,
                reason: form.reason.trim(),
                status: "SCHEDULED",
                patient: {
                    id: Number(form.patientId),
                },
                doctor: {
                    id: Number(form.doctorId),
                },
            };

            const response = await fetch(`${API_URL}/appointments`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                setFormError(
                    await readError(
                        response,
                        "Failed to create appointment"
                    )
                );
                return;
            }

            const savedAppointment: Appointment = await response.json();

            setAppointments((previous) => [
                savedAppointment,
                ...previous,
            ]);

            setForm({ ...emptyForm });
            setShowForm(false);
            setSuccess("Appointment created successfully.");
        } catch (err: unknown) {
            setFormError(
                err instanceof Error
                    ? err.message
                    : "Unable to create appointment."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // Update status in the current UI only (not saved to the backend yet)
    const updateStatus = (
        id: number,
        status: AppointmentStatus
    ) => {
        setAppointments((previous) =>
            previous.map((appointment) =>
                appointment.id === id
                    ? { ...appointment, status }
                    : appointment
            )
        );
    };

    return (
        <div className="appointments-page">
            <div className="appointments-header">
                <div>
                    <h1>Appointments</h1>
                    <p>Manage patient appointments and schedules.</p>
                </div>

                <button
                    type="button"
                    className="appointment-add-btn"
                    onClick={openForm}
                >
                    <Plus size={18} />
                    New Appointment
                </button>
            </div>

            {loading && <p>Loading appointments...</p>}

            {loadError && (
                <p className="appointment-error" role="alert">
                    {loadError}
                </p>
            )}

            {success && (
                <p className="appointment-success" role="status">
                    {success}
                </p>
            )}

            <div className="appointment-stats">
                <div className="appointment-stat-card">
                    <CalendarDays size={24} />
                    <div>
                        <p>Total Appointments</p>
                        <h2>{appointments.length}</h2>
                    </div>
                </div>

                <div className="appointment-stat-card">
                    <Clock size={24} />
                    <div>
                        <p>Scheduled</p>
                        <h2>
                            {
                                appointments.filter(
                                    (a) =>
                                        a.status === "SCHEDULED" ||
                                        a.status === "CONFIRMED"
                                ).length
                            }
                        </h2>
                    </div>
                </div>

                <div className="appointment-stat-card">
                    <CalendarDays size={24} />
                    <div>
                        <p>Completed</p>
                        <h2>
                            {
                                appointments.filter(
                                    (a) => a.status === "COMPLETED"
                                ).length
                            }
                        </h2>
                    </div>
                </div>
            </div>

            <div className="appointment-toolbar">
                <div className="appointment-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search patient or doctor..."
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                    />
                </div>

                <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    aria-label="Filter appointments by status"
                >
                    <option value="All">All Statuses</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            <div className="appointment-table-wrapper">
                <table className="appointment-table">
                    <thead>
                    <tr>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Update Status</th>
                    </tr>
                    </thead>

                    <tbody>
                    {filteredAppointments.map((appointment) => (
                        <tr key={appointment.id}>
                            <td>
                                {appointment.patient?.name ?? "Unknown"}
                            </td>
                            <td>
                                {appointment.doctor?.name ?? "Unknown"}
                            </td>
                            <td>{appointment.appointmentDate}</td>
                            <td>
                                {appointment.appointmentTime?.slice(0, 5)}
                            </td>
                            <td>{appointment.reason}</td>
                            <td>
                                <span
                                    className={`appointment-status ${appointment.status.toLowerCase()}`}
                                >
                                    {appointment.status
                                            .charAt(0)
                                            .toUpperCase() +
                                        appointment.status
                                            .slice(1)
                                            .toLowerCase()}
                                </span>
                            </td>
                            <td>
                                <select
                                    aria-label={`Status for ${appointment.patient?.name ?? "appointment"}`}
                                    value={appointment.status}
                                    onChange={(event) =>
                                        updateStatus(
                                            appointment.id,
                                            event.target.value as AppointmentStatus
                                        )
                                    }
                                >
                                    <option value="SCHEDULED">
                                        Scheduled
                                    </option>
                                    <option value="CONFIRMED">
                                        Confirmed
                                    </option>
                                    <option value="COMPLETED">
                                        Completed
                                    </option>
                                    <option value="CANCELLED">
                                        Cancelled
                                    </option>
                                </select>
                            </td>
                        </tr>
                    ))}

                    {!loading && filteredAppointments.length === 0 && (
                        <tr>
                            <td
                                colSpan={7}
                                className="appointment-empty"
                            >
                                No appointments found.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="appointment-modal-overlay">
                    <div className="appointment-modal">
                        <div className="appointment-modal-header">
                            <h2>New Appointment</h2>

                            <button
                                type="button"
                                className="appointment-close-btn"
                                onClick={closeForm}
                                aria-label="Close form"
                                disabled={submitting}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddAppointment}>
                            <label htmlFor="appointment-patient">
                                Patient
                            </label>
                            <select
                                id="appointment-patient"
                                required
                                value={form.patientId}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        patientId: event.target.value,
                                    })
                                }
                            >
                                <option value="">Select a patient</option>
                                {patients.map((patient) => (
                                    <option
                                        key={patient.id}
                                        value={patient.id}
                                    >
                                        {patient.name} (ID: {patient.id})
                                    </option>
                                ))}
                            </select>

                            <label htmlFor="appointment-doctor">
                                Doctor
                            </label>
                            <select
                                id="appointment-doctor"
                                required
                                value={form.doctorId}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        doctorId: event.target.value,
                                    })
                                }
                            >
                                <option value="">Select a doctor</option>
                                {doctors.map((doctor) => (
                                    <option
                                        key={doctor.id}
                                        value={doctor.id}
                                    >
                                        {doctor.name} — {doctor.specialization}
                                    </option>
                                ))}
                            </select>

                            <label htmlFor="appointment-date">Date</label>
                            <input
                                id="appointment-date"
                                required
                                type="date"
                                value={form.date}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        date: event.target.value,
                                    })
                                }
                            />

                            <label htmlFor="appointment-time">Time</label>
                            <input
                                id="appointment-time"
                                required
                                type="time"
                                value={form.time}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        time: event.target.value,
                                    })
                                }
                            />

                            <label htmlFor="appointment-reason">
                                Reason for Visit
                            </label>
                            <input
                                id="appointment-reason"
                                required
                                value={form.reason}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        reason: event.target.value,
                                    })
                                }
                                placeholder="e.g. General Checkup"
                            />

                            {formError && (
                                <p
                                    className="appointment-error"
                                    role="alert"
                                >
                                    {formError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="appointment-add-btn appointment-submit-btn"
                            >
                                {submitting
                                    ? "Saving..."
                                    : "Schedule Appointment"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}