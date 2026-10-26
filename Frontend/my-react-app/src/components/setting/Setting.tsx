import { useEffect, useState, type FormEvent } from "react";
import {
    Building2,
    UserRound,
    Bell,
    ShieldCheck,
    Palette,
    Save,
    Mail,
    Phone,
    MapPin,
    LockKeyhole,
    Sun,
    Moon,
    Monitor,
    CheckCircle2,
    Eye,
    EyeOff,
    RotateCcw,
} from "lucide-react";
import "./Setting.css";
import { setupTwoFactor } from "../../services/authService";

type SettingsTab =
    | "hospital"
    | "profile"
    | "notifications"
    | "security"
    | "appearance";

type ThemePreference = "light" | "dark" | "system";

interface HospitalSettings {
    id?: number;
    hospitalName: string;
    registrationNumber: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
}

interface ProfileSettings {
    fullName: string;
    email: string;
    phone: string;
    jobTitle: string;
}

interface NotificationSettings {
    appointments: boolean;
    billing: boolean;
    patientUpdates: boolean;
    systemAlerts: boolean;
    emailNotifications: boolean;
    inAppNotifications: boolean;
}

interface SecuritySettings {
    id?: number;
    twoFactorEnabled?: boolean;
}

import {API_URL} from "../../config.ts";

const API_URL_SETTING = `${API_URL}/api/settings/hospital`;
const PROFILE_API_URL = `${API_URL}/api/settings/profile`;
const NOTIFICATION_API_URL =
    `${API_URL}/api/settings/notifications`;
const SECURITY_API_URL = `${API_URL}/api/security-settings`;
const AUTH_API_URL = `${API_URL}/api/auth`;

const initialHospital: HospitalSettings = {
    hospitalName: "Surya Multispeciality Hospital",
    registrationNumber: "HOSP-2026-001",
    email: "contact@surya-hospital.com",
    phone: "+91 98765 43210",
    address: "123 Healthcare Avenue",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411001",
};

const initialProfile: ProfileSettings = {
    fullName: "Hospital Administrator",
    email: "admin@surya-hospital.com",
    phone: "+91 98765 43210",
    jobTitle: "System Administrator",
};

const initialNotifications: NotificationSettings = {
    appointments: true,
    billing: true,
    patientUpdates: false,
    systemAlerts: true,
    emailNotifications: true,
    inAppNotifications: true,
};

const tabs: {
    id: SettingsTab;
    label: string;
    description: string;
    icon: typeof Building2;
}[] = [
    {
        id: "hospital",
        label: "Hospital Information",
        description: "Hospital details and contact information",
        icon: Building2,
    },
    {
        id: "profile",
        label: "My Profile",
        description: "Personal information and job title",
        icon: UserRound,
    },
    {
        id: "notifications",
        label: "Notifications",
        description: "Manage alerts and reminders",
        icon: Bell,
    },
    {
        id: "security",
        label: "Security",
        description: "Password and account protection",
        icon: ShieldCheck,
    },
    {
        id: "appearance",
        label: "Appearance",
        description: "Theme and display preferences",
        icon: Palette,
    },
];

function getCookie(name: string): string | null {
    const prefix = `${name}=`;
    const cookie = document.cookie
        .split("; ")
        .find((item) => item.startsWith(prefix));

    return cookie
        ? decodeURIComponent(cookie.substring(prefix.length))
        : null;
}

async function readErrorMessage(response: Response): Promise<string> {
    const body = await response.text();

    if (body) {
        try {
            const parsed = JSON.parse(body);

            if (typeof parsed.message === "string") {
                return parsed.message;
            }

            if (typeof parsed.error === "string") {
                return parsed.error;
            }
        } catch {
            // The response was not JSON.
        }
    }

    return body || `Request failed with status ${response.status}`;
}

async function getCsrfHeaders(): Promise<Record<string, string>> {
    const response = await fetch(`${AUTH_API_URL}/csrf`, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }

    const token = getCookie("XSRF-TOKEN");

    if (!token) {
        throw new Error(
            "CSRF token not found. Check your backend CSRF configuration and browser cookies."
        );
    }

    return {
        "X-XSRF-TOKEN": token,
    };
}

