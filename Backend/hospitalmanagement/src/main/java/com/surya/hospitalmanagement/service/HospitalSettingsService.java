
package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.HospitalSettingsDTO;
import com.surya.hospitalmanagement.entity.HospitalSettings;
import com.surya.hospitalmanagement.repository.HospitalSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class HospitalSettingsService {

    private final HospitalSettingsRepository hospitalSettingsRepository;

    public HospitalSettingsService(
            HospitalSettingsRepository hospitalSettingsRepository) {
        this.hospitalSettingsRepository = hospitalSettingsRepository;
    }

    // GET hospital settings
    public HospitalSettingsDTO getHospitalSettings() {

        List<HospitalSettings> settingsList =
                hospitalSettingsRepository.findAll();

        HospitalSettings settings;

        if (!settingsList.isEmpty()) {
            settings = settingsList.get(0);
        } else {
            settings = new HospitalSettings(
                    "Surya Multispeciality Hospital",
                    "HOSP-2026-001",
                    "contact@surya-hospital.com",
                    "+91 98765 43210",
                    "123 Healthcare Avenue",
                    "Pune",
                    "Maharashtra",
                    "411001"
            );

            settings = hospitalSettingsRepository.save(settings);
        }

        return convertToDTO(settings);
    }

    // UPDATE hospital settings
    public HospitalSettingsDTO updateHospitalSettings(
            HospitalSettingsDTO updatedDTO) {

        List<HospitalSettings> settingsList =
                hospitalSettingsRepository.findAll();

        HospitalSettings settings;

        if (!settingsList.isEmpty()) {
            settings = settingsList.get(0);
        } else {
            settings = new HospitalSettings();
        }

        settings.setHospitalName(updatedDTO.getHospitalName());
        settings.setRegistrationNumber(
                updatedDTO.getRegistrationNumber());
        settings.setEmail(updatedDTO.getEmail());
        settings.setPhone(updatedDTO.getPhone());
        settings.setAddress(updatedDTO.getAddress());
        settings.setCity(updatedDTO.getCity());
        settings.setState(updatedDTO.getState());
        settings.setPostalCode(updatedDTO.getPostalCode());

        HospitalSettings savedSettings =
                hospitalSettingsRepository.save(settings);

        return convertToDTO(savedSettings);
    }

    // Entity to DTO conversion
    private HospitalSettingsDTO convertToDTO(
            HospitalSettings settings) {

        return new HospitalSettingsDTO(
                settings.getId(),
                settings.getHospitalName(),
                settings.getRegistrationNumber(),
                settings.getEmail(),
                settings.getPhone(),
                settings.getAddress(),
                settings.getCity(),
                settings.getState(),
                settings.getPostalCode()
        );
    }
}
