
package com.surya.hospitalmanagement.repository;

import com.surya.hospitalmanagement.entity.SecuritySetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SecuritySettingRepository
        extends JpaRepository<SecuritySetting, Long> {

}
