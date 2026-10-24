


package com.surya.hospitalmanagement.dto;

import com.surya.hospitalmanagement.entity.UserRole;

import java.time.LocalDateTime;

public record RegisterResponse(
        Long id,
        String fullName,
        String email,
        UserRole role,
        LocalDateTime createdAt
) {
}

