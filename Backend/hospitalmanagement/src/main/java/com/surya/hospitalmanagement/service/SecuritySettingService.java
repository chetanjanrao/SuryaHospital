


package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.SecuritySettingDTO;
import com.surya.hospitalmanagement.entity.SecuritySetting;
import com.surya.hospitalmanagement.repository.SecuritySettingRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SecuritySettingService {

    private final SecuritySettingRepository securitySettingRepository;

    public SecuritySettingService(
            SecuritySettingRepository securitySettingRepository) {
        this.securitySettingRepository = securitySettingRepository;
    }

    // Get security settings
    @Transactional
    public SecuritySettingDTO getSecuritySetting() {

        SecuritySetting setting =
                securitySettingRepository.findAll()
                        .stream()
                        .findFirst()
                        .orElseGet(() -> {
                            SecuritySetting newSetting = new SecuritySetting();
                            newSetting.setTwoFactorEnabled(false);
                            return securitySettingRepository.save(newSetting);
                        });

        return convertToDTO(setting);
    }

    // Update two-factor authentication preference
    @Transactional
    public SecuritySettingDTO updateTwoFactor(boolean enabled) {

        SecuritySetting setting =
                securitySettingRepository.findAll()
                        .stream()
                        .findFirst()
                        .orElseGet(SecuritySetting::new);

        setting.setTwoFactorEnabled(enabled);

        SecuritySetting savedSetting =
                securitySettingRepository.save(setting);

        return convertToDTO(savedSetting);
    }

    // Convert Entity to DTO
    private SecuritySettingDTO convertToDTO(SecuritySetting setting) {

        SecuritySettingDTO dto = new SecuritySettingDTO();

        dto.setId(setting.getId());
        dto.setTwoFactorEnabled(setting.getTwoFactorEnabled());

        return dto;
    }
}
