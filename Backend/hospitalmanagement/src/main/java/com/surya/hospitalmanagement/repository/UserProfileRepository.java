
package com.surya.hospitalmanagement.repository;

import com.surya.hospitalmanagement.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserProfileRepository
        extends JpaRepository<UserProfile, Long> {
}
