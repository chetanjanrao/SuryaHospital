
package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.AppointmentDTO;
import com.surya.hospitalmanagement.dto.PatientDTO;
import com.surya.hospitalmanagement.dto.DoctorDTO;

import com.surya.hospitalmanagement.entity.Appointment;
import com.surya.hospitalmanagement.entity.Patient;
import com.surya.hospitalmanagement.entity.Doctor;

import com.surya.hospitalmanagement.repository.AppointmentRepository;
import com.surya.hospitalmanagement.repository.PatientRepository;
import com.surya.hospitalmanagement.repository.DoctorRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository) {

        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    // Convert Appointment entity to AppointmentDTO
    private AppointmentDTO convertToDTO(Appointment appointment) {
        AppointmentDTO dto = new AppointmentDTO();

        dto.setId(appointment.getId());
        dto.setAppointmentDate(appointment.getAppointmentDate());
        dto.setAppointmentTime(appointment.getAppointmentTime());
        dto.setReason(appointment.getReason());
        dto.setStatus(appointment.getStatus());

        // Map patient details
        if (appointment.getPatient() != null) {
            Patient patient = appointment.getPatient();
            PatientDTO patientDTO = new PatientDTO();

            patientDTO.setId(patient.getId());
            patientDTO.setName(patient.getName());
            patientDTO.setEmail(patient.getEmail());
            patientDTO.setAge(patient.getAge());
            patientDTO.setGender(patient.getGender());
            patientDTO.setPhone(patient.getPhone());
            patientDTO.setBloodGroup(patient.getBloodGroup());
            patientDTO.setRegisteredOn(patient.getRegisteredOn());

            dto.setPatient(patientDTO);
        }

        // Map doctor details
        if (appointment.getDoctor() != null) {
            Doctor doctor = appointment.getDoctor();
            DoctorDTO doctorDTO = new DoctorDTO();

            doctorDTO.setId(doctor.getId());
            doctorDTO.setName(doctor.getName());
            doctorDTO.setSpecialization(doctor.getSpecialization());
            doctorDTO.setEmail(doctor.getEmail());
            doctorDTO.setPhone(doctor.getPhone());
            doctorDTO.setExperienceYears(doctor.getExperienceYears());
            doctorDTO.setConsultationFee(doctor.getConsultationFee());
            doctorDTO.setAvailable(doctor.getAvailable());

            dto.setDoctor(doctorDTO);
        }

        return dto;
    }

    // Get all appointments
    public List<AppointmentDTO> getAllAppointments() {
        return appointmentRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Get appointment by ID
    public Optional<AppointmentDTO> getAppointmentById(Long id) {
        return appointmentRepository.findById(id)
                .map(this::convertToDTO);
    }

    // Create appointment
    public AppointmentDTO createAppointment(AppointmentDTO dto) {

        if (dto.getPatient() == null
                || dto.getPatient().getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Patient ID is required"
            );
        }

        if (dto.getDoctor() == null
                || dto.getDoctor().getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Doctor ID is required"
            );
        }

        Long patientId = dto.getPatient().getId();
        Long doctorId = dto.getDoctor().getId();

        // Fetch the complete patient
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Patient not found"
                ));

        // Fetch the complete doctor
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Doctor not found"
                ));

        // Build appointment entity from DTO
        Appointment appointment = new Appointment();
        appointment.setAppointmentDate(dto.getAppointmentDate());
        appointment.setAppointmentTime(dto.getAppointmentTime());
        appointment.setReason(dto.getReason());
        appointment.setStatus(dto.getStatus() != null
                ? dto.getStatus()
                : com.surya.hospitalmanagement.entity.AppointmentStatus.SCHEDULED);

        appointment.setPatient(patient);
        appointment.setDoctor(doctor);

        Appointment savedAppointment =
                appointmentRepository.save(appointment);

        return convertToDTO(savedAppointment);
    }

    // Delete appointment
    public void deleteAppointment(Long id) {
        if (!appointmentRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Appointment not found with id: " + id
            );
        }

        appointmentRepository.deleteById(id);
    }
}
