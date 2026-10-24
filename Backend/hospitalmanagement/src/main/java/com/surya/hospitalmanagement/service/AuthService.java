
package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.RegisterRequest;
import com.surya.hospitalmanagement.dto.RegisterResponse;
import com.surya.hospitalmanagement.entity.AppUser;
import com.surya.hospitalmanagement.entity.UserRole;
import com.surya.hospitalmanagement.repository.AppUserRepository;

import com.surya.hospitalmanagement.dto.LoginRequest;
import com.surya.hospitalmanagement.dto.LoginResponse;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (appUserRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this email already exists"
            );
        }

        String password = request.password();

        // BCrypt supports a maximum of 72 input bytes.
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must not exceed 72 UTF-8 bytes"
            );
        }

        AppUser user = new AppUser();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));

        // Never accept an administrator role from public registration.
        user.setRole(UserRole.USER);
        user.setTwoFactorEnabled(false);

        AppUser savedUser = appUserRepository.save(user);

        return new RegisterResponse(
                savedUser.getId(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getRole(),
                savedUser.getCreatedAt()
        );
    }

   /// Authentication mail

    public LoginResponse login(LoginRequest request) {

        String email = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Invalid email or password"
                        )
                );

        boolean passwordMatches = passwordEncoder.matches(
                request.password(),
                user.getPasswordHash()
        );

        if (!passwordMatches) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        if (user.isTwoFactorEnabled()) {
            return new LoginResponse(
                    "Password verified. Authenticator verification is required.",
                    user.getEmail(),
                    true,
                    "TWO_FACTOR_VERIFICATION"
            );
        }

        return new LoginResponse(
                "Password verified. Complete the authentication session step next.",
                user.getEmail(),
                false,
                "SESSION_CREATION"
        );
    }

}

