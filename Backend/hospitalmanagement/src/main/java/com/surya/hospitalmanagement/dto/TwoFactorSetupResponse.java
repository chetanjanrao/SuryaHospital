
package com.surya.hospitalmanagement.dto;

public record TwoFactorSetupResponse(
        String secret,
        String qrCodeDataUrl,
        String message
) {
}