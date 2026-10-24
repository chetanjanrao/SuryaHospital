
package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.LoginRequest;
import com.surya.hospitalmanagement.dto.LoginResponse;
import com.surya.hospitalmanagement.dto.RegisterRequest;
import com.surya.hospitalmanagement.dto.RegisterResponse;
import com.surya.hospitalmanagement.dto.TwoFactorVerifyRequest;
import com.surya.hospitalmanagement.entity.AppUser;
import com.surya.hospitalmanagement.repository.AppUserRepository;
import com.surya.hospitalmanagement.service.AuthService;
import com.surya.hospitalmanagement.service.TwoFactorService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private static final String PENDING_EMAIL =
            "PENDING_2FA_EMAIL";

    private static final String PENDING_EXPIRY =
            "PENDING_2FA_EXPIRY";

    private static final String PENDING_ATTEMPTS =
            "PENDING_2FA_ATTEMPTS";

    private static final long PENDING_LOGIN_LIFETIME_MS =
            5 * 60 * 1000L;

    private static final int MAX_ATTEMPTS = 5;
    private static final String PENDING_FLOW = "PENDING_2FA_FLOW";
    private final AuthService authService;
    private final AppUserRepository appUserRepository;
    private final TwoFactorService twoFactorService;

    private final HttpSessionSecurityContextRepository contextRepository =
            new HttpSessionSecurityContextRepository();

    public AuthController(
            AuthService authService,
            AppUserRepository appUserRepository,
            TwoFactorService twoFactorService) {

        this.authService = authService;
        this.appUserRepository = appUserRepository;
        this.twoFactorService = twoFactorService;
    }

    @GetMapping("/csrf")
    public CsrfToken getCsrfToken(CsrfToken csrfToken) {
        return csrfToken;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        RegisterResponse response = authService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }


    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        LoginResponse response = authService.login(request);

        // Existing user whose authenticator is already enabled.
        if (response.twoFactorRequired()) {
            SecurityContextHolder.clearContext();

            HttpSession session = httpRequest.getSession(true);

            session.removeAttribute(
                    HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY
            );

            session.setAttribute(PENDING_EMAIL, response.email());
            session.setAttribute(
                    PENDING_EXPIRY,
                    System.currentTimeMillis() + PENDING_LOGIN_LIFETIME_MS
            );
            session.setAttribute(PENDING_ATTEMPTS, 0);
            session.setAttribute(PENDING_FLOW, "LOGIN");

            return ResponseEntity.ok(response);
        }

        // First-time user: require authenticator enrollment before authentication.
        SecurityContextHolder.clearContext();

        HttpSession session = httpRequest.getSession(true);

        session.removeAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY
        );

        session.setAttribute(PENDING_EMAIL, response.email());
        session.setAttribute(
                PENDING_EXPIRY,
                System.currentTimeMillis() + PENDING_LOGIN_LIFETIME_MS
        );
        session.setAttribute(PENDING_ATTEMPTS, 0);
        session.setAttribute(PENDING_FLOW, "ENROLL_2FA");

        return ResponseEntity.ok(
                new LoginResponse(
                        "Password verified. Complete authenticator setup.",
                        response.email(),
                        false,
                        "ENROLL_2FA"
                )
        );
    }


    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verifyTwoFactor(
            @Valid @RequestBody TwoFactorVerifyRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        HttpSession session = httpRequest.getSession(false);

        if (session == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Login session expired. Please log in again."
            );
        }

        Object emailValue = session.getAttribute(PENDING_EMAIL);
        Object expiryValue = session.getAttribute(PENDING_EXPIRY);
        Object attemptsValue = session.getAttribute(PENDING_ATTEMPTS);

        if (!(emailValue instanceof String email)
                || !(expiryValue instanceof Long expiry)
                || !(attemptsValue instanceof Integer attempts)) {

            clearPendingLogin(session);

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No pending verification. Please log in again."
            );
        }

        if (System.currentTimeMillis() > expiry) {
            clearPendingLogin(session);

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Verification expired. Please log in again."
            );
        }

        if (attempts >= MAX_ATTEMPTS) {
            clearPendingLogin(session);

            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Too many attempts. Please log in again."
            );
        }

        boolean valid = twoFactorService.verifyLoginCode(
                email,
                request.code()
        );

        if (!valid) {
            int updatedAttempts = attempts + 1;

            if (updatedAttempts >= MAX_ATTEMPTS) {
                clearPendingLogin(session);

                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Too many invalid codes. Please log in again."
                );
            }

            session.setAttribute(
                    PENDING_ATTEMPTS,
                    updatedAttempts
            );

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid or expired authenticator code"
            );
        }

        clearPendingLogin(session);

        establishAuthenticatedSession(
                email,
                httpRequest,
                httpResponse
        );

        return ResponseEntity.ok(
                new LoginResponse(
                        "Login successful",
                        email,
                        false,
                        "AUTHENTICATED"
                )
        );
    }

    private void establishAuthenticatedSession(
            String email,
            HttpServletRequest request,
            HttpServletResponse response) {

        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid login"
                ));

        // Rotate the session ID after successful authentication.
        HttpSession session = request.getSession(true);
        request.changeSessionId();

        var authentication =
                new UsernamePasswordAuthenticationToken(
                        user.getEmail(),
                        null,
                        List.of(
                                new SimpleGrantedAuthority(
                                        "ROLE_" + user.getRole().name()
                                )
                        )
                );

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        contextRepository.saveContext(
                context,
                request,
                response
        );
    }

    private void clearPendingLogin(HttpSession session) {
        session.removeAttribute(PENDING_EMAIL);
        session.removeAttribute(PENDING_EXPIRY);
        session.removeAttribute(PENDING_ATTEMPTS);
        session.removeAttribute(PENDING_FLOW);
    }
}
