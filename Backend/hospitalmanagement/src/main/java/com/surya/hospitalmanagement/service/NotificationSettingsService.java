package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.NotificationSettingsDTO;
import com.surya.hospitalmanagement.entity.NotificationSettings;
import com.surya.hospitalmanagement.repository.NotificationSettingsRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationSettingsService {

    private final NotificationSettingsRepository repository;

    public NotificationSettingsService(
            NotificationSettingsRepository repository) {
        this.repository = repository;
    }

    // Get existing settings or create default settings
    @Transactional
    public NotificationSettingsDTO getSettings() {

        NotificationSettings settings = repository.findAll()
                .stream()
                .findFirst()
                .orElseGet(() -> repository.save(
                        new NotificationSettings()
                ));

        return convertToDTO(settings);
    }

    // Update and save notification settings
    @Transactional
    public NotificationSettingsDTO updateSettings(
            NotificationSettingsDTO dto) {

        NotificationSettings settings = repository.findAll()
                .stream()
                .findFirst()
                .orElseGet(NotificationSettings::new);

        settings.setAppointments(dto.isAppointments());
        settings.setBilling(dto.isBilling());
        settings.setPatientUpdates(dto.isPatientUpdates());
        settings.setSystemAlerts(dto.isSystemAlerts());
        settings.setEmailNotifications(dto.isEmailNotifications());
        settings.setInAppNotifications(dto.isInAppNotifications());

        NotificationSettings savedSettings =
                repository.save(settings);

        return convertToDTO(savedSettings);
    }

    // Convert Entity to DTO
    private NotificationSettingsDTO convertToDTO(
            NotificationSettings settings) {

        return new NotificationSettingsDTO(
                settings.getId(),
                settings.isAppointments(),
                settings.isBilling(),
                settings.isPatientUpdates(),
                settings.isSystemAlerts(),
                settings.isEmailNotifications(),
                settings.isInAppNotifications()
        );
    }
}
