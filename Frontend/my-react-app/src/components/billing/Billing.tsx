import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    CalendarDays,
    Check,
    ChevronDown,
    CircleDollarSign,
    Clock,
    CreditCard,
    Download,
    FileText,
    Plus,
    Search,
    Wallet,
    X,
} from "lucide-react";
import "./Billing.css";

// =====================================================
// TYPES
// =====================================================

type PaymentStatus = "Paid" | "Pending" | "Overdue" | "Partial";
import {API_URL} from "../../config.ts";

interface Invoice {
    databaseId: number;
    id: string;
    patientName: string;
    patientId: string;
    department: string;
    service: string;
    invoiceDate: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    paymentMethod: string;
    status: PaymentStatus;
}

interface BillingApiResponse {
    databaseId: number;
    id: string;
    patientName: string;
    patientId: string;
    department: string;
    service: string;
    invoiceDate: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    balance: number;
    paymentMethod: string;
    status: string;
}

interface CreateInvoiceRequest {
    patientName: string;
    patientId: string;
    department: string;
    service: string;
    invoiceDate: string;
    dueDate: string;
    amount: number;
}

// =====================================================
// BILLING API SERVICE
// This service logic stays inside Billing.tsx.
// =====================================================


// Read a cookie value by name (used for the Spring CSRF token).
function getCookie(name: string): string | null {
    const match = document.cookie.match(
        new RegExp("(?:^|; )" + name + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[1]) : null;
}

async function apiRequest<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const method = (options?.method ?? "GET").toUpperCase();
    const csrfToken = getCookie("XSRF-TOKEN");

    const response = await fetch(url, {
        credentials: "include", // send the session cookie on every request (GET and POST)
        ...options,
        headers: {
            "Content-Type": "application/json",
            // Spring Security requires the CSRF token header on POST/PUT/DELETE
            ...(method !== "GET" && csrfToken
                ? { "X-XSRF-TOKEN": csrfToken }
                : {}),
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const message = await response.text();

        throw new Error(
            message || `Request failed with status ${response.status}`
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

// Map backend data into the format expected by the UI.
function mapInvoice(data: BillingApiResponse): Invoice {
    const amount = Number(data.amount);
    const paidAmount = Number(data.paidAmount ?? 0);
    const balance = amount - paidAmount;

    const today = new Date();
    const todayString = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
    ].join("-");

    let status: PaymentStatus;

    if (balance <= 0) {
        status = "Paid";
    } else if (data.dueDate < todayString) {
        status = "Overdue";
    } else if (paidAmount > 0) {
        status = "Partial";
    } else {
        status = "Pending";
    }

    return {
        databaseId: data.databaseId,
        id: data.id,
        patientName: data.patientName,
        patientId: data.patientId,
        department: data.department,
        service: data.service,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        amount,
        paidAmount,
        paymentMethod: data.paymentMethod,
        status,
    };
}

// GET: Fetch all invoices.
async function fetchInvoices(): Promise<Invoice[]> {
    const data = await apiRequest<BillingApiResponse[]>(`${API_URL}/api/billing`);

    return data.map(mapInvoice);
}

// POST: Create an invoice.
async function saveInvoice(
    invoice: CreateInvoiceRequest
): Promise<Invoice> {
    const data = await apiRequest<BillingApiResponse>(`${API_URL}/api/billing`, {
        method: "POST",
        body: JSON.stringify(invoice),
    });

    return mapInvoice(data);
}

// POST: Record a payment.
async function savePayment(
    databaseId: number,
    amount: number,
    paymentMethod: string
): Promise<Invoice> {
    const data = await apiRequest<BillingApiResponse>(
        `${API_URL}/api/billing/${databaseId}/payments`,
        {
            method: "POST",
            body: JSON.stringify({
                amount,
                paymentMethod,
            }),
        }
    );

    return mapInvoice(data);
}

// =====================================================
// COMPONENT
// =====================================================

export default function Billing() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [submittingInvoice, setSubmittingInvoice] = useState(false);
    const [submittingPayment, setSubmittingPayment] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [departmentFilter, setDepartmentFilter] = useState("All");

    const [showForm, setShowForm] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(
        null
    );
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("UPI");
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        patientName: "",
        patientId: "",
        department: "General Medicine",
        service: "",
        invoiceDate: new Date().toLocaleDateString("en-CA"),
        dueDate: "",
        amount: "",
    });

    const departments = [
        "General Medicine",
        "Cardiology",
        "Orthopedics",
        "Neurology",
        "Pediatrics",
        "Emergency",
    ];

    // =====================================================
    // LOAD INVOICES FROM BACKEND
    // =====================================================

    useEffect(() => {
        let cancelled = false;

        async function loadData() {
            try {
                setLoading(true);
                setLoadError("");

                const data = await fetchInvoices();

                if (!cancelled) {
                    setInvoices(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setLoadError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load invoices."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => {
            cancelled = true;
        };
    }, []);

    // =====================================================
    // BILLING STATISTICS
    // =====================================================

    const stats = useMemo(() => {
        const totalBilled = invoices.reduce(
            (sum, item) => sum + item.amount,
            0
        );

        const totalCollected = invoices.reduce(
            (sum, item) => sum + item.paidAmount,
            0
        );

        const pending = invoices.reduce(
            (sum, item) =>
                sum + Math.max(0, item.amount - item.paidAmount),
            0
        );

        const today = new Date();
        const todayString = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0"),
        ].join("-");

        const overdue = invoices
            .filter(
                (item) =>
                    item.paidAmount < item.amount &&
                    item.dueDate < todayString
            )
            .reduce(
                (sum, item) =>
                    sum + Math.max(0, item.amount - item.paidAmount),
                0
            );

        return {
            totalBilled,
            totalCollected,
            pending,
            overdue,
        };
    }, [invoices]);

    // =====================================================
    // SEARCH AND FILTER
    // =====================================================

    const filteredInvoices = useMemo(() => {
        return invoices.filter((invoice) => {
            const searchMatch = [
                invoice.id,
                invoice.patientName,
                invoice.patientId,
                invoice.service,
            ]
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase());

            const statusMatch =
                statusFilter === "All" ||
                invoice.status === statusFilter;

            const departmentMatch =
                departmentFilter === "All" ||
                invoice.department === departmentFilter;

            return searchMatch && statusMatch && departmentMatch;
        });
    }, [invoices, search, statusFilter, departmentFilter]);

    // =====================================================
    // CREATE INVOICE
    // =====================================================

    const createInvoice = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setError("");

        const amount = Number(form.amount);

        if (!form.patientName.trim() || !form.patientId.trim()) {
            setError("Enter the patient's name and patient ID.");
            return;
        }

        if (
            !form.service.trim() ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            setError(
                "Enter a service and a valid amount greater than zero."
            );
            return;
        }

        if (!form.invoiceDate || !form.dueDate) {
            setError("Enter the invoice date and due date.");
            return;
        }

        if (form.dueDate < form.invoiceDate) {
            setError(
                "The due date must be on or after the invoice date."
            );
            return;
        }

        try {
            setSubmittingInvoice(true);

            const createdInvoice = await saveInvoice({
                patientName: form.patientName.trim(),
                patientId: form.patientId.trim(),
                department: form.department,
                service: form.service.trim(),
                invoiceDate: form.invoiceDate,
                dueDate: form.dueDate,
                amount,
            });

            setInvoices((current) => [
                createdInvoice,
                ...current,
            ]);

            setShowForm(false);

            setForm({
                patientName: "",
                patientId: "",
                department: "General Medicine",
                service: "",
                invoiceDate: new Date().toLocaleDateString("en-CA"),
                dueDate: "",
                amount: "",
            });

            setError("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to create invoice."
            );
        } finally {
            setSubmittingInvoice(false);
        }
    };

    // =====================================================
    // RECORD PAYMENT
    // =====================================================

    const recordPayment = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!paymentInvoice) return;

        setError("");

        const amount = Number(paymentAmount);

        const remaining =
            paymentInvoice.amount - paymentInvoice.paidAmount;

        if (
            !Number.isFinite(amount) ||
            amount <= 0 ||
            amount > remaining
        ) {
            setError(
                `Enter a payment between ₹0.01 and ₹${remaining.toFixed(2)}.`
            );
            return;
        }

        try {
            setSubmittingPayment(true);

            const updatedInvoice = await savePayment(
                paymentInvoice.databaseId,
                amount,
                paymentMethod
            );

            setInvoices((current) =>
                current.map((invoice) =>
                    invoice.databaseId === updatedInvoice.databaseId
                        ? updatedInvoice
                        : invoice
                )
            );

            setPaymentInvoice(null);
            setPaymentAmount("");
            setPaymentMethod("UPI");
            setError("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to record payment."
            );
        } finally {
            setSubmittingPayment(false);
        }
    };

    // =====================================================
    // EXPORT CSV
    // =====================================================

    const downloadCsv = () => {
        const headers = [
            "Invoice ID",
            "Patient",
            "Patient ID",
            "Department",
            "Service",
            "Invoice Date",
            "Due Date",
            "Amount",
            "Paid",
            "Balance",
            "Status",
            "Payment Method",
        ];

        const rows = filteredInvoices.map((item) => [
            item.id,
            item.patientName,
            item.patientId,
            item.department,
            item.service,
            item.invoiceDate,
            item.dueDate,
            item.amount,
            item.paidAmount,
            item.amount - item.paidAmount,
            item.status,
            item.paymentMethod,
        ]);

        const csvValue = (value: string | number) =>
            `"${String(value).replace(/"/g, '""')}"`;

        const csv = [headers, ...rows]
            .map((row) => row.map(csvValue).join(","))
            .join("\n");

        const url = URL.createObjectURL(
            new Blob(["\uFEFF" + csv], {
                type: "text/csv;charset=utf-8;",
            })
        );

        const link = document.createElement("a");
        link.href = url;
        link.download = "hospital-billing.csv";
        link.click();

        URL.revokeObjectURL(url);
    };

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className="billing-page">
            <div className="billing-heading">
                <div>
                    <span className="billing-eyebrow">
                        FINANCE / BILLING
                    </span>
                    <h1>Billing &amp; Payments</h1>
                    <p>
                        Manage invoices, track collections, and record
                        patient payments.
                    </p>
                </div>

                <button
                    className="billing-primary-btn"
                    onClick={() => {
                        setError("");
                        setShowForm(true);
                    }}
                >
                    <Plus size={18} />
                    Create Invoice
                </button>
            </div>

            {loadError && (
                <div
                    role="alert"
                    className="billing-form-error"
                    style={{ marginBottom: 16 }}
                >
                    {loadError}
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        style={{ marginLeft: 12 }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {loading && (
                <p role="status">Loading invoices...</p>
            )}

            <div className="billing-stats">
                <div className="billing-stat-card">
                    <div className="billing-stat-top">
                        <span>Total Billed</span>
                        <div className="billing-stat-icon purple">
                            <FileText size={21} />
                        </div>
                    </div>
                    <h2>
                        {currency(stats.totalBilled)}
                    </h2>
                    <div className="billing-stat-foot">
                        <span className="stat-neutral">
                            <Activity size={14} /> All invoices
                        </span>
                    </div>
                </div>

                <div className="billing-stat-card">
                    <div className="billing-stat-top">
                        <span>Amount Collected</span>
                        <div className="billing-stat-icon green">
                            <Wallet size={21} />
                        </div>
                    </div>
                    <h2>
                        {currency(stats.totalCollected)}
                    </h2>
                    <div className="billing-stat-foot">
                        <span className="stat-positive">
                            <ArrowUpRight size={15} /> Received
                        </span>
                    </div>
                </div>

                <div className="billing-stat-card">
                    <div className="billing-stat-top">
                        <span>Pending Balance</span>
                        <div className="billing-stat-icon orange">
                            <Clock size={21} />
                        </div>
                    </div>
                    <h2>
                        {currency(stats.pending)}
                    </h2>
                    <div className="billing-stat-foot">
                        <span className="stat-neutral">
                            <ArrowDownRight size={15} /> Yet to collect
                        </span>
                    </div>
                </div>

                <div className="billing-stat-card">
                    <div className="billing-stat-top">
                        <span>Overdue Balance</span>
                        <div className="billing-stat-icon red">
                            <CircleDollarSign size={21} />
                        </div>
                    </div>
                    <h2>
                        {currency(stats.overdue)}
                    </h2>
                    <div className="billing-stat-foot">
                        <span className="stat-danger">
                            <Clock size={14} /> Past due date
                        </span>
                    </div>
                </div>
            </div>

            <div className="billing-collection-panel">
                <div className="collection-copy">
                    <div className="collection-icon">
                        <Banknote size={22} />
                    </div>
                    <div>
                        <h3>Collection overview</h3>
                        <p>
                            {stats.totalBilled > 0
                                ? `${Math.round(
                                    (stats.totalCollected /
                                        stats.totalBilled) *
                                    100
                                )}% of billed revenue has been collected.`
                                : "No invoices have been created yet."}
                        </p>
                    </div>
                </div>

                <div className="collection-progress-wrap">
                    <div className="collection-amounts">
                        <span>Collected</span>
                        <strong>
                            {currency(stats.totalCollected)}
                        </strong>
                    </div>

                    <div
                        className="collection-progress"
                        role="progressbar"
                        aria-label="Revenue collected"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={
                            stats.totalBilled
                                ? Math.round(
                                    (stats.totalCollected /
                                        stats.totalBilled) *
                                    100
                                )
                                : 0
                        }
                    >
                        <div
                            style={{
                                width: `${
                                    stats.totalBilled
                                        ? Math.min(
                                            100,
                                            (stats.totalCollected /
                                                stats.totalBilled) *
                                            100
                                        )
                                        : 0
                                }%`,
                            }}
                        />
                    </div>

                    <div className="collection-amounts">
                        <span>Total billed</span>
                        <strong>
                            {currency(stats.totalBilled)}
                        </strong>
                    </div>
                </div>
            </div>

            <section className="billing-table-card">
                <div className="billing-table-heading">
                    <div>
                        <h2>Invoices</h2>
                        <p>
                            View and manage patient billing records.
                        </p>
                    </div>

                    <button
                        className="billing-outline-btn"
                        onClick={downloadCsv}
                        disabled={loading}
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>

                <div className="billing-filters">
                    <div className="billing-search">
                        <Search size={18} />
                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search patient, invoice, or service..."
                            aria-label="Search invoices"
                        />
                    </div>

                    <label className="billing-select-wrap">
                        <span className="sr-only">
                            Payment status
                        </span>
                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="All">All statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Partial">Partial</option>
                            <option value="Overdue">Overdue</option>
                        </select>
                        <ChevronDown size={16} />
                    </label>

                    <label className="billing-select-wrap">
                        <span className="sr-only">
                            Department
                        </span>
                        <select
                            value={departmentFilter}
                            onChange={(event) =>
                                setDepartmentFilter(event.target.value)
                            }
                        >
                            <option value="All">
                                All departments
                            </option>
                            {departments.map((department) => (
                                <option
                                    key={department}
                                    value={department}
                                >
                                    {department}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} />
                    </label>
                </div>

                <div className="billing-table-scroll">
                    <table className="billing-table">
                        <thead>
                        <tr>
                            <th>Invoice / Patient</th>
                            <th>Service</th>
                            <th>Invoice Date</th>
                            <th>Total Amount</th>
                            <th>Balance Due</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                        </thead>

                        <tbody>
                        {filteredInvoices.map((invoice) => {
                            const balance =
                                invoice.amount - invoice.paidAmount;

                            const today = new Date();
                            const todayString = [
                                today.getFullYear(),
                                String(today.getMonth() + 1).padStart(
                                    2,
                                    "0"
                                ),
                                String(today.getDate()).padStart(
                                    2,
                                    "0"
                                ),
                            ].join("-");

                            const isOverdue =
                                balance > 0 &&
                                invoice.dueDate < todayString;

                            return (
                                <tr key={invoice.databaseId}>
                                    <td>
                                        <div className="invoice-patient">
                                            <div className="invoice-avatar">
                                                {invoice.patientName
                                                    .split(" ")
                                                    .map(
                                                        (word) => word[0]
                                                    )
                                                    .join("")
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </div>

                                            <div>
                                                <strong>
                                                    {invoice.patientName}
                                                </strong>
                                                <span>
                                                        {invoice.id}
                                                    </span>
                                                <small>
                                                    {invoice.patientId}
                                                </small>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <div className="invoice-service">
                                            <strong>
                                                {invoice.service}
                                            </strong>
                                            <span>
                                                    {invoice.department}
                                                </span>
                                        </div>
                                    </td>

                                    <td>
                                        <div className="invoice-date">
                                            <CalendarDays size={15} />
                                            {invoice.invoiceDate}
                                        </div>
                                        <span className="invoice-due">
                                                Due: {invoice.dueDate}
                                            </span>
                                    </td>

                                    <td className="billing-money">
                                        {currency(invoice.amount)}
                                        {invoice.paidAmount > 0 &&
                                            balance > 0 && (
                                                <span className="paid-subtext">
                                                        Paid{" "}
                                                    {currency(
                                                        invoice.paidAmount
                                                    )}
                                                    </span>
                                            )}
                                    </td>

                                    <td>
                                        <strong
                                            className={
                                                balance === 0
                                                    ? "balance-zero"
                                                    : "balance-due"
                                            }
                                        >
                                            {currency(balance)}
                                        </strong>
                                    </td>

                                    <td>
                                            <span
                                                className={`billing-status ${
                                                    isOverdue
                                                        ? "overdue"
                                                        : invoice.status.toLowerCase()
                                                }`}
                                            >
                                                <span />
                                                {isOverdue
                                                    ? "Overdue"
                                                    : invoice.status}
                                            </span>
                                    </td>

                                    <td>
                                        {balance > 0 ? (
                                            <button
                                                className="billing-action-btn"
                                                onClick={() => {
                                                    setError("");
                                                    setPaymentInvoice(
                                                        invoice
                                                    );
                                                    setPaymentAmount(
                                                        String(balance)
                                                    );
                                                }}
                                            >
                                                <CreditCard size={15} />
                                                Record payment
                                            </button>
                                        ) : (
                                            <span className="billing-complete">
                                                    <Check size={15} />
                                                    Complete
                                                </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>

                    {!loading &&
                        filteredInvoices.length === 0 && (
                            <div className="billing-empty">
                                <FileText size={32} />
                                <strong>No invoices found</strong>
                                <p>
                                    Try changing your search or filters.
                                </p>
                            </div>
                        )}
                </div>

                <div className="billing-table-footer">
                    Showing{" "}
                    <strong>{filteredInvoices.length}</strong> of{" "}
                    <strong>{invoices.length}</strong> invoices
                </div>
            </section>

            {/* CREATE INVOICE MODAL */}

            {showForm && (
                <div
                    className="billing-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !submittingInvoice
                        ) {
                            setShowForm(false);
                            setError("");
                        }
                    }}
                >
                    <section
                        className="billing-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-invoice-title"
                    >
                        <div className="billing-modal-heading">
                            <div>
                                <h2 id="create-invoice-title">
                                    Create invoice
                                </h2>
                                <p>
                                    Enter the patient and billing details.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="billing-close-btn"
                                onClick={() => {
                                    setShowForm(false);
                                    setError("");
                                }}
                                aria-label="Close"
                                disabled={submittingInvoice}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={createInvoice}>
                            <div className="billing-form-grid">
                                <label>
                                    Patient name *
                                    <input
                                        required
                                        value={form.patientName}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                patientName:
                                                event.target.value,
                                            })
                                        }
                                        placeholder="Enter patient name"
                                    />
                                </label>

                                <label>
                                    Patient ID *
                                    <input
                                        required
                                        value={form.patientId}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                patientId:
                                                event.target.value,
                                            })
                                        }
                                        placeholder="e.g. PAT-006"
                                    />
                                </label>

                                <label>
                                    Department *
                                    <select
                                        value={form.department}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                department:
                                                event.target.value,
                                            })
                                        }
                                    >
                                        {departments.map((department) => (
                                            <option
                                                key={department}
                                                value={department}
                                            >
                                                {department}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Service / Description *
                                    <input
                                        required
                                        value={form.service}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                service:
                                                event.target.value,
                                            })
                                        }
                                        placeholder="e.g. Consultation"
                                    />
                                </label>

                                <label>
                                    Invoice date *
                                    <input
                                        type="date"
                                        required
                                        value={form.invoiceDate}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                invoiceDate:
                                                event.target.value,
                                            })
                                        }
                                    />
                                </label>

                                <label>
                                    Due date *
                                    <input
                                        type="date"
                                        required
                                        min={form.invoiceDate}
                                        value={form.dueDate}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                dueDate:
                                                event.target.value,
                                            })
                                        }
                                    />
                                </label>

                                <label className="billing-full-field">
                                    Total amount (₹) *
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        required
                                        value={form.amount}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                amount:
                                                event.target.value,
                                            })
                                        }
                                        placeholder="Enter amount"
                                    />
                                </label>
                            </div>

                            {error && (
                                <p
                                    role="alert"
                                    className="billing-form-error"
                                >
                                    {error}
                                </p>
                            )}

                            <div className="billing-modal-actions">
                                <button
                                    type="button"
                                    className="billing-cancel-btn"
                                    onClick={() => {
                                        setShowForm(false);
                                        setError("");
                                    }}
                                    disabled={submittingInvoice}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="billing-primary-btn"
                                    disabled={submittingInvoice}
                                >
                                    <Plus size={17} />
                                    {submittingInvoice
                                        ? "Creating..."
                                        : "Create invoice"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* RECORD PAYMENT MODAL */}

            {paymentInvoice && (
                <div
                    className="billing-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !submittingPayment
                        ) {
                            setPaymentInvoice(null);
                            setError("");
                        }
                    }}
                >
                    <section
                        className="billing-modal billing-payment-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="record-payment-title"
                    >
                        <div className="billing-modal-heading">
                            <div>
                                <h2 id="record-payment-title">
                                    Record payment
                                </h2>
                                <p>{paymentInvoice.id}</p>
                            </div>

                            <button
                                type="button"
                                className="billing-close-btn"
                                onClick={() => {
                                    setPaymentInvoice(null);
                                    setError("");
                                }}
                                aria-label="Close"
                                disabled={submittingPayment}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="payment-patient-summary">
                            <div className="invoice-avatar">
                                {paymentInvoice.patientName
                                    .split(" ")
                                    .map((word) => word[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </div>

                            <div>
                                <strong>
                                    {paymentInvoice.patientName}
                                </strong>
                                <span>{paymentInvoice.service}</span>
                            </div>
                        </div>

                        <div className="payment-balance-box">
                            <span>Remaining balance</span>
                            <strong>
                                {currency(
                                    paymentInvoice.amount -
                                    paymentInvoice.paidAmount
                                )}
                            </strong>
                        </div>

                        <form onSubmit={recordPayment}>
                            <label className="billing-form-label">
                                Payment amount (₹) *
                                <input
                                    type="number"
                                    min="0.01"
                                    max={
                                        paymentInvoice.amount -
                                        paymentInvoice.paidAmount
                                    }
                                    step="0.01"
                                    required
                                    value={paymentAmount}
                                    onChange={(event) =>
                                        setPaymentAmount(
                                            event.target.value
                                        )
                                    }
                                />
                            </label>

                            <label className="billing-form-label">
                                Payment method *
                                <select
                                    value={paymentMethod}
                                    onChange={(event) =>
                                        setPaymentMethod(
                                            event.target.value
                                        )
                                    }
                                >
                                    <option>UPI</option>
                                    <option>Card</option>
                                    <option>Cash</option>
                                    <option>Bank Transfer</option>
                                    <option>Insurance</option>
                                </select>
                            </label>

                            {error && (
                                <p
                                    role="alert"
                                    className="billing-form-error"
                                >
                                    {error}
                                </p>
                            )}

                            <div className="billing-modal-actions">
                                <button
                                    type="button"
                                    className="billing-cancel-btn"
                                    onClick={() => {
                                        setPaymentInvoice(null);
                                        setError("");
                                    }}
                                    disabled={submittingPayment}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="billing-primary-btn"
                                    disabled={submittingPayment}
                                >
                                    <Check size={17} />
                                    {submittingPayment
                                        ? "Saving..."
                                        : "Save payment"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}

// =====================================================
// CURRENCY FORMATTER
// =====================================================

function currency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);
}