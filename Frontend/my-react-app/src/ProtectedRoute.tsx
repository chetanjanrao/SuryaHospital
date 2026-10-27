import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "./services/authService";

export default function ProtectedRoute() {
    const [status, setStatus] = useState<"loading" | "authed" | "guest">("loading");

    useEffect(() => {
        getCurrentUser()
            .then((user) => setStatus(user.authenticated ? "authed" : "guest"))
            .catch(() => setStatus("guest"));
    }, []);

    if (status === "loading") return <p>Loading...</p>;
    return status === "authed" ? <Outlet /> : <Navigate to="/login" replace />;
}