async function apiFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const method = (options.method ?? "GET").toUpperCase();
    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
        const csrfHeaders = await getCsrfHeaders();

        Object.entries(csrfHeaders).forEach(([key, value]) => {
            headers.set(key, value);
        });
    }

    return fetch(url, {
        ...options,
        method,
        headers,
        credentials: "include",
    });
}

export default function Setting() {
    const [activeTab, setActiveTab] =
        useState<SettingsTab>("hospital");

    const [hospital, setHospital] =
        useState<HospitalSettings>(initialHospital);

    const [profile, setProfile] =
        useState<ProfileSettings>(initialProfile);

    const [notifications, setNotifications] =
        useState<NotificationSettings>(initialNotifications);

    const [theme, setTheme] =
        useState<ThemePreference>("light");

    const [twoFactorEnabled, setTwoFactorEnabled] =
        useState(false);

    const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
    const [setupSecret, setSetupSecret] = useState("");
    const [settingUpTwoFactor, setSettingUpTwoFactor] =
        useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showCurrentPassword, setShowCurrentPassword] =
        useState(false);

    const [showNewPassword, setShowNewPassword] =
        useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [loadingHospital, setLoadingHospital] = useState(true);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingNotifications, setLoadingNotifications] =
        useState(false);
    const [loadingSecurity, setLoadingSecurity] = useState(true);

    const [savingTwoFactor, setSavingTwoFactor] = useState(false);
    const [saving, setSaving] = useState(false);

    // Load hospital settings.
    useEffect(() => {
        const controller = new AbortController();

        async function loadHospitalSettings() {
            setLoadingHospital(true);

            try {
                const response = await fetch(API_URL_SETTING, {
                    method: "GET",
                    signal: controller.signal,
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const data: HospitalSettings = await response.json();

                setHospital({
                    id: data.id,
                    hospitalName: data.hospitalName ?? "",
                    registrationNumber: data.registrationNumber ?? "",
                    email: data.email ?? "",
                    phone: data.phone ?? "",
                    address: data.address ?? "",
                    city: data.city ?? "",
                    state: data.state ?? "",
                    postalCode: data.postalCode ?? "",
                });
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                setError(
                    err instanceof Error
                        ? `Unable to load hospital settings: ${err.message}`
                        : "Unable to load hospital settings."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingHospital(false);
                }
            }
        }

        void loadHospitalSettings();

        return () => controller.abort();
    }, []);

    // Load profile settings.
    useEffect(() => {
        const controller = new AbortController();

        async function loadProfileSettings() {
            setLoadingProfile(true);

            try {
                const response = await fetch(PROFILE_API_URL, {
                    method: "GET",
                    signal: controller.signal,
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const data: ProfileSettings = await response.json();

                setProfile({
                    fullName: data.fullName ?? "",
                    email: data.email ?? "",
                    phone: data.phone ?? "",
                    jobTitle: data.jobTitle ?? "",
                });
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                setError(
                    err instanceof Error
                        ? `Unable to load profile settings: ${err.message}`
                        : "Unable to load profile settings."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingProfile(false);
                }
            }
        }

        void loadProfileSettings();

        return () => controller.abort();
    }, []);

    // Load notification settings.
    useEffect(() => {
        const controller = new AbortController();

        async function loadNotificationSettings() {
            setLoadingNotifications(true);

            try {
                const response = await fetch(NOTIFICATION_API_URL, {
                    method: "GET",
                    signal: controller.signal,
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const data: NotificationSettings = await response.json();

                setNotifications({
                    appointments: data.appointments ?? true,
                    billing: data.billing ?? true,
                    patientUpdates: data.patientUpdates ?? false,
                    systemAlerts: data.systemAlerts ?? true,
                    emailNotifications: data.emailNotifications ?? true,
                    inAppNotifications: data.inAppNotifications ?? true,
                });
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                setError(
                    err instanceof Error
                        ? `Unable to load notification settings: ${err.message}`
                        : "Unable to load notification settings."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingNotifications(false);
                }
            }
        }

        void loadNotificationSettings();

        return () => controller.abort();
    }, []);

    // Load security settings.
    useEffect(() => {
        const controller = new AbortController();

        async function loadSecuritySettings() {
            setLoadingSecurity(true);

            try {
                const response = await fetch(SECURITY_API_URL, {
                    method: "GET",
                    signal: controller.signal,
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const data: SecuritySettings = await response.json();

                setTwoFactorEnabled(data.twoFactorEnabled ?? false);
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                setError(
                    err instanceof Error
                        ? `Unable to load security settings: ${err.message}`
                        : "Unable to load security settings."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingSecurity(false);
                }
            }
        }

        void loadSecuritySettings();

        return () => controller.abort();
    }, []);

    // Generate the Microsoft Authenticator setup QR code.
    const handleSetupTwoFactor = async () => {
        setError("");
        setMessage("");
        setSettingUpTwoFactor(true);
        setQrCodeDataUrl("");
        setSetupSecret("");

        try {
            const data = await setupTwoFactor();

            setQrCodeDataUrl(data.qrCodeDataUrl);
            setSetupSecret(data.secret ?? "");

            setMessage(
                "QR code generated. Scan it with Microsoft Authenticator."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? `Unable to generate authenticator QR code: ${err.message}`
                    : "Unable to generate authenticator QR code."
            );
        } finally {
            setSettingUpTwoFactor(false);
        }
    };

    // Save the two-factor preference.
    const handleTwoFactorToggle = async () => {
        const nextValue = !twoFactorEnabled;

        setError("");
        setMessage("");
        setSavingTwoFactor(true);

        try {
            const response = await apiFetch(
                `${SECURITY_API_URL}/two-factor?enabled=${nextValue}`,
                {
                    method: "PUT",
                }
            );

            if (!response.ok) {
                throw new Error(await readErrorMessage(response));
            }

            const data: SecuritySettings = await response.json();

            setTwoFactorEnabled(data.twoFactorEnabled ?? nextValue);

            setMessage(
                nextValue
                    ? "Two-factor preference enabled successfully."
                    : "Two-factor preference disabled successfully."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? `Unable to update security settings: ${err.message}`
                    : "Unable to update security settings."
            );
        } finally {
            setSavingTwoFactor(false);
        }
    };

    // Save the currently selected settings section.
    const saveSettings = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (activeTab === "hospital") {
            setSaving(true);

            try {
                const response = await apiFetch(API_URL_SETTING, {
                    method: "PUT",
                    body: JSON.stringify({
                        hospitalName: hospital.hospitalName.trim(),
                        registrationNumber: hospital.registrationNumber.trim(),
                        email: hospital.email.trim(),
                        phone: hospital.phone.trim(),
                        address: hospital.address.trim(),
                        city: hospital.city.trim(),
                        state: hospital.state.trim(),
                        postalCode: hospital.postalCode.trim(),
                    }),
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const saved: HospitalSettings = await response.json();

                setHospital({
                    id: saved.id,
                    hospitalName: saved.hospitalName ?? "",
                    registrationNumber: saved.registrationNumber ?? "",
                    email: saved.email ?? "",
                    phone: saved.phone ?? "",
                    address: saved.address ?? "",
                    city: saved.city ?? "",
                    state: saved.state ?? "",
                    postalCode: saved.postalCode ?? "",
                });

                setMessage("Hospital information saved successfully.");
            } catch (err) {
                setError(
                    err instanceof Error
                        ? `Unable to save hospital settings: ${err.message}`
                        : "Unable to save hospital settings."
                );
            } finally {
                setSaving(false);
            }

            return;
        }

        if (activeTab === "profile") {
            setSaving(true);

            try {
                const response = await apiFetch(PROFILE_API_URL, {
                    method: "PUT",
                    body: JSON.stringify({
                        fullName: profile.fullName.trim(),
                        email: profile.email.trim(),
                        phone: profile.phone.trim(),
                        jobTitle: profile.jobTitle.trim(),
                    }),
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const saved: ProfileSettings = await response.json();

                setProfile({
                    fullName: saved.fullName ?? "",
                    email: saved.email ?? "",
                    phone: saved.phone ?? "",
                    jobTitle: saved.jobTitle ?? "",
                });

                setMessage("Profile information saved successfully.");
            } catch (err) {
                setError(
                    err instanceof Error
                        ? `Unable to save profile settings: ${err.message}`
                        : "Unable to save profile settings."
                );
            } finally {
                setSaving(false);
            }

            return;
        }

        if (activeTab === "notifications") {
            setSaving(true);

            try {
                const response = await apiFetch(NOTIFICATION_API_URL, {
                    method: "PUT",
                    body: JSON.stringify(notifications),
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const saved: NotificationSettings = await response.json();

                setNotifications({
                    appointments: saved.appointments ?? true,
                    billing: saved.billing ?? true,
                    patientUpdates: saved.patientUpdates ?? false,
                    systemAlerts: saved.systemAlerts ?? true,
                    emailNotifications: saved.emailNotifications ?? true,
                    inAppNotifications: saved.inAppNotifications ?? true,
                });

                setMessage("Notification settings saved successfully.");
            } catch (err) {
                setError(
                    err instanceof Error
                        ? `Unable to save notification settings: ${err.message}`
                        : "Unable to save notification settings."
                );
            } finally {
                setSaving(false);
            }

            return;
        }

        if (activeTab === "security") {
            if (!currentPassword || !newPassword || !confirmPassword) {
                setError("Please complete all password fields.");
                return;
            }

            if (newPassword.length < 8) {
                setError(
                    "Your new password must contain at least 8 characters."
                );
                return;
            }

            if (newPassword !== confirmPassword) {
                setError("The new password and confirmation do not match.");
                return;
            }

            setMessage(
                "Password form validated. A password-change backend API is still required to change the password securely."
            );

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            return;
        }

        setMessage(
            "Theme selection is currently stored in this React session. Connect it to your application layout to apply it site-wide."
        );
    };

    // Restore saved values for the current section.
    const resetCurrentTab = async () => {
        setError("");
        setMessage("");

        try {
            if (activeTab === "hospital") {
                setLoadingHospital(true);

                const response = await fetch(API_URL_SETTING, {
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const data: HospitalSettings = await response.json();

                setHospital({
                    id: data.id,
                    hospitalName: data.hospitalName ?? "",
                    registrationNumber: data.registrationNumber ?? "",
                    email: data.email ?? "",
                    phone: data.phone ?? "",
                    address: data.address ?? "",
                    city: data.city ?? "",
                    state: data.state ?? "",
                    postalCode: data.postalCode ?? "",
                });

                setMessage("Hospital information restored.");
            } else if (activeTab === "profile") {
                setLoadingProfile(true);

                const response = await fetch(PROFILE_API_URL, {
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const data: ProfileSettings = await response.json();

                setProfile({
                    fullName: data.fullName ?? "",
                    email: data.email ?? "",
                    phone: data.phone ?? "",
                    jobTitle: data.jobTitle ?? "",
                });

                setMessage("Profile information restored.");
            } else if (activeTab === "notifications") {
                setLoadingNotifications(true);

                const response = await fetch(NOTIFICATION_API_URL, {
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const data: NotificationSettings = await response.json();

                setNotifications({
                    appointments: data.appointments ?? true,
                    billing: data.billing ?? true,
                    patientUpdates: data.patientUpdates ?? false,
                    systemAlerts: data.systemAlerts ?? true,
                    emailNotifications: data.emailNotifications ?? true,
                    inAppNotifications: data.inAppNotifications ?? true,
                });

                setMessage("Notification preferences restored.");
            } else if (activeTab === "security") {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setQrCodeDataUrl("");
                setSetupSecret("");
                setLoadingSecurity(true);

                const response = await fetch(SECURITY_API_URL, {
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(await readErrorMessage(response));
                }

                const data: SecuritySettings = await response.json();

                setTwoFactorEnabled(data.twoFactorEnabled ?? false);
                setMessage("Security preferences restored.");
            } else {
                setTheme("light");
                setMessage("Theme selection reset.");
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? `Unable to reset settings: ${err.message}`
                    : "Unable to reset settings."
            );
        } finally {
            setLoadingHospital(false);
            setLoadingProfile(false);
            setLoadingNotifications(false);
            setLoadingSecurity(false);
        }
    };

    const updateNotification = (
        key: keyof NotificationSettings,
        value: boolean
    ) => {
        setNotifications((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const renderHospitalSettings = () => (
        <>
            <div className="settings-section-heading">
                <div>
                    <h2>Hospital Information</h2>
                    <p>
                        Manage your hospital's general information and contact details.
                    </p>
                </div>
                <div className="settings-heading-icon">
                    <Building2 size={23} />
                </div>
            </div>

            {loadingHospital && (
                <p role="status">Loading hospital information...</p>
            )}

            <div className="hospital-profile-banner">
                <div className="hospital-logo">
                    <Building2 size={29} />
                </div>
                <div className="hospital-banner-copy">
                    <h3>{hospital.hospitalName || "Your Hospital Name"}</h3>
                    <p>Hospital profile and organization details</p>
                </div>
                <span className="settings-active-badge">
                    <CheckCircle2 size={14} /> Active
                </span>
            </div>

            <div className="settings-form-grid">
                <label className="settings-field settings-full-field">
                    Hospital name *
                    <input
                        required
                        value={hospital.hospitalName}
                        onChange={(event) =>
                            setHospital({
                                ...hospital,
                                hospitalName: event.target.value,
                            })
                        }
                        placeholder="Enter hospital name"
                    />
                </label>

                <label className="settings-field">
                    Registration number
                    <input
                        value={hospital.registrationNumber}
                        onChange={(event) =>
                            setHospital({
                                ...hospital,
                                registrationNumber: event.target.value,
                            })
                        }
                        placeholder="Registration number"
                    />
                </label>

                <label className="settings-field">
                    Official email *
                    <div className="settings-input-icon">
                        <Mail size={17} />
                        <input
                            type="email"
                            required
                            value={hospital.email}
                            onChange={(event) =>
                                setHospital({
                                    ...hospital,
                                    email: event.target.value,
                                })
                            }
                            placeholder="hospital@example.com"
                        />
                    </div>
                </label>

                <label className="settings-field">
                    Phone number *
                    <div className="settings-input-icon">
                        <Phone size={17} />
                        <input
                            required
                            value={hospital.phone}
                            onChange={(event) =>
                                setHospital({
                                    ...hospital,
                                    phone: event.target.value,
                                })
                            }
                            placeholder="+91 98765 43210"
                        />
                    </div>
                </label>

                <label className="settings-field">
                    Street address *
                    <div className="settings-input-icon">
                        <MapPin size={17} />
                        <input
                            required
                            value={hospital.address}
                            onChange={(event) =>
                                setHospital({
                                    ...hospital,
                                    address: event.target.value,
                                })
                            }
                            placeholder="Street address"
                        />
                    </div>
                </label>

                <label className="settings-field">
                    City *
                    <input
                        required
                        value={hospital.city}
                        onChange={(event) =>
                            setHospital({
                                ...hospital,
                                city: event.target.value,
                            })
                        }
                        placeholder="City"
                    />
                </label>

                <label className="settings-field">
                    State *
                    <input
                        required
                        value={hospital.state}
                        onChange={(event) =>
                            setHospital({
                                ...hospital,
                                state: event.target.value,
                            })
                        }
                        placeholder="State"
                    />
                </label>

                <label className="settings-field">
                    Postal code *
                    <input
                        required
                        value={hospital.postalCode}
                        onChange={(event) =>
                            setHospital({
                                ...hospital,
                                postalCode: event.target.value,
                            })
                        }
                        placeholder="Postal code"
                    />
                </label>
            </div>
        </>
    );

    const renderProfileSettings = () => (
        <>
            <div className="settings-section-heading">
                <div>
                    <h2>My Profile</h2>
                    <p>
                        Update your administrator profile and contact information.
                    </p>
                </div>
                <div className="settings-heading-icon">
                    <UserRound size={23} />
                </div>
            </div>

            {loadingProfile && (
                <p role="status">Loading profile information...</p>
            )}

            <div className="profile-avatar-section">
                <div className="profile-avatar">
                    {profile.fullName
                        .split(" ")
                        .filter(Boolean)
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "AD"}
                    <span className="profile-online-dot" />
                </div>

                <div className="profile-avatar-info">
                    <h3>{profile.fullName || "Your Name"}</h3>
                    <p>{profile.jobTitle || "Your job title"}</p>
                    <span>Administrator account</span>
                </div>
            </div>

            <div className="settings-form-grid">
                <label className="settings-field settings-full-field">
                    Full name *
                    <input
                        required
                        value={profile.fullName}
                        onChange={(event) =>
                            setProfile({
                                ...profile,
                                fullName: event.target.value,
                            })
                        }
                        placeholder="Enter your full name"
                    />
                </label>

                <label className="settings-field">
                    Email address *
                    <input
                        type="email"
                        required
                        value={profile.email}
                        onChange={(event) =>
                            setProfile({
                                ...profile,
                                email: event.target.value,
                            })
                        }
                        placeholder="you@example.com"
                    />
                </label>

                <label className="settings-field">
                    Phone number
                    <input
                        value={profile.phone}
                        onChange={(event) =>
                            setProfile({
                                ...profile,
                                phone: event.target.value,
                            })
                        }
                        placeholder="+91 98765 43210"
                    />
                </label>

                <label className="settings-field settings-full-field">
                    Job title
                    <input
                        value={profile.jobTitle}
                        onChange={(event) =>
                            setProfile({
                                ...profile,
                                jobTitle: event.target.value,
                            })
                        }
                        placeholder="e.g. System Administrator"
                    />
                </label>
            </div>
        </>
    );

    const renderNotifications = () => (
        <>
            <div className="settings-section-heading">
                <div>
                    <h2>Notification Preferences</h2>
                    <p>Choose which updates you want to receive.</p>
                </div>
                <div className="settings-heading-icon">
                    <Bell size={23} />
                </div>
            </div>

            {loadingNotifications && (
                <p role="status">Loading notification preferences...</p>
            )}

            <div className="notification-group">
                <div className="notification-group-heading">
                    <h3>Notification channels</h3>
                    <p>Choose how you receive notifications.</p>
                </div>

                {(
                    [
                        {
                            key: "emailNotifications",
                            title: "Email notifications",
                            description: "Receive important updates through email.",
                            icon: Mail,
                        },
                        {
                            key: "inAppNotifications",
                            title: "In-app notifications",
                            description: "Show alerts and reminders inside the application.",
                            icon: Bell,
                        },
                    ] as const
                ).map((item) => {
                    const Icon = item.icon;

                    return (
                        <div className="settings-toggle-row" key={item.key}>
                            <div className="settings-toggle-copy">
                                <div className="settings-toggle-icon">
                                    <Icon size={19} />
                                </div>
                                <div>
                                    <strong>{item.title}</strong>
                                    <p>{item.description}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={notifications[item.key]}
                                className={`settings-switch ${
                                    notifications[item.key] ? "enabled" : ""
                                }`}
                                onClick={() =>
                                    updateNotification(
                                        item.key,
                                        !notifications[item.key]
                                    )
                                }
                                aria-label={`Toggle ${item.title}`}
                            >
                                <span />
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="notification-group">
                <div className="notification-group-heading">
                    <h3>Events and alerts</h3>
                    <p>Choose which events are important to you.</p>
                </div>

                {(
                    [
                        {
                            key: "appointments",
                            title: "Appointment reminders",
                            description: "New bookings, cancellations, and schedule changes.",
                            icon: CheckCircle2,
                        },
                        {
                            key: "billing",
                            title: "Billing and payments",
                            description: "Invoice updates, payments, and outstanding balances.",
                            icon: LockKeyhole,
                        },
                        {
                            key: "patientUpdates",
                            title: "Patient updates",
                            description: "Patient registration and record updates.",
                            icon: UserRound,
                        },
                        {
                            key: "systemAlerts",
                            title: "System alerts",
                            description: "Application updates and important system messages.",
                            icon: ShieldCheck,
                        },
                    ] as const
                ).map((item) => {
                    const Icon = item.icon;

                    return (
                        <div className="settings-toggle-row" key={item.key}>
                            <div className="settings-toggle-copy">
                                <div className="settings-toggle-icon">
                                    <Icon size={19} />
                                </div>
                                <div>
                                    <strong>{item.title}</strong>
                                    <p>{item.description}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={notifications[item.key]}
                                className={`settings-switch ${
                                    notifications[item.key] ? "enabled" : ""
                                }`}
                                onClick={() =>
                                    updateNotification(
                                        item.key,
                                        !notifications[item.key]
                                    )
                                }
                                aria-label={`Toggle ${item.title}`}
                            >
                                <span />
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );

    const renderSecurity = () => (
        <>
            <div className="settings-section-heading">
                <div>
                    <h2>Security Settings</h2>
                    <p>Manage your password and account security preferences.</p>
                </div>
                <div className="settings-heading-icon">
                    <ShieldCheck size={23} />
                </div>
            </div>

            <div className="security-info-banner">
                <div className="security-info-icon">
                    <ShieldCheck size={21} />
                </div>
                <div>
                    <strong>Keep your account secure</strong>
                    <p>
                        Use a unique password and enable additional verification
                        when available.
                    </p>
                </div>
            </div>

            <div className="security-subheading">
                <LockKeyhole size={18} />
                <h3>Change password</h3>
            </div>

            <div className="settings-form-grid">
                <label className="settings-field settings-full-field">
                    Current password *
                    <div className="settings-input-icon password-input">
                        <input
                            required
                            type={showCurrentPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(event) =>
                                setCurrentPassword(event.target.value)
                            }
                            placeholder="Enter current password"
                        />
                        <button
                            type="button"
                            onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                            }
                            aria-label={
                                showCurrentPassword
                                    ? "Hide password"
                                    : "Show password"
                            }
                        >
                            {showCurrentPassword ? (
                                <EyeOff size={17} />
                            ) : (
                                <Eye size={17} />
                            )}
                        </button>
                    </div>
                </label>

                <label className="settings-field">
                    New password *
                    <div className="settings-input-icon password-input">
                        <input
                            required
                            type={showNewPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(event) =>
                                setNewPassword(event.target.value)
                            }
                            placeholder="Minimum 8 characters"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            aria-label={
                                showNewPassword
                                    ? "Hide password"
                                    : "Show password"
                            }
                        >
                            {showNewPassword ? (
                                <EyeOff size={17} />
                            ) : (
                                <Eye size={17} />
                            )}
                        </button>
                    </div>
                </label>

                <label className="settings-field">
                    Confirm new password *
                    <input
                        required
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) =>
                            setConfirmPassword(event.target.value)
                        }
                        placeholder="Re-enter new password"
                    />
                </label>
            </div>

            <div className="security-password-hint">
                <LockKeyhole size={15} />
                Use at least 8 characters. A mix of letters, numbers, and symbols
                is recommended.
            </div>

            <div className="settings-divider" />

            {loadingSecurity && (
                <p role="status">Loading security settings...</p>
            )}

            <div className="settings-toggle-row two-factor-row">
                <div className="settings-toggle-copy">
                    <div className="settings-toggle-icon">
                        <ShieldCheck size={19} />
                    </div>
                    <div>
                        <strong>Two-factor authentication preference</strong>
                        <p>
                            This setting saves your preference. Actual login
                            verification must also be implemented in the backend.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    role="switch"
                    aria-checked={twoFactorEnabled}
                    className={`settings-switch ${
                        twoFactorEnabled ? "enabled" : ""
                    }`}
                    onClick={() => void handleTwoFactorToggle()}
                    disabled={loadingSecurity || savingTwoFactor}
                    aria-label="Toggle two-factor authentication preference"
                >
                    <span />
                </button>

                {savingTwoFactor && <span role="status">Saving...</span>}
            </div>

            <div className="settings-divider" />

            <div className="two-factor-setup">
                <div className="security-subheading">
                    <ShieldCheck size={18} />
                    <h3>Microsoft Authenticator setup</h3>
                </div>

                <p>
                    Generate a QR code and scan it with Microsoft Authenticator.
                    Generating a QR code alone does not activate two-factor login.
                </p>

                <button
                    type="button"
                    className="settings-save-btn"
                    onClick={() => void handleSetupTwoFactor()}
                    disabled={settingUpTwoFactor}
                >
                    {settingUpTwoFactor
                        ? "Generating QR code..."
                        : "Set up authenticator"}
                </button>

                {qrCodeDataUrl && (
                    <div className="authenticator-qr">
                        <img
                            src={qrCodeDataUrl}
                            alt="Authenticator setup QR code"
                            width={240}
                            height={240}
                        />

                        <p>
                            Open Microsoft Authenticator and scan this QR code.
                        </p>

                        {setupSecret && (
                            <details>
                                <summary>Show manual setup key</summary>
                                <p>
                                    Keep this key private. Anyone with it may be
                                    able to generate your authentication codes.
                                </p>
                                <code>{setupSecret}</code>
                            </details>
                        )}
                    </div>
                )}
            </div>
        </>
    );

    const renderAppearance = () => (
        <>
            <div className="settings-section-heading">
                <div>
                    <h2>Appearance</h2>
                    <p>Personalize the look and feel of your dashboard.</p>
                </div>
                <div className="settings-heading-icon">
                    <Palette size={23} />
                </div>
            </div>

            <div className="appearance-section">
                <h3>Theme preference</h3>
                <p>Select your preferred dashboard appearance.</p>

                <div className="theme-options">
                    {(
                        [
                            {
                                id: "light",
                                title: "Light",
                                description: "Bright and clean",
                                icon: Sun,
                            },
                            {
                                id: "dark",
                                title: "Dark",
                                description: "Low-light appearance",
                                icon: Moon,
                            },
                            {
                                id: "system",
                                title: "System",
                                description: "Follow device preference",
                                icon: Monitor,
                            },
                        ] as const
                    ).map((option) => {
                        const Icon = option.icon;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                className={`theme-option ${
                                    theme === option.id ? "selected" : ""
                                }`}
                                onClick={() => setTheme(option.id)}
                                aria-pressed={theme === option.id}
                            >
                                <div className={`theme-preview ${option.id}`}>
                                    <div className="theme-preview-sidebar" />
                                    <div className="theme-preview-content">
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </div>

                                <div className="theme-option-info">
                                    <Icon size={18} />
                                    <div>
                                        <strong>{option.title}</strong>
                                        <span>{option.description}</span>
                                    </div>

                                    <span className="theme-radio">
                                        {theme === option.id && <span />}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <p className="appearance-note">
                    Current selection: <strong>{theme}</strong>. This preference
                    is currently stored in the React session. Connecting it to
                    your application layout is required to apply the theme
                    site-wide.
                </p>
            </div>
        </>
    );

    return (
        <div className="settings-page">
            <div className="settings-page-header">
                <div>
                    <span className="settings-eyebrow">
                        PREFERENCES / CONFIGURATION
                    </span>
                    <h1>Settings</h1>
                    <p>Manage your hospital system preferences and account.</p>
                </div>

                <div className="settings-header-icon">
                    <Building2 size={24} />
                </div>
            </div>

            <div className="settings-layout">
                <aside className="settings-sidebar">
                    <div className="settings-sidebar-title">
                        SETTINGS MENU
                    </div>

                    {tabs.map((tab) => {
                        const Icon = tab.icon;

                        return (
                            <button
                                type="button"
                                key={tab.id}
                                className={`settings-nav-item ${
                                    activeTab === tab.id ? "active" : ""
                                }`}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setMessage("");
                                    setError("");
                                }}
                            >
                                <span className="settings-nav-icon">
                                    <Icon size={19} />
                                </span>

                                <span className="settings-nav-copy">
                                    <strong>{tab.label}</strong>
                                    <small>{tab.description}</small>
                                </span>
                            </button>
                        );
                    })}

                    <div className="settings-sidebar-help">
                        <ShieldCheck size={19} />
                        <strong>Need help?</strong>
                        <p>
                            Contact your system administrator for account
                            assistance.
                        </p>
                    </div>
                </aside>

                <main className="settings-content">
                    <form onSubmit={saveSettings}>
                        {activeTab === "hospital" && renderHospitalSettings()}
                        {activeTab === "profile" && renderProfileSettings()}
                        {activeTab === "notifications" && renderNotifications()}
                        {activeTab === "security" && renderSecurity()}
                        {activeTab === "appearance" && renderAppearance()}

                        {error && (
                            <div
                                className="settings-feedback error"
                                role="alert"
                            >
                                <ShieldCheck size={17} />
                                {error}
                            </div>
                        )}

                        {message && (
                            <div
                                className="settings-feedback success"
                                role="status"
                            >
                                <CheckCircle2 size={17} />
                                {message}
                            </div>
                        )}

                        <div className="settings-form-footer">
                            <button
                                type="button"
                                className="settings-reset-btn"
                                onClick={() => void resetCurrentTab()}
                                disabled={
                                    saving ||
                                    (activeTab === "hospital" &&
                                        loadingHospital) ||
                                    (activeTab === "profile" &&
                                        loadingProfile) ||
                                    (activeTab === "notifications" &&
                                        loadingNotifications) ||
                                    (activeTab === "security" &&
                                        (loadingSecurity || savingTwoFactor))
                                }
                            >
                                <RotateCcw size={16} />
                                Reset
                            </button>

                            <button
                                type="submit"
                                className="settings-save-btn"
                                disabled={
                                    saving ||
                                    (activeTab === "hospital" &&
                                        loadingHospital) ||
                                    (activeTab === "profile" &&
                                        loadingProfile) ||
                                    (activeTab === "notifications" &&
                                        loadingNotifications) ||
                                    (activeTab === "security" &&
                                        (loadingSecurity || savingTwoFactor))
                                }
                            >
                                <Save size={17} />
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}