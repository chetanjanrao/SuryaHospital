

package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.SecuritySettingDTO;
import com.surya.hospitalmanagement.service.SecuritySettingService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/security-settings")
@CrossOrigin(origins = "http://localhost:5173")
public class SecuritySettingController {

    private final SecuritySettingService securitySettingService;

    public SecuritySettingController(
            SecuritySettingService securitySettingService) {
        this.securitySettingService = securitySettingService;
    }

    // GET: Retrieve security settings
    @GetMapping
    public ResponseEntity<SecuritySettingDTO> getSecuritySetting() {

        SecuritySettingDTO setting =
                securitySettingService.getSecuritySetting();

        return ResponseEntity.ok(setting);
    }

    // PUT: Update two-factor authentication preference
    @PutMapping("/two-factor")
    public ResponseEntity<SecuritySettingDTO> updateTwoFactor(
            @RequestParam boolean enabled) {

        SecuritySettingDTO updatedSetting =
                securitySettingService.updateTwoFactor(enabled);

        return ResponseEntity.ok(updatedSetting);
    }
}
