package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.BedDTO;
import com.surya.hospitalmanagement.entity.Bed;
import com.surya.hospitalmanagement.entity.BedStatus;
import com.surya.hospitalmanagement.entity.Patient;
import com.surya.hospitalmanagement.repository.BedRepository;
import com.surya.hospitalmanagement.repository.PatientRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class BedService {

    private final BedRepository bedRepository;
    private final PatientRepository patientRepository;

    public BedService(
            BedRepository bedRepository,
            PatientRepository patientRepository
    ) {
        this.bedRepository = bedRepository;
        this.patientRepository = patientRepository;
    }

    @Transactional(readOnly = true)
    public List<BedDTO> getAllBeds() {
        return bedRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public BedDTO getBedById(Long id) {
        Bed bed = findBed(id);
        return convertToDTO(bed);
    }

    @Transactional
    public BedDTO createBed(BedDTO dto) {
        validateBedNumber(dto.getBedNumber());

        if (bedRepository.existsByBedNumberIgnoreCase(
                dto.getBedNumber().trim())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This bed number already exists."
            );
        }

        Bed bed = new Bed();
        updateBedFromDTO(bed, dto);

        return convertToDTO(bedRepository.save(bed));
    }

    @Transactional
    public BedDTO updateBed(Long id, BedDTO dto) {
        Bed bed = findBed(id);

        validateBedNumber(dto.getBedNumber());

        if (bedRepository.existsByBedNumberIgnoreCaseAndIdNot(
                dto.getBedNumber().trim(), id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This bed number already exists."
            );
        }

        updateBedFromDTO(bed, dto);

        return convertToDTO(bedRepository.save(bed));
    }

    @Transactional
    public BedDTO releaseBed(Long id) {
        Bed bed = findBed(id);

        bed.setStatus(BedStatus.AVAILABLE);
        bed.setPatient(null);

        return convertToDTO(bedRepository.save(bed));
    }

    @Transactional
    public void deleteBed(Long id) {
        Bed bed = findBed(id);
        bedRepository.delete(bed);
    }

    private Bed findBed(Long id) {
        return bedRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Bed not found with ID: " + id
                ));
    }

    private void validateBedNumber(String bedNumber) {
        if (bedNumber == null || bedNumber.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bed number is required."
            );
        }
    }

    private void updateBedFromDTO(Bed bed, BedDTO dto) {
        if (dto.getDepartment() == null ||
                dto.getDepartment().isBlank() ||
                dto.getWard() == null ||
                dto.getWard().isBlank() ||
                dto.getBedType() == null ||
                dto.getBedType().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Department, ward, and bed type are required."
            );
        }

        BedStatus status = dto.getStatus() == null
                ? BedStatus.AVAILABLE
                : dto.getStatus();

        Patient patient = null;

        if (status == BedStatus.OCCUPIED) {
            if (dto.getPatientId() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "A patient ID is required for an occupied bed."
                );
            }

            patient = patientRepository.findById(dto.getPatientId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Patient not found with ID: " + dto.getPatientId()
                    ));
        }

        bed.setBedNumber(dto.getBedNumber().trim());
        bed.setDepartment(dto.getDepartment().trim());
        bed.setWard(dto.getWard().trim());
        bed.setBedType(dto.getBedType().trim());
        bed.setStatus(status);
        bed.setPatient(patient);
    }

    private BedDTO convertToDTO(Bed bed) {
        Patient patient = bed.getPatient();

        return new BedDTO(
                bed.getId(),
                bed.getBedNumber(),
                bed.getDepartment(),
                bed.getWard(),
                bed.getBedType(),
                bed.getStatus(),
                patient != null ? patient.getId() : null,
                patient != null ? patient.getName() : null
        );
    }
}