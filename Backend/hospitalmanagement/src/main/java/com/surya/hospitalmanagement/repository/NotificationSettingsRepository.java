package com.surya.hospitalmanagement.repository;


import com.surya.hospitalmanagement.entity.NotificationSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationSettingsRepository
        extends JpaRepository<NotificationSettings, Long> {
}
