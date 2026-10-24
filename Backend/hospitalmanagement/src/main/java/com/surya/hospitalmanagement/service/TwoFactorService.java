package com.surya.hospitalmanagement.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.surya.hospitalmanagement.dto.TwoFactorSetupResponse;
import com.surya.hospitalmanagement.entity.AppUser;
import com.surya.hospitalmanagement.repository.AppUserRepository;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class TwoFactorService {

    private final AppUserRepository appUserRepository;

    private final GoogleAuthenticator googleAuthenticator =
            new GoogleAuthenticator();

    public TwoFactorService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Transactional
    public TwoFactorSetupResponse beginEnrollment(String email) {

        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        if (user.isTwoFactorEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Two-factor authentication is already enabled"
            );
        }

        // Generate a new authenticator secret.
        GoogleAuthenticatorKey key =
                googleAuthenticator.createCredentials();

        // Store it as pending until the user verifies a code.
        user.setPendingTwoFactorSecret(key.getKey());

        appUserRepository.save(user);

        // Build the authenticator-compatible provisioning URI.
        String label = URLEncoder.encode(
                "HospitalManagement:" + user.getEmail(),
                StandardCharsets.UTF_8
        );

        String issuer = URLEncoder.encode(
                "HospitalManagement",
                StandardCharsets.UTF_8
        );

        String otpAuthUri =
                "otpauth://totp/" + label
                        + "?secret=" + key.getKey()
                        + "&issuer=" + issuer
                        + "&algorithm=SHA1&digits=6&period=30";

        // Convert the provisioning URI into a QR code.
        String qrCodeDataUrl = generateQrCode(otpAuthUri);

        return new TwoFactorSetupResponse(
                key.getKey(),
                qrCodeDataUrl,
                "Scan the QR code with your authenticator app, then verify a code."
        );
    }

    private String generateQrCode(String text) {

        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();

            BitMatrix matrix = qrCodeWriter.encode(
                    text,
                    BarcodeFormat.QR_CODE,
                    250,
                    250
            );

            ByteArrayOutputStream outputStream =
                    new ByteArrayOutputStream();

            MatrixToImageWriter.writeToStream(
                    matrix,
                    "PNG",
                    outputStream
            );

            String base64 = Base64.getEncoder().encodeToString(
                    outputStream.toByteArray()
            );

            return "data:image/png;base64," + base64;

        } catch (WriterException | IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to generate authenticator QR code"
            );
        }
    }


    @Transactional
    public String verifyAndEnable(String email, String code) {

        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        if (user.isTwoFactorEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Two-factor authentication is already enabled"
            );
        }

        String pendingSecret = user.getPendingTwoFactorSecret();

        if (pendingSecret == null || pendingSecret.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please complete authenticator setup first"
            );
        }

        int verificationCode;

        try {
            verificationCode = Integer.parseInt(code);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid verification code"
            );
        }

        boolean valid = googleAuthenticator.authorize(
                pendingSecret,
                verificationCode
        );

        if (!valid) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid or expired authenticator code"
            );
        }

        // Activate 2FA only after successful verification.
        user.setTwoFactorSecret(pendingSecret);
        user.setPendingTwoFactorSecret(null);
        user.setTwoFactorEnabled(true);

        appUserRepository.save(user);

        return "Two-factor authentication enabled successfully";
    }


    /// added new for authentiction
    @Transactional(readOnly = true)
    public boolean verifyLoginCode(String email, String code) {

        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid login verification"
                ));

        if (!user.isTwoFactorEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Two-factor authentication is not enabled"
            );
        }

        String secret = user.getTwoFactorSecret();

        if (secret == null || secret.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authenticator is not configured"
            );
        }

        if (code == null || !code.matches("\\d{6}")) {
            return false;
        }

        int verificationCode = Integer.parseInt(code);

        return googleAuthenticator.authorize(
                secret,
                verificationCode
        );
    }
}
