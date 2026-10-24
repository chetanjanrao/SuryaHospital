
package com.surya.hospitalmanagement.repository;

import com.surya.hospitalmanagement.entity.HospitalSettings;
import org.hibernate.internal.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HospitalSettingsRepository
        extends JpaRepository<HospitalSettings, Long> {

}
