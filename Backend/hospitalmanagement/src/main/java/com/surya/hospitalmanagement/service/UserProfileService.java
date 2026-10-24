
package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.UserProfileDTO;
import com.surya.hospitalmanagement.entity.UserProfile;
import com.surya.hospitalmanagement.repository.UserProfileRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;

    public UserProfileService(
            UserProfileRepository userProfileRepository
    ) {
        this.userProfileRepository = userProfileRepository;
    }

    // Get the administrator profile
    public UserProfileDTO getUserProfile() {

        List<UserProfile> profiles = userProfileRepository.findAll();

        UserProfile profile;

        if (!profiles.isEmpty()) {
            profile = profiles.get(0);
        } else {
            // Create a default profile when no profile exists
            profile = new UserProfile(
                    "Hospital Administrator",
                    "admin@surya-hospital.com",
                    "+91 98765 43210",
                    "System Administrator"
            );

            profile = userProfileRepository.save(profile);
        }

        return convertToDTO(profile);
    }

    // Update the administrator profile
    public UserProfileDTO updateUserProfile(
            UserProfileDTO updatedDTO
    ) {

        List<UserProfile> profiles = userProfileRepository.findAll();

        UserProfile profile;

        if (!profiles.isEmpty()) {
            profile = profiles.get(0);
        } else {
            profile = new UserProfile();
        }

        profile.setFullName(updatedDTO.getFullName());
        profile.setEmail(updatedDTO.getEmail());
        profile.setPhone(updatedDTO.getPhone());
        profile.setJobTitle(updatedDTO.getJobTitle());

        UserProfile savedProfile = userProfileRepository.save(profile);

        return convertToDTO(savedProfile);
    }

    // Convert entity into DTO
    private UserProfileDTO convertToDTO(UserProfile profile) {

        return new UserProfileDTO(
                profile.getId(),
                profile.getFullName(),
                profile.getEmail(),
                profile.getPhone(),
                profile.getJobTitle()
        );
    }
}
