
import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";

import {
    BedDouble,
    CalendarDays,
    ChevronDown,
    Clock,
    Users,
    Stethoscope,
    Building2,
} from "lucide-react";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

import type { LayoutContextType } from "../../Layout";

const API_BASE_URL = "http://localhost:8080/api";

type ApiRecord = Record<string, any>;

type AppointmentRow = {
    id: string;
    name: string;
    initials: string;
    department: string;
    doctor: string;
    time: string;
    status: string;
    appointmentDate: string;
};

type ChartRow = {
    day: string;
    appointments: number;
};

// Safely read a property from an API object.
const getValue = (
    record: ApiRecord,
    keys: string[],
    fallback: any = ""
): any => {
    for (const key of keys) {
        if (record?.[key] !== undefined && record[key] !== null) {
            return record[key];
        }
    }

    return fallback;
};

// Extract arrays from common Spring Boot response formats.
const getArray = (data: any): ApiRecord[] => {
    if (Array.isArray(data)) {
        return data;
    }

    if (!data || typeof data !== "object") {
        throw new Error("API returned an invalid JSON response.");
    }

    const candidates = [
        data.content,
        data.data,
        data.items,
        data.results,
        data.patients,
        data.doctors,
        data.appointments,
        data.beds,
        data.departments,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }

        if (candidate && typeof candidate === "object") {
            try {
                return getArray(candidate);
            } catch {
                // Try the next recognized response property.
            }
        }
    }

    if (
        data.totalElements === 0 ||
        data.totalCount === 0
    ) {
        return [];
    }

    throw new Error(
        `Unexpected API response: ${JSON.stringify(data).slice(0, 200)}`
    );
};

const getInitials = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "NA";

const parseDate = (value: any): Date | null => {
    if (!value) return null;

    // Handle date-only values as local calendar dates.
    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
};

const isSameDay = (first: Date, second: Date): boolean =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

const formatTime = (value: any): string => {
    if (!value) return "—";

    // Java LocalTime, e.g. "09:30:00".
    if (
        typeof value === "string" &&
        /^\d{2}:\d{2}(:\d{2})?$/.test(value)
    ) {
        const [hours, minutes] = value.split(":").map(Number);
        const suffix = hours >= 12 ? "PM" : "AM";
        const displayHour = hours % 12 || 12;

        return `${String(displayHour).padStart(2, "0")}:${String(
            minutes
        ).padStart(2, "0")} ${suffix}`;
    }

    const date = parseDate(value);

    return date
        ? date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        })
        : String(value);
};

