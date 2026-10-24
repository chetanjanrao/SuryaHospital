
package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.TwoFactorSetupResponse;
import com.surya.hospitalmanagement.dto.TwoFactorVerifyRequest;
import com.surya.hospitalmanagement.service.TwoFactorService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/2fa")
public class TwoFactorController {

    private static final String PENDING_EMAIL = "PENDING_2FA_EMAIL";
    private static final String PENDING_EXPIRY = "PENDING_2FA_EXPIRY";
    private static final String PENDING_ATTEMPTS = "PENDING_2FA_ATTEMPTS";
    private static final String PENDING_FLOW = "PENDING_2FA_FLOW";

    private static final String ENROLL_FLOW = "ENROLL_2FA";
    private static final long PENDING_LOGIN_LIFETIME_MS = 5 * 60 * 1000L;
    private static final int MAX_ATTEMPTS = 5;

    private final TwoFactorService twoFactorService;

    public TwoFactorController(TwoFactorService twoFactorService) {
        this.twoFactorService = twoFactorService;
    }

    // Existing endpoint for an authenticated user.
    @PostMapping("/setup")
    public TwoFactorSetupResponse setup(Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please log in first"
            );
        }

        return twoFactorService.beginEnrollment(authentication.getName());
    }

    // First-time enrollment: password has been verified, but the user
    // is not fully authenticated until the authenticator code is verified.
    @PostMapping("/enroll/setup")
    public ResponseEntity<TwoFactorSetupResponse> setupEnrollment(
            HttpServletRequest request) {

        HttpSession session = requirePendingEnrollment(request);

        String email = (String) session.getAttribute(PENDING_EMAIL);

        TwoFactorSetupResponse setup =
                twoFactorService.beginEnrollment(email);

        return ResponseEntity.ok(setup);
    }

    // First-time enrollment verification.
    @PostMapping("/enroll/verify")
    public ResponseEntity<Map<String, String>> verifyEnrollment(
            @Valid @RequestBody TwoFactorVerifyRequest requestBody,
            HttpServletRequest request) {

        HttpSession session = requirePendingEnrollment(request);

        String email = (String) session.getAttribute(PENDING_EMAIL);
        int attempts = (Integer) session.getAttribute(PENDING_ATTEMPTS);

        if (attempts >= MAX_ATTEMPTS) {
            clearPendingEnrollment(session);

            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Too many attempts. Please log in again."
            );
        }

        try {
            String message = twoFactorService.verifyAndEnable(
                    email,
                    requestBody.code()
            );

            clearPendingEnrollment(session);

            return ResponseEntity.ok(Map.of("message", message));

        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode() == HttpStatus.BAD_REQUEST) {
                int updatedAttempts = attempts + 1;

                if (updatedAttempts >= MAX_ATTEMPTS) {
                    clearPendingEnrollment(session);
                } else {
                    session.setAttribute(PENDING_ATTEMPTS, updatedAttempts);
                }
            }

            throw exception;
        }
    }

    private HttpSession requirePendingEnrollment(
            HttpServletRequest request) {

        HttpSession session = request.getSession(false);

        if (session == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Enrollment session expired. Please log in again."
            );
        }

        Object emailValue = session.getAttribute(PENDING_EMAIL);
        Object expiryValue = session.getAttribute(PENDING_EXPIRY);
        Object attemptsValue = session.getAttribute(PENDING_ATTEMPTS);
        Object flowValue = session.getAttribute(PENDING_FLOW);

        if (!(emailValue instanceof String)
                || !(expiryValue instanceof Long)
                || !(attemptsValue instanceof Integer)
                || !ENROLL_FLOW.equals(flowValue)) {

            clearPendingEnrollment(session);

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No pending authenticator enrollment. Please log in again."
            );
        }

        long expiry = (Long) expiryValue;

        if (System.currentTimeMillis() > expiry) {
            clearPendingEnrollment(session);

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Enrollment expired. Please log in again."
            );
        }

        return session;
    }

    private void clearPendingEnrollment(HttpSession session) {
        session.removeAttribute(PENDING_EMAIL);
        session.removeAttribute(PENDING_EXPIRY);
        session.removeAttribute(PENDING_ATTEMPTS);
        session.removeAttribute(PENDING_FLOW);
    }
}
