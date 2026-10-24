package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.NotificationSettingsDTO;
import com.surya.hospitalmanagement.service.NotificationSettingsService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/notifications")
@CrossOrigin(origins = "http://localhost:5173")
public class NotificationSettingsController {

    private final NotificationSettingsService service;

    public NotificationSettingsController(
            NotificationSettingsService service) {
        this.service = service;
    }

    // GET: Retrieve notification settings
    @GetMapping
    public ResponseEntity<NotificationSettingsDTO> getSettings() {
        NotificationSettingsDTO settings = service.getSettings();
        return ResponseEntity.ok(settings);
    }

    // PUT: Update notification settings
    @PutMapping
    public ResponseEntity<NotificationSettingsDTO> updateSettings(
            @RequestBody NotificationSettingsDTO dto) {

        NotificationSettingsDTO updatedSettings =
                service.updateSettings(dto);

        return ResponseEntity.ok(updatedSettings);
    }
}
