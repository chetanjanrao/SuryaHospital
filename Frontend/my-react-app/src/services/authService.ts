

import {API_URL} from "../config.ts";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    message: string;
    email: string;
    twoFactorRequired: boolean;
    nextStep: string;
}

export interface CurrentUser {
    email: string;
    authenticated: boolean;
    authorities: string[];
}

export interface TwoFactorSetupResponse {
    secret: string;
    qrCodeDataUrl: string;
    message?: string;
}

function getCookie(name: string): string | null {
    const prefix = `${name}=`;

    const cookie = document.cookie
        .split("; ")
        .find((item) => item.startsWith(prefix));

    if (!cookie) {
        return null;
    }

    return decodeURIComponent(cookie.substring(prefix.length));
}

async function getErrorMessage(
    response: Response,
    fallback: string
): Promise<string> {
    const responseText = await response.text();

    if (responseText) {
        try {
            const data = JSON.parse(responseText);

            if (data.message) return data.message;
            if (data.error) return data.error;
        } catch {
            return responseText;
        }
    }

    return `${fallback} (${response.status}).`;
}

export async function getCsrfToken(): Promise<string> {
    const response = await fetch(`${API_URL}/api/auth/csrf`, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(response, "Unable to obtain CSRF token")
        );
    }

    const token = getCookie("XSRF-TOKEN");

    if (!token) {
        throw new Error(
            "XSRF-TOKEN cookie is missing. Check the backend CSRF configuration and browser cookies."
        );
    }

    return token;
}

async function csrfHeaders(): Promise<Record<string, string>> {
    const csrfToken = await getCsrfToken();

    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrfToken,
    };
}

export async function loginUser(
    credentials: LoginRequest
): Promise<LoginResponse> {
    console.log(API_URL)
    const headers = await csrfHeaders();

    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Login failed"));
    }

    return response.json() as Promise<LoginResponse>;
}

export async function getCurrentUser(): Promise<CurrentUser> {
    const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(response, "Unable to fetch current user")
        );
    }

    return response.json() as Promise<CurrentUser>;
}

export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
    const headers = await csrfHeaders();

    const response = await fetch(`${API_URL}/api/auth/2fa/setup`, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                "Unable to set up two-factor authentication"
            )
        );
    }

    const data = (await response.json()) as TwoFactorSetupResponse;

    if (!data.qrCodeDataUrl) {
        throw new Error(
            "The server response did not include qrCodeDataUrl."
        );
    }

    return data;
}

export async function logoutUser(): Promise<void> {
    const csrfToken = await getCsrfToken();

    const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "X-XSRF-TOKEN": csrfToken,
        },
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(
            message || `Logout failed (${response.status}).`
        );
    }
}


export async function beginLoginTwoFactorEnrollment(): Promise<TwoFactorSetupResponse> {
    const headers = await csrfHeaders();

    const response = await fetch(`${API_URL}/api/auth/2fa/enroll/setup`, {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(response, "Unable to load the QR code")
        );
    }

    const data = (await response.json()) as TwoFactorSetupResponse;

    if (!data.qrCodeDataUrl) {
        throw new Error("The server did not return a QR code.");
    }

    return data;
}

export async function verifyLoginTwoFactorEnrollment(
    code: string
): Promise<void> {
    const headers = await csrfHeaders();

    const response = await fetch(`${API_URL}/api/auth/2fa/enroll/verify`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                "Authenticator verification failed"
            )
        );
    }
}
