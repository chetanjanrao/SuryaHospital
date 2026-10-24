package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.MedicalRecordDTO;
import com.surya.hospitalmanagement.entity.Doctor;
import com.surya.hospitalmanagement.entity.MedicalRecord;
import com.surya.hospitalmanagement.entity.Patient;
import com.surya.hospitalmanagement.entity.RecordStatus;
import com.surya.hospitalmanagement.repository.DoctorRepository;
import com.surya.hospitalmanagement.repository.MedicalRecordRepository;
import com.surya.hospitalmanagement.repository.PatientRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public MedicalRecordService(
            MedicalRecordRepository medicalRecordRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository) {

        this.medicalRecordRepository = medicalRecordRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    // Convert Entity to DTO
    private MedicalRecordDTO convertToDTO(MedicalRecord record) {

        MedicalRecordDTO dto = new MedicalRecordDTO();

        dto.setId(record.getId());
        dto.setPatientId(record.getPatient().getId());
        dto.setPatientName(record.getPatient().getName());
        dto.setDoctorId(record.getDoctor().getId());
        dto.setDoctorName(record.getDoctor().getName());
        dto.setVisitDate(record.getVisitDate());
        dto.setDiagnosis(record.getDiagnosis());
        dto.setPrescription(record.getPrescription());
        dto.setNotes(record.getNotes());
        dto.setStatus(record.getStatus());

        return dto;
    }

    // Get all medical records
    public List<MedicalRecordDTO> getAllMedicalRecords() {

        return medicalRecordRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Get medical record by ID
    public Optional<MedicalRecordDTO> getMedicalRecordById(Long id) {

        return medicalRecordRepository.findById(id)
                .map(this::convertToDTO);
    }

    // Create a medical record
    public MedicalRecordDTO createMedicalRecord(MedicalRecordDTO dto) {

        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Patient not found"));

        Doctor doctor = doctorRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Doctor not found"));

        MedicalRecord record = new MedicalRecord();

        record.setPatient(patient);
        record.setDoctor(doctor);
        record.setVisitDate(dto.getVisitDate());
        record.setDiagnosis(dto.getDiagnosis());
        record.setPrescription(dto.getPrescription());
        record.setNotes(dto.getNotes());
        record.setStatus(
                dto.getStatus() != null
                        ? dto.getStatus()
                        : RecordStatus.ACTIVE
        );

        MedicalRecord savedRecord =
                medicalRecordRepository.save(record);

        return convertToDTO(savedRecord);
    }

    // Update a medical record
    public MedicalRecordDTO updateMedicalRecord(
            Long id, MedicalRecordDTO dto) {

        MedicalRecord record = medicalRecordRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Medical record not found"));

        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Patient not found"));

        Doctor doctor = doctorRepository.findById(dto.getDoctorId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Doctor not found"));

        record.setPatient(patient);
        record.setDoctor(doctor);
        record.setVisitDate(dto.getVisitDate());
        record.setDiagnosis(dto.getDiagnosis());
        record.setPrescription(dto.getPrescription());
        record.setNotes(dto.getNotes());

        if (dto.getStatus() != null) {
            record.setStatus(dto.getStatus());
        }

        MedicalRecord updatedRecord =
                medicalRecordRepository.save(record);

        return convertToDTO(updatedRecord);
    }

    // Delete a medical record
    public void deleteMedicalRecord(Long id) {

        if (!medicalRecordRepository.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Medical record not found");
        }

        medicalRecordRepository.deleteById(id);
    }
}
