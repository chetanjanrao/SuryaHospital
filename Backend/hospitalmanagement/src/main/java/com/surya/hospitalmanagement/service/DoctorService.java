
package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.DoctorDTO;
import com.surya.hospitalmanagement.entity.Doctor;
import com.surya.hospitalmanagement.repository.DoctorRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;

    public DoctorService(DoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    // Convert Doctor entity to DoctorDTO
    private DoctorDTO convertToDTO(Doctor doctor) {
        DoctorDTO dto = new DoctorDTO();

        dto.setId(doctor.getId());
        dto.setName(doctor.getName());
        dto.setSpecialization(doctor.getSpecialization());
        dto.setEmail(doctor.getEmail());
        dto.setPhone(doctor.getPhone());
        dto.setExperienceYears(doctor.getExperienceYears());
        dto.setConsultationFee(doctor.getConsultationFee());
        dto.setAvailable(doctor.getAvailable());

        return dto;
    }

    // Convert DoctorDTO to Doctor entity
    private Doctor convertToEntity(DoctorDTO dto) {
        Doctor doctor = new Doctor();

        doctor.setName(dto.getName());
        doctor.setSpecialization(dto.getSpecialization());
        doctor.setEmail(dto.getEmail());
        doctor.setPhone(dto.getPhone());
        doctor.setExperienceYears(dto.getExperienceYears());
        doctor.setConsultationFee(dto.getConsultationFee());
        doctor.setAvailable(
                dto.getAvailable() != null ? dto.getAvailable() : true
        );

        return doctor;
    }

    // Get all doctors
    public List<DoctorDTO> getAllDoctors() {
        return doctorRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Get one doctor by ID
    public DoctorDTO getDoctorById(Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Doctor not found with id: " + id
                        ));

        return convertToDTO(doctor);
    }

    // Create a new doctor
    public DoctorDTO createDoctor(DoctorDTO doctorDTO) {
        Doctor doctor = convertToEntity(doctorDTO);

        Doctor savedDoctor = doctorRepository.save(doctor);

        return convertToDTO(savedDoctor);
    }

    // Update an existing doctor
    public DoctorDTO updateDoctor(Long id, DoctorDTO updatedDoctorDTO) {
        Doctor existingDoctor = doctorRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Doctor not found with id: " + id
                        ));

        existingDoctor.setName(updatedDoctorDTO.getName());
        existingDoctor.setSpecialization(
                updatedDoctorDTO.getSpecialization()
        );
        existingDoctor.setEmail(updatedDoctorDTO.getEmail());
        existingDoctor.setPhone(updatedDoctorDTO.getPhone());
        existingDoctor.setExperienceYears(
                updatedDoctorDTO.getExperienceYears()
        );
        existingDoctor.setConsultationFee(
                updatedDoctorDTO.getConsultationFee()
        );
        existingDoctor.setAvailable(
                updatedDoctorDTO.getAvailable()
        );

        Doctor savedDoctor = doctorRepository.save(existingDoctor);

        return convertToDTO(savedDoctor);
    }

    // Delete a doctor
    public void deleteDoctor(Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Doctor not found with id: " + id
                        ));

        doctorRepository.delete(doctor);
    }
}
