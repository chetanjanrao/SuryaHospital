
package com.surya.hospitalmanagement.dto;

import java.util.List;

public record DashboardDTO(
        long totalPatients,
        long totalDoctors,
        long appointmentsToday,
        long availableBeds,
        double occupiedBedPercentage,
        List<WeeklyAppointmentDTO> weeklyAppointments,
        long todayTotalAppointments,
        long todayRemainingAppointments,
        List<RecentAppointmentDTO> recentAppointments
) {

    public record WeeklyAppointmentDTO(
            String day,
            long appointments
    ) {}

    public record RecentAppointmentDTO(
            Long id,
            String patientName,
            String doctorName,
            String department,
            String time,
            String status
    ) {}
}
