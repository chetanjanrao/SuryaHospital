
package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.DashboardDTO;
import com.surya.hospitalmanagement.entity.Appointment;
import com.surya.hospitalmanagement.entity.AppointmentStatus;
import com.surya.hospitalmanagement.entity.BedStatus;
import com.surya.hospitalmanagement.repository.AppointmentRepository;
import com.surya.hospitalmanagement.repository.BedRepository;
import com.surya.hospitalmanagement.repository.DoctorRepository;
import com.surya.hospitalmanagement.repository.PatientRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final BedRepository bedRepository;

    public DashboardService(
            PatientRepository patientRepository,
            DoctorRepository doctorRepository,
            AppointmentRepository appointmentRepository,
            BedRepository bedRepository
    ) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.bedRepository = bedRepository;
    }

    @Transactional(readOnly = true)
    public DashboardDTO getDashboardData() {

        LocalDate today = LocalDate.now();

        // 1. Total patients and doctors
        long totalPatients = patientRepository.count();
        long totalDoctors = doctorRepository.count();

        // 2. Today's appointments
        long appointmentsToday =
                appointmentRepository.countByAppointmentDate(today);

        // 3. Remaining appointments: scheduled or confirmed
        long todayRemainingAppointments =
                appointmentRepository.countByAppointmentDateAndStatusIn(
                        today,
                        List.of(
                                AppointmentStatus.SCHEDULED,
                                AppointmentStatus.CONFIRMED
                        )
                );

        // 4. Bed statistics
        long availableBeds =
                bedRepository.countByStatus(BedStatus.AVAILABLE);

        long occupiedBeds =
                bedRepository.countByStatus(BedStatus.OCCUPIED);

        long totalBeds = bedRepository.count();

        double occupiedBedPercentage = totalBeds == 0
                ? 0.0
                : Math.round(occupiedBeds * 10000.0 / totalBeds) / 100.0;

        // 5. Weekly appointment chart: Monday through Sunday
        LocalDate weekStart = today.with(
                TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)
        );

        LocalDate weekEnd = weekStart.plusDays(6);

        List<Appointment> weeklyRecords =
                appointmentRepository
                        .findByAppointmentDateBetweenOrderByAppointmentDateAscAppointmentTimeAsc(
                                weekStart,
                                weekEnd
                        );

        Map<LocalDate, Long> appointmentsByDate = new HashMap<>();

        for (Appointment appointment : weeklyRecords) {
            LocalDate date = appointment.getAppointmentDate();

            appointmentsByDate.merge(date, 1L, Long::sum);
        }

        String[] dayNames = {
                "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
        };

        List<DashboardDTO.WeeklyAppointmentDTO> weeklyAppointments =
                new ArrayList<>();

        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStart.plusDays(i);

            weeklyAppointments.add(
                    new DashboardDTO.WeeklyAppointmentDTO(
                            dayNames[i],
                            appointmentsByDate.getOrDefault(date, 0L)
                    )
            );
        }

        // 6. Five most recent appointments
        List<Appointment> recentRecords =
                appointmentRepository
                        .findTop5ByOrderByAppointmentDateDescAppointmentTimeDesc();

        DateTimeFormatter timeFormatter =
                DateTimeFormatter.ofPattern("hh:mm a");

        List<DashboardDTO.RecentAppointmentDTO> recentAppointments =
                recentRecords.stream()
                        .map(appointment -> {
                            LocalTime time = appointment.getAppointmentTime();

                            String formattedTime = time == null
                                    ? "--"
                                    : time.format(timeFormatter);

                            return new DashboardDTO.RecentAppointmentDTO(
                                    appointment.getId(),
                                    appointment.getPatient().getName(),
                                    appointment.getDoctor().getName(),
                                    appointment.getDoctor().getSpecialization(),
                                    formattedTime,
                                    appointment.getStatus() == null
                                            ? "UNKNOWN"
                                            : appointment.getStatus().name()
                            );
                        })
                        .toList();

        // 7. Return all dashboard data
        return new DashboardDTO(
                totalPatients,
                totalDoctors,
                appointmentsToday,
                availableBeds,
                occupiedBedPercentage,
                weeklyAppointments,
                appointmentsToday,
                todayRemainingAppointments,
                recentAppointments
        );
    }
}
