package com.surya.hospitalmanagement.dto;

public record LoginResponse(
        String message,
        String email,
        boolean twoFactorRequired,
        String nextStep
) {
}

