
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import "./Login.css";
import { loginUser, getCsrfToken } from "../../services/authService";


import {API_URL} from "../../config.ts";

type LoginStep = "password" | "enrollment" | "verification";

interface EnrollmentSetupResponse {
    qrCodeDataUrl: string;
    secret?: string;
}

async function getResponseError(response: Response): Promise<string> {
    try {
        const data = await response.json();
        return data.message || data.error || `Request failed (${response.status})`;
    } catch {
        return `Request failed (${response.status})`;
    }
}

export default function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const [step, setStep] = useState<LoginStep>("password");
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
    const [manualSecret, setManualSecret] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setMessage("");
        setLoading(true);

        try {
            // Step 1: Verify email and password.
            const result = await loginUser({
                email: email.trim(),
                password,
            });

            console.log("Login response:", result);

            // Step 2: Existing account with 2FA enabled.
            if (result.twoFactorRequired) {
                setCode("");
                setStep("verification");
                setMessage(
                    "Enter the six-digit code from Microsoft Authenticator."
                );
                return;
            }

            // Step 3: First-time login requires authenticator enrollment.
            if (result.nextStep === "ENROLL_2FA") {
                const csrfToken = await getCsrfToken();

                const response = await fetch(
                    `${API_URL}/api/auth/2fa/enroll/setup`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            Accept: "application/json",
                            "X-XSRF-TOKEN": csrfToken,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(await getResponseError(response));
                }

                const setup: EnrollmentSetupResponse = await response.json();

                if (!setup.qrCodeDataUrl) {
                    throw new Error("The server did not return a QR code.");
                }

                setQrCodeDataUrl(setup.qrCodeDataUrl);
                setManualSecret(setup.secret ?? "");
                setCode("");
                setStep("enrollment");
                setMessage(
                    "Scan the QR code with Microsoft Authenticator, then enter the six-digit code."
                );
                return;
            }

            throw new Error(
                result.message || "The login response was unexpected."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to sign in. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleLoginVerification(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");
        setMessage("");
        setLoading(true);

        try {
            const csrfToken = await getCsrfToken();

            const response = await fetch(`${API_URL}/api/auth/2fa/verify`, {
                method: "POST",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": csrfToken,
                },
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                throw new Error(await getResponseError(response));
            }

            navigate("/", { replace: true });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to verify the authenticator code."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleEnrollmentVerification(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");
        setMessage("");
        setLoading(true);

        try {
            const csrfToken = await getCsrfToken();

            const response = await fetch(
                `${API_URL}/api/auth/2fa/enroll/verify`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-XSRF-TOKEN": csrfToken,
                    },
                    body: JSON.stringify({ code }),
                }
            );

            if (!response.ok) {
                throw new Error(await getResponseError(response));
            }

            navigate("/", { replace: true });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to verify the authenticator code."
            );
        } finally {
            setLoading(false);
        }
    }

    function returnToLogin() {
        setStep("password");
        setCode("");
        setError("");
        setMessage("");
        setQrCodeDataUrl("");
        setManualSecret("");
    }

    return (
        <div className="login-page">
            <form
                className="login-card"
                onSubmit={
                    step === "password"
                        ? handleSubmit
                        : step === "enrollment"
                          ? handleEnrollmentVerification
                          : handleLoginVerification
                }
            >
                <div className="login-icon">+</div>

                <h1>Hospital Management</h1>

                <p className="login-subtitle">
                    {step === "password"
                        ? "Sign in to access your dashboard"
                        : step === "enrollment"
                          ? "Set up your authenticator"
                          : "Verify your identity"}
                </p>

                {step === "password" && (
                    <>
                        <label htmlFor="email">Email address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            autoComplete="username"
                            required
                        />

                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                        />
                    </>
                )}

                {step === "enrollment" && (
                    <>
                        <p>1. Open Microsoft Authenticator on your phone.</p>
                        <p>2. Add an account and scan this QR code.</p>

                        {qrCodeDataUrl && (
                            <img
                                src={qrCodeDataUrl}
                                alt="Authenticator enrollment QR code"
                                className="login-qr-code"
                            />
                        )}

                        {manualSecret && (
                            <p>
                                If you cannot scan the QR code, enter this key
                                manually: <strong>{manualSecret}</strong>
                            </p>
                        )}

                        <label htmlFor="enrollment-code">
                            Six-digit authenticator code
                        </label>
                        <input
                            id="enrollment-code"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            value={code}
                            onChange={(event) =>
                                setCode(event.target.value.replace(/\D/g, ""))
                            }
                            placeholder="123456"
                            autoComplete="one-time-code"
                            required
                        />
                    </>
                )}

                {step === "verification" && (
                    <>
                        <label htmlFor="verification-code">
                            Authenticator code
                        </label>
                        <input
                            id="verification-code"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            value={code}
                            onChange={(event) =>
                                setCode(event.target.value.replace(/\D/g, ""))
                            }
                            placeholder="Enter six-digit code"
                            autoComplete="one-time-code"
                            required
                        />
                    </>
                )}

                {message && (
                    <p className="login-message" role="status">
                        {message}
                    </p>
                )}

                {error && (
                    <p className="login-error" role="alert">
                        {error}
                    </p>
                )}

                <button type="submit" disabled={loading}>
                    {loading
                        ? "Please wait..."
                        : step === "password"
                          ? "Sign in"
                          : step === "enrollment"
                            ? "Verify and enable 2FA"
                            : "Verify and sign in"}
                </button>

                {step !== "password" && (
                    <button
                        type="button"
                        className="login-back-button"
                        onClick={returnToLogin}
                        disabled={loading}
                    >
                        Back to sign in
                    </button>
                )}

                <p className="login-footer">
                    Secure hospital staff access and security
                </p>
            </form>
        </div>
    );
}
