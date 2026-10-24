
package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.PatientDTO;
import com.surya.hospitalmanagement.entity.Patient;
import com.surya.hospitalmanagement.repository.PatientRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PatientService {

    private final PatientRepository patientRepository;

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    // Convert Patient entity to PatientDTO
    private PatientDTO convertToDTO(Patient patient) {
        PatientDTO dto = new PatientDTO();

        dto.setId(patient.getId());
        dto.setName(patient.getName());
        dto.setEmail(patient.getEmail());
        dto.setAge(patient.getAge());
        dto.setGender(patient.getGender());
        dto.setPhone(patient.getPhone());
        dto.setBloodGroup(patient.getBloodGroup());
        dto.setRegisteredOn(patient.getRegisteredOn());

        return dto;
    }

    // Convert PatientDTO to Patient entity
    private Patient convertToEntity(PatientDTO dto) {
        Patient patient = new Patient();

        patient.setName(dto.getName());
        patient.setEmail(dto.getEmail());
        patient.setAge(dto.getAge());
        patient.setGender(dto.getGender());
        patient.setPhone(dto.getPhone());
        patient.setBloodGroup(dto.getBloodGroup());
        patient.setRegisteredOn(dto.getRegisteredOn());

        return patient;
    }

    // Get all patients
    public List<PatientDTO> getAllPatients() {
        return patientRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Create patient
    public PatientDTO savePatient(PatientDTO patientDTO) {
        Patient patient = convertToEntity(patientDTO);

        Patient savedPatient = patientRepository.save(patient);

        return convertToDTO(savedPatient);
    }

    // Update existing patient
    public PatientDTO updatePatient(Long id, PatientDTO updatedPatientDTO) {

        Patient existingPatient = patientRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: " + id
                        ));

        existingPatient.setName(updatedPatientDTO.getName());
        existingPatient.setEmail(updatedPatientDTO.getEmail());
        existingPatient.setAge(updatedPatientDTO.getAge());
        existingPatient.setGender(updatedPatientDTO.getGender());
        existingPatient.setPhone(updatedPatientDTO.getPhone());
        existingPatient.setBloodGroup(updatedPatientDTO.getBloodGroup());
        existingPatient.setRegisteredOn(updatedPatientDTO.getRegisteredOn());

        Patient savedPatient = patientRepository.save(existingPatient);

        return convertToDTO(savedPatient);
    }

    // Delete patient
    public void deletePatient(Long id) {

        if (!patientRepository.existsById(id)) {
            throw new RuntimeException(
                    "Patient not found with id: " + id
            );
        }

        patientRepository.deleteById(id);
    }
}
