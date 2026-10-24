
package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.UserProfileDTO;
import com.surya.hospitalmanagement.service.UserProfileService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings/profile")
@CrossOrigin(origins = "http://localhost:5173")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(
            UserProfileService userProfileService
    ) {
        this.userProfileService = userProfileService;
    }

    // GET: Retrieve the administrator profile
    @GetMapping
    public ResponseEntity<UserProfileDTO> getUserProfile() {

        UserProfileDTO profile =
                userProfileService.getUserProfile();

        return ResponseEntity.ok(profile);
    }

    // PUT: Update the administrator profile
    @PutMapping
    public ResponseEntity<UserProfileDTO> updateUserProfile(
            @RequestBody UserProfileDTO updatedProfile
    ) {

        UserProfileDTO profile =
                userProfileService.updateUserProfile(updatedProfile);

        return ResponseEntity.ok(profile);
    }
}
