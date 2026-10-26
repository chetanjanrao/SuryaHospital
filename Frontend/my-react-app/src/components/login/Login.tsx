import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import {
	loginUser,
	getCsrfToken,
	beginLoginTwoFactorEnrollment,
	verifyLoginTwoFactorEnrollment,
} from "../../services/authService";

type LoginStep = "password" | "enrollment" | "verification";

//const API_URL = "http://localhost:8080/api/auth";
import {API_URL} from "../../config.ts";

export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [step, setStep] = useState<LoginStep>("password");

	const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
	const [manualSecret, setManualSecret] = useState("");

	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();

	async function getResponseError(
		response: Response
	): Promise<string> {
		const text = await response.text();

		if (text) {
			try {
				const data =
					JSON.parse(
						text
					);
				return (
					data.message ||
					data.detail ||
					data.error ||
					text
				);
			} catch {
				return text;
			}
		}

		return `Request failed (${response.status}).`;
	}

	// Step 1: Verify email and password.
	async function handleLogin(
		event: React.FormEvent<HTMLFormElement>
	) {
		event.preventDefault();
		console.log(
			"LOGIN BUTTON HANDLER STARTED"
		);
		window.alert(
			"Login button handler is running"
		);
		setError("");
		setMessage("");
		setLoading(true);

		try {
			const result =
				await loginUser(
					{
						email: email.trim(),
						password,
					}
				);
			console.log(
				"Login response:",
				result
			);
			console.log(
				"Next step:",
				result.nextStep
			);
			console.log(
				"Starting enrollment condition:",
				result.nextStep ===
					"ENROLL_2FA"
			);
			if (
				result.twoFactorRequired
			) {
				// Existing user with 2FA enabled.
				setStep(
					"verification"
				);
				setMessage(
					"Enter the six-digit code from your authenticator app."
				);
				return;
			}

			if (
				result.nextStep ===
				"ENROLL_2FA"
			) {
				// First-time enrollment: get the QR code.
				/*    const setup = await beginLoginTwoFactorEnrollment();

                setQrCodeDataUrl(setup.qrCodeDataUrl);
                setManualSecret(setup.secret);
                setStep("enrollment");
                setMessage(
                    "Scan this QR code with Microsoft Authenticator, then enter the six-digit code."
                );
                return;*/

				console.log(
					"Calling /api/auth/2fa/enroll/setup"
				);

				const setup =
					await beginLoginTwoFactorEnrollment();

				console.log(
					"Enrollment response:",
					setup
				);

				setQrCodeDataUrl(
					setup.qrCodeDataUrl
				);
				setManualSecret(
					setup.secret
				);
				setStep(
					"enrollment"
				);
				setMessage(
					"Scan this QR code with Microsoft Authenticator, then enter the six-digit code."
				);
				return;
			}

			// Normal login when enrollment is not required.
			navigate("/", {
				replace: true,
			});
		} catch (err) {
			setError(
				err instanceof
					Error
					? err.message
					: "Unable to sign in. Please try again."
			);
		} finally {
			setLoading(false);
		}
	}

	// Step 2A: Verify a code for an existing 2FA-enabled account.
	async function handleLoginVerification(
		event: React.FormEvent<HTMLFormElement>
	) {
		event.preventDefault();
		setError("");
		setMessage("");
		setLoading(true);

		try {
			const csrfToken =
				await getCsrfToken();

			const response =
				await fetch(
					`${API_URL}/api/auth/2fa/verify`,
					{
						method: "POST",
						credentials: "include",
						headers: {
							Accept: "application/json",
							"Content-Type": "application/json",
							"X-XSRF-TOKEN": csrfToken,
						},
						body: JSON.stringify(
							{
								code,
							}
						),
					}
				);

			if (!response.ok) {
				throw new Error(
					await getResponseError(
						response
					)
				);
			}

			navigate("/", {
				replace: true,
			});
		} catch (err) {
			setError(
				err instanceof
					Error
					? err.message
					: "Verification failed. Please try again."
			);
		} finally {
			setLoading(false);
		}
	}

	// Step 2B: Verify enrollment and enable 2FA.
	async function handleEnrollmentVerification(
		event: React.FormEvent<HTMLFormElement>
	) {
		event.preventDefault();
		setError("");
		setMessage("");
		setLoading(true);

		try {
			await verifyLoginTwoFactorEnrollment(
				code
			);
			navigate("/", {
				replace: true,
			});
		} catch (err) {
			setError(
				err instanceof
					Error
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
		<main className="login-page">
			<section className="login-card">
				<div className="login-brand">
					<div
						className="login-brand-icon"
						aria-hidden="true">
						+
					</div>

					<p className="login-brand-name">
						Hospital
						Management
						-
						Updated
					</p>
				</div>

				{step ===
					"password" && (
					<>
						<h1>
							Welcome
							back
						</h1>
						<p className="login-subtitle">
							Sign
							in
							to
							access
							your
							hospital
							dashboard
							updated.
						</p>

						<form
							onSubmit={
								handleLogin
							}>
							<div className="login-field">
								<label htmlFor="email">
									Email
									address
								</label>

								<input
									id="email"
									type="email"
									value={
										email
									}
									onChange={(
										event
									) =>
										setEmail(
											event
												.target
												.value
										)
									}
									placeholder="Enter your email"
									autoComplete="username"
									required
									disabled={
										loading
									}
								/>
							</div>

							<div className="login-field">
								<label htmlFor="password">
									Password
								</label>

								<input
									id="password"
									type="password"
									value={
										password
									}
									onChange={(
										event
									) =>
										setPassword(
											event
												.target
												.value
										)
									}
									placeholder="Enter your password"
									autoComplete="current-password"
									required
									disabled={
										loading
									}
								/>
							</div>

							{error && (
								<div
									className="login-error"
									role="alert">
									{
										error
									}
								</div>
							)}

							<button
								className="login-button"
								type="submit"
								disabled={
									loading
								}>
								{loading
									? "Signing in..."
									: "Sign in"}
							</button>
						</form>
					</>
				)}

				{step ===
					"enrollment" && (
					<>
						<h1>
							Set
							up
							two-factor
							authentication
						</h1>

						<p className="login-subtitle">
							Add
							an
							extra
							layer
							of
							security
							to
							your
							account.
						</p>

						{qrCodeDataUrl ? (
							<div className="login-qr-wrapper">
								<img
									className="login-qr-code"
									src={
										qrCodeDataUrl
									}
									alt="Authenticator setup QR code"
								/>
							</div>
						) : (
							<p className="login-info">
								The
								QR
								code
								is
								unavailable.
								Please
								return
								to
								sign-in
								and
								try
								again.
							</p>
						)}

						<ol className="login-instructions">
							<li>
								Open
								Microsoft
								Authenticator
								on
								your
								phone.
							</li>
							<li>
								Tap
								the
								option
								to
								add
								an
								account
								and
								scan
								a
								QR
								code.
							</li>
							<li>
								Scan
								the
								QR
								code
								above
								and
								enter
								the
								current
								six-digit
								code
								below.
							</li>
						</ol>

						{manualSecret && (
							<details className="login-manual-secret">
								<summary>
									Can't
									scan
									the
									QR
									code?
								</summary>
								<p>
									Add
									an
									account
									manually
									using
									this
									secret:
								</p>
								<code>
									{
										manualSecret
									}
								</code>
							</details>
						)}

						<form
							onSubmit={
								handleEnrollmentVerification
							}>
							<div className="login-field">
								<label htmlFor="enrollment-code">
									Six-digit
									authenticator
									code
								</label>

								<input
									id="enrollment-code"
									type="text"
									inputMode="numeric"
									autoComplete="one-time-code"
									pattern="[0-9]{6}"
									maxLength={
										6
									}
									value={
										code
									}
									onChange={(
										event
									) =>
										setCode(
											event.target.value
												.replace(
													/\D/g,
													""
												)
												.slice(
													0,
													6
												)
										)
									}
									placeholder="000000"
									required
									disabled={
										loading
									}
								/>
							</div>

							{message && (
								<p
									className="login-info"
									role="status">
									{
										message
									}
								</p>
							)}

							{error && (
								<div
									className="login-error"
									role="alert">
									{
										error
									}
								</div>
							)}

							<button
								className="login-button"
								type="submit"
								disabled={
									loading ||
									code.length !==
										6
								}>
								{loading
									? "Verifying..."
									: "Verify and enable"}
							</button>
						</form>

						<button
							className="login-secondary-button"
							type="button"
							onClick={
								returnToLogin
							}
							disabled={
								loading
							}>
							Back
							to
							sign
							in
						</button>
					</>
				)}

				{step ===
					"verification" && (
					<>
						<h1>
							Verify
							your
							identity
						</h1>

						<p className="login-subtitle">
							Enter
							the
							six-digit
							code
							from
							Microsoft
							Authenticator
							or
							your
							configured
							authenticator
							app.
						</p>

						<form
							onSubmit={
								handleLoginVerification
							}>
							<div className="login-field">
								<label htmlFor="verification-code">
									Authenticator
									code
								</label>

								<input
									id="verification-code"
									type="text"
									inputMode="numeric"
									autoComplete="one-time-code"
									pattern="[0-9]{6}"
									maxLength={
										6
									}
									value={
										code
									}
									onChange={(
										event
									) =>
										setCode(
											event.target.value
												.replace(
													/\D/g,
													""
												)
												.slice(
													0,
													6
												)
										)
									}
									placeholder="000000"
									required
									disabled={
										loading
									}
								/>
							</div>

							{message && (
								<p
									className="login-info"
									role="status">
									{
										message
									}
								</p>
							)}

							{error && (
								<div
									className="login-error"
									role="alert">
									{
										error
									}
								</div>
							)}

							<button
								className="login-button"
								type="submit"
								disabled={
									loading ||
									code.length !==
										6
								}>
								{loading
									? "Verifying..."
									: "Verify and sign in"}
							</button>
						</form>

						<button
							className="login-secondary-button"
							type="button"
							onClick={
								returnToLogin
							}
							disabled={
								loading
							}>
							Back
							to
							sign
							in
						</button>
					</>
				)}

				<p className="login-footer">
					Secure
					access
					to
					your
					hospital
					management
					system
				</p>
			</section>
		</main>
	);
}
