
package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.HospitalSettingsDTO;
import com.surya.hospitalmanagement.service.HospitalSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings/hospital")
@CrossOrigin(origins = "http://localhost:5173")
public class HospitalSettingsController {

    private final HospitalSettingsService hospitalSettingsService;

    public HospitalSettingsController(
            HospitalSettingsService hospitalSettingsService) {
        this.hospitalSettingsService = hospitalSettingsService;
    }

    // GET: Retrieve hospital settings
    @GetMapping
    public ResponseEntity<HospitalSettingsDTO> getHospitalSettings() {

        HospitalSettingsDTO settings =
                hospitalSettingsService.getHospitalSettings();

        return ResponseEntity.ok(settings);
    }

    // PUT: Update hospital settings
    @PutMapping
    public ResponseEntity<HospitalSettingsDTO> updateHospitalSettings(
            @RequestBody HospitalSettingsDTO updatedSettings) {

        HospitalSettingsDTO settings =
                hospitalSettingsService.updateHospitalSettings(
                        updatedSettings);

        return ResponseEntity.ok(settings);
    }
}
