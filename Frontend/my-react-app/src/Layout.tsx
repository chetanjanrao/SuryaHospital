import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "./services/authService.ts";
import {
    Activity,
    BedDouble,
    CalendarDays,
    ChevronDown,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Menu,
    Search,
    Settings,
    Stethoscope,
    Users,
    Bell,
} from "lucide-react";

import "./App.css";

export type LayoutContextType = {
    search: string;
    setSearch: (value: string) => void;
};

function Layout() {
    const [search, setSearch] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const navigation = [
        { label: "Dashboard", path: "/", icon: LayoutDashboard },
        { label: "Patients", path: "/patients", icon: Users },
        { label: "Doctors", path: "/doctors", icon: Stethoscope },
        { label: "Appointments", path: "/appointments", icon: CalendarDays },
        { label: "Medical Records", path: "/medical-records", icon: ClipboardList },
        { label: "Departments", path: "/departments", icon: Activity },
        { label: "Bed Management", path: "/bed-management", icon: BedDouble },
    ];

    const currentPage =
        navigation.find(
            (item) =>
                item.path === location.pathname &&
                (item.path !== "/" || location.pathname === "/")
        )?.label ??
        (location.pathname === "/billing"
            ? "Billing"
            : location.pathname === "/settings"
                ? "Settings"
                : "Dashboard");

    // Logout: always send the user to /login, even if the server call fails
    // (e.g. the session already expired). ProtectedRoute re-checks the session.
    async function handleLogOut() {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            navigate("/login", { replace: true });
        }
    }

    return (
        <div className="app-shell">
            {sidebarOpen && (
                <button
                    className="sidebar-overlay"
                    aria-label="Close navigation"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
                <div className="brand">
                    <div className="brand-icon">
                        <Activity size={25} />
                    </div>
                    <div>
                        <h2>Surya Hospital</h2>
                        <span>Hospital Management</span>
                    </div>
                </div>

                <div className="menu-label">MAIN MENU</div>

                <nav className="navigation">
                    {navigation.map(({ label, path, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            end={path === "/"}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? "nav-active" : ""}`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Icon size={19} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="menu-label management-label">MANAGEMENT</div>

                <NavLink
                    to="/billing"
                    className={({ isActive }) =>
                        `nav-item ${isActive ? "nav-active" : ""}`
                    }
                    onClick={() => setSidebarOpen(false)}
                >
                    <ClipboardList size={19} />
                    <span>Billing & Payments</span>
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `nav-item ${isActive ? "nav-active" : ""}`
                    }
                    onClick={() => setSidebarOpen(false)}
                >
                    <Settings size={19} />
                    <span>Settings</span>
                </NavLink>

                <div className="sidebar-bottom">
                    <div className="support-card">
                        <div className="support-icon">
                            <Activity size={20} />
                        </div>

                        <strong>Need help?</strong>
                        <p>Contact your system administrator.</p>

                        <button
                            onClick={() =>
                                window.alert(
                                    "Contact your hospital administrator."
                                )
                            }
                        >
                            Get Support
                        </button>
                    </div>

                    <button
                        className="nav-item logout-button"
                        onClick={handleLogOut}
                    >
                        <LogOut size={19} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="main-area">
                <header className="topbar">
                    <button
                        className="mobile-menu"
                        aria-label="Open navigation"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={23} />
                    </button>

                    <div className="breadcrumb">
                        <span>Pages</span>
                        <span>/</span>
                        <strong>{currentPage}</strong>
                    </div>

                    <div className="topbar-actions">
                        <label className="global-search">
                            <Search size={18} />

                            <input
                                placeholder="Search anything..."
                                aria-label="Search appointments"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />

                            <kbd>⌘ K</kbd>
                        </label>

                        <button
                            className="icon-button notification-button"
                            aria-label="Notifications"
                            onClick={() =>
                                window.alert("No new notifications.")
                            }
                        >
                            <Bell size={20} />
                            <span />
                        </button>

                        <div className="profile">
                            <div className="profile-avatar">AD</div>

                            <div className="profile-info">
                                <strong>Admin Desk</strong>
                                <span>Administrator</span>
                            </div>

                            <ChevronDown size={17} />
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">
                    <Outlet context={{ search, setSearch }} />
                </div>
            </main>
        </div>
    );
}

export default Layout;