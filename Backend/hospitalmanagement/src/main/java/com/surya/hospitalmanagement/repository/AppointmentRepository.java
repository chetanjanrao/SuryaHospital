
        package com.surya.hospitalmanagement.repository;

import com.surya.hospitalmanagement.entity.Appointment;
import com.surya.hospitalmanagement.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

        @Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

        long countByAppointmentDate(LocalDate today);

                long countByAppointmentDateAndStatusIn(LocalDate today, List<AppointmentStatus> scheduled);

                List<Appointment> findByAppointmentDateBetweenOrderByAppointmentDateAscAppointmentTimeAsc(LocalDate weekStart, LocalDate weekEnd);

                List<Appointment> findTop5ByOrderByAppointmentDateDescAppointmentTimeDesc();
        }