const formatDate = (value: any): string => {
    const date = parseDate(value);

    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const normaliseStatus = (value: any): string => {
    const status = String(value || "Scheduled")
        .trim()
        .toLowerCase();

    return status.charAt(0).toUpperCase() + status.slice(1);
};

const getAppointmentDate = (appointment: ApiRecord): any =>
    getValue(appointment, [
        "appointmentDate",
        "date",
        "scheduledDate",
        "appointmentDatetime",
        "appointmentDateTime",
        "dateTime",
    ]);

const getAppointmentTime = (appointment: ApiRecord): any =>
    getValue(appointment, [
        "appointmentTime",
        "time",
        "scheduledTime",
    ]);

const getRelatedName = (
    appointment: ApiRecord,
    objectKeys: string[],
    nameKeys: string[],
    directKeys: string[],
    fallback: string
): string => {
    const related = getValue(appointment, objectKeys, null);

    if (related && typeof related === "object") {
        return String(getValue(related, nameKeys, fallback));
    }

    return String(getValue(appointment, directKeys, fallback));
};

function Dashboard() {
    const { search, setSearch } =
        useOutletContext<LayoutContextType>();

    const navigate = useNavigate();

    const [patients, setPatients] = useState<ApiRecord[]>([]);
    const [doctors, setDoctors] = useState<ApiRecord[]>([]);
    const [appointments, setAppointments] = useState<ApiRecord[]>([]);
    const [beds, setBeds] = useState<ApiRecord[]>([]);
    const [departments, setDepartments] = useState<ApiRecord[]>([]);

    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState<string[]>([]);
    const [reloadKey, setReloadKey] = useState(0);

    // Load each API independently so one failed endpoint does not
    // prevent the other dashboard sections from displaying data.
    useEffect(() => {
        const controller = new AbortController();

        const fetchEndpoint = async (
            endpoint: string
        ): Promise<ApiRecord[]> => {
            const url = `${API_BASE_URL}/${endpoint}`;

            const response = await fetch(url, {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(
                    `${endpoint}: HTTP ${response.status}`
                );
            }

            const data = await response.json();

            console.log(`[Dashboard] ${endpoint} response:`, data);

            return getArray(data);
        };

        const loadDashboard = async () => {
            setLoading(true);
            setErrors([]);

            const endpoints = [
                "patients",
                "doctors",
                "appointments",
                "beds",
                "departments",
            ];

            const setters = [
                setPatients,
                setDoctors,
                setAppointments,
                setBeds,
                setDepartments,
            ];

            try {
                const results = await Promise.allSettled(
                    endpoints.map((endpoint) =>
                        fetchEndpoint(endpoint)
                    )
                );

                if (controller.signal.aborted) return;

                const messages: string[] = [];

                results.forEach((result, index) => {
                    if (result.status === "fulfilled") {
                        setters[index](result.value);
                    } else {
                        const message =
                            result.reason instanceof Error
                                ? result.reason.message
                                : `${endpoints[index]}: Unable to load data`;

                        console.error(
                            `[Dashboard] ${endpoints[index]} failed:`,
                            result.reason
                        );

                        setters[index]([]);
                        messages.push(message);
                    }
                });

                setErrors(messages);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error(
                        "[Dashboard] Loading error:",
                        error
                    );

                    setErrors([
                        error instanceof Error
                            ? error.message
                            : "Unable to load dashboard data.",
                    ]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void loadDashboard();

        return () => controller.abort();
    }, [reloadKey]);

    const today = new Date();

    // Appointments scheduled for today.
    const todayAppointments = useMemo(
        () =>
            appointments.filter((appointment) => {
                const date = parseDate(getAppointmentDate(appointment));

                return date ? isSameDay(date, today) : false;
            }),
        [appointments, today.toDateString()]
    );

    // Count available beds.
    const availableBeds = useMemo(
        () =>
            beds.filter((bed) => {
                const available = getValue(
                    bed,
                    ["available", "isAvailable"],
                    undefined
                );

                if (typeof available === "boolean") {
                    return available;
                }

                const status = String(
                    getValue(bed, ["status", "bedStatus"], "")
                ).toLowerCase();

                return ["available", "vacant", "free"].includes(status);
            }).length,
        [beds]
    );

    // Weekly appointment chart, Monday through Sunday.
    const weeklyChartData: ChartRow[] = useMemo(() => {
        const days: ChartRow[] = [];
        const startOfWeek = new Date(today);

        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(
            startOfWeek.getDate() -
            ((startOfWeek.getDay() + 6) % 7)
        );

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);

            const count = appointments.filter((appointment) => {
                const appointmentDate = parseDate(
                    getAppointmentDate(appointment)
                );

                return appointmentDate
                    ? isSameDay(appointmentDate, date)
                    : false;
            }).length;

            days.push({
                day: date.toLocaleDateString("en-IN", {
                    weekday: "short",
                }),
                appointments: count,
            });
        }

        return days;
    }, [appointments, today.toDateString()]);

    // Transform API appointment objects for the recent appointments table.
    const recentAppointments: AppointmentRow[] = useMemo(
        () =>
            appointments
                .map((appointment) => {
                    const patientName = getRelatedName(
                        appointment,
                        ["patient", "patientDetails"],
                        ["name", "fullName", "patientName"],
                        ["patientName"],
                        "Unknown Patient"
                    );

                    const doctorName = getRelatedName(
                        appointment,
                        ["doctor", "doctorDetails"],
                        ["name", "fullName", "doctorName"],
                        ["doctorName"],
                        "Not assigned"
                    );

                    const departmentValue = getValue(
                        appointment,
                        ["department", "specialization"],
                        "—"
                    );

                    const department =
                        departmentValue &&
                        typeof departmentValue === "object"
                            ? getValue(
                                departmentValue,
                                ["name", "departmentName"],
                                "—"
                            )
                            : departmentValue || "—";

                    const dateValue = getAppointmentDate(appointment);
                    const timeValue = getAppointmentTime(appointment);

                    return {
                        id: String(
                            getValue(
                                appointment,
                                ["appointmentNumber", "appointmentId", "id"],
                                "—"
                            )
                        ),
                        name: patientName,
                        initials: getInitials(patientName),
                        department: String(department),
                        doctor: doctorName,
                        time: formatTime(
                            timeValue ||
                            (typeof dateValue === "string" &&
                            dateValue.includes("T")
                                ? dateValue
                                : "")
                        ),
                        status: normaliseStatus(
                            getValue(
                                appointment,
                                ["status", "appointmentStatus"],
                                "Scheduled"
                            )
                        ),
                        appointmentDate: formatDate(dateValue),
                    };
                })
                .sort((a, b) =>
                    b.appointmentDate.localeCompare(a.appointmentDate)
                )
                .slice(0, 10),
        [appointments]
    );

    const filteredAppointments = useMemo(() => {
        const query = (search || "").toLowerCase().trim();

        return recentAppointments.filter((appointment) =>
            [
                appointment.name,
                appointment.id,
                appointment.doctor,
                appointment.department,
                appointment.status,
            ]
                .join(" ")
                .toLowerCase()
                .includes(query)
        );
    }, [recentAppointments, search]);

    const stats = [
        {
            title: "Total Patients",
            value: patients.length.toLocaleString("en-IN"),
            change: "Registered patients",
            icon: Users,
            color: "blue",
        },
        {
            title: "Total Doctors",
            value: doctors.length.toLocaleString("en-IN"),
            change: "Registered doctors",
            icon: Stethoscope,
            color: "purple",
        },
        {
            title: "Total Departments",
            value: departments.length.toLocaleString("en-IN"),
            change: "Registered departments",
            icon: Building2,
            color: "blue",
        },
        {
            title: "Appointments Today",
            value: todayAppointments.length.toLocaleString("en-IN"),
            change: "Today's appointments",
            icon: CalendarDays,
            color: "orange",
        },
        {
            title: "Available Beds",
            value: availableBeds.toLocaleString("en-IN"),
            change: `${beds.length} total beds`,
            icon: BedDouble,
            color: "green",
        },
    ];

    return (
        <>
            <section className="welcome-section">
                <div>
                    <div className="eyebrow">OVERVIEW</div>
                    <h1>Hospital Dashboard</h1>
                    <p>
                        Welcome back! Here's what's happening at your
                        hospital today.
                    </p>
                </div>

                <div className="today-date">
                    <CalendarDays size={18} />
                    <span>
                        {today.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                        })}
                    </span>
                </div>
            </section>

            {errors.length > 0 && (
                <div
                    role="alert"
                    style={{
                        marginBottom: 16,
                        padding: 12,
                        borderRadius: 8,
                        background: "#FFF4E5",
                        color: "#8A4B08",
                    }}
                >
                    <strong>
                        Some dashboard data could not be loaded.
                    </strong>

                    <ul>
                        {errors.map((error, index) => (
                            <li key={`${error}-${index}`}>{error}</li>
                        ))}
                    </ul>

                    <button
                        type="button"
                        onClick={() => setReloadKey((key) => key + 1)}
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="stats-grid">
                {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                        <article className="stat-card" key={stat.title}>
                            <div className="stat-top">
                                <div className={`stat-icon ${stat.color}`}>
                                    <Icon size={22} />
                                </div>

                                <button
                                    type="button"
                                    className="more-button"
                                    aria-label={`More about ${stat.title}`}
                                    onClick={() => window.alert(stat.title)}
                                >
                                    ···
                                </button>
                            </div>

                            <p className="stat-title">{stat.title}</p>

                            <div className="stat-bottom">
                                <h2>{loading ? "..." : stat.value}</h2>
                                <span className="stat-change change-neutral">
                                    {loading ? "Loading..." : stat.change}
                                </span>
                            </div>
                        </article>
                    );
                })}
            </section>

            <section className="overview-grid">
                <article className="panel chart-panel">
                    <div className="panel-heading">
                        <div>
                            <h3>Appointment Overview</h3>
                            <p>Weekly appointment activity</p>
                        </div>

                        <button
                            type="button"
                            className="period-select"
                            onClick={() =>
                                window.alert("Weekly view selected.")
                            }
                        >
                            This Week <ChevronDown size={15} />
                        </button>
                    </div>

                    <div className="chart-legend">
                        <span className="legend-dot" />
                        Appointments
                    </div>

                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={weeklyChartData}
                                margin={{
                                    top: 12,
                                    right: 4,
                                    left: -24,
                                    bottom: 0,
                                }}
                            >
                                <CartesianGrid
                                    stroke="#E9EEF4"
                                    vertical={false}
                                    strokeDasharray="4 4"
                                />

                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fill: "#8994A5",
                                        fontSize: 12,
                                    }}
                                    dy={10}
                                />

                                <Tooltip
                                    cursor={{ fill: "#F2F7FA" }}
                                    contentStyle={{
                                        borderRadius: 10,
                                        border: "1px solid #E6ECF2",
                                        fontSize: 12,
                                    }}
                                />

                                <Bar
                                    dataKey="appointments"
                                    name="Appointments"
                                    fill="#249E9A"
                                    radius={[5, 5, 0, 0]}
                                    maxBarSize={34}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-footer">
                        <div className="chart-footer-icon">
                            <CalendarDays size={17} />
                        </div>

                        <span>Weekly total</span>

                        <strong>
                            {loading
                                ? "..."
                                : weeklyChartData.reduce(
                                    (sum, day) => sum + day.appointments,
                                    0
                                )}
                        </strong>

                        <span className="muted">appointments</span>
                    </div>
                </article>

                <article className="panel schedule-panel">
                    <div className="panel-heading">
                        <div>
                            <h3>Today's Schedule</h3>
                            <p>Upcoming hospital activity</p>
                        </div>

                        <Clock size={20} className="heading-icon" />
                    </div>

                    <div className="schedule-summary">
                        <div>
                            <span>Total appointments</span>
                            <strong>
                                {loading ? "..." : todayAppointments.length}
                            </strong>
                        </div>

                        <div>
                            <span>Remaining</span>
                            <strong>
                                {loading
                                    ? "..."
                                    : todayAppointments.filter(
                                        (appointment) => {
                                            const status = String(
                                                getValue(
                                                    appointment,
                                                    [
                                                        "status",
                                                        "appointmentStatus",
                                                    ],
                                                    ""
                                                )
                                            ).toLowerCase();

                                            return ![
                                                "completed",
                                                "cancelled",
                                            ].includes(status);
                                        }
                                    ).length}
                            </strong>
                        </div>
                    </div>

                    <div className="schedule-list">
                        {loading ? (
                            <p>Loading today's schedule...</p>
                        ) : todayAppointments.length === 0 ? (
                            <p>No appointments scheduled for today.</p>
                        ) : (
                            todayAppointments
                                .slice()
                                .sort((a, b) =>
                                    String(getAppointmentTime(a)).localeCompare(
                                        String(getAppointmentTime(b))
                                    )
                                )
                                .slice(0, 4)
                                .map((appointment, index) => {
                                    const patientName = getRelatedName(
                                        appointment,
                                        ["patient", "patientDetails"],
                                        ["name", "patientName"],
                                        ["patientName"],
                                        "Patient"
                                    );

                                    const doctorName = getRelatedName(
                                        appointment,
                                        ["doctor", "doctorDetails"],
                                        ["name", "doctorName"],
                                        ["doctorName"],
                                        "Doctor"
                                    );

                                    const trackClasses = [
                                        "teal-track",
                                        "blue-track",
                                        "purple-track",
                                        "orange-track",
                                    ];

                                    return (
                                        <div
                                            className="schedule-item"
                                            key={getValue(
                                                appointment,
                                                ["id", "appointmentId"],
                                                index
                                            )}
                                        >
                                            <div className="schedule-time">
                                                {formatTime(
                                                    getAppointmentTime(
                                                        appointment
                                                    )
                                                )}
                                            </div>

                                            <div
                                                className={`schedule-track ${trackClasses[index]}`}
                                            />

                                            <div className="schedule-detail">
                                                <strong>{patientName}</strong>
                                                <span>{doctorName}</span>
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </article>
            </section>

            <section className="panel appointments-panel">
                <div className="panel-heading appointments-heading">
                    <div>
                        <h3>Recent Appointments</h3>
                        <p>Manage and track patient appointments</p>
                    </div>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={() => navigate("/appointments")}
                    >
                        <CalendarDays size={17} />
                        View Appointments
                    </button>
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                        <tr>
                            <th>Patient</th>
                            <th>Appointment ID</th>
                            <th>Doctor</th>
                            <th>Department</th>
                            <th>Time</th>
                            <th>Status</th>
                        </tr>
                        </thead>

                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="empty-state">
                                    Loading appointments...
                                </td>
                            </tr>
                        ) : filteredAppointments.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="empty-state">
                                    {errors.length > 0
                                        ? "Appointment data could not be loaded."
                                        : `No appointments match "${search || ""}".`}
                                </td>
                            </tr>
                        ) : (
                            filteredAppointments.map((appointment) => (
                                <tr key={appointment.id}>
                                    <td>
                                        <div className="patient-cell">
                                            <div className="patient-avatar">
                                                {appointment.initials}
                                            </div>
                                            <strong>
                                                {appointment.name}
                                            </strong>
                                        </div>
                                    </td>

                                    <td className="id-cell">
                                        {appointment.id}
                                    </td>

                                    <td>{appointment.doctor}</td>
                                    <td>{appointment.department}</td>
                                    <td>{appointment.time}</td>

                                    <td>
                                            <span
                                                className={`status status-${appointment.status
                                                    .toLowerCase()
                                                    .replace(/\s+/g, "-")}`}
                                            >
                                                <span className="status-dot" />
                                                {appointment.status}
                                            </span>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer">
                    Showing {filteredAppointments.length} of{" "}
                    {recentAppointments.length} appointments

                    <button
                        type="button"
                        className="text-button"
                        onClick={() => setSearch("")}
                    >
                        Clear search
                    </button>
                </div>
            </section>

            <footer className="dashboard-footer">
                <span>© 2026 Surya Hospital</span>
                <span>Contact us</span>
            </footer>
        </>
    );
}

export default Dashboard;
