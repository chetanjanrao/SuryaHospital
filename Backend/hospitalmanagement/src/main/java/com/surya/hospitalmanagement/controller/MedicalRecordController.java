package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.MedicalRecordDTO;
import com.surya.hospitalmanagement.service.MedicalRecordService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medical-records")
@CrossOrigin(origins = "http://localhost:5173")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;

    public MedicalRecordController(
            MedicalRecordService medicalRecordService) {
        this.medicalRecordService = medicalRecordService;
    }

    // GET: Fetch all medical records
    @GetMapping
    public ResponseEntity<List<MedicalRecordDTO>> getAllMedicalRecords() {

        List<MedicalRecordDTO> records =
                medicalRecordService.getAllMedicalRecords();

        return ResponseEntity.ok(records);
    }

    // GET: Fetch a medical record by ID
    @GetMapping("/{id}")
    public ResponseEntity<MedicalRecordDTO> getMedicalRecordById(
            @PathVariable Long id) {

        MedicalRecordDTO record =
                medicalRecordService.getMedicalRecordById(id)
                        .orElseThrow(() ->
                                new org.springframework.web.server
                                        .ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Medical record not found"));

        return ResponseEntity.ok(record);
    }

    // POST: Create a medical record
    @PostMapping
    public ResponseEntity<MedicalRecordDTO> createMedicalRecord(
            @RequestBody MedicalRecordDTO dto) {

        MedicalRecordDTO savedRecord =
                medicalRecordService.createMedicalRecord(dto);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedRecord);
    }

    // PUT: Update a medical record
    @PutMapping("/{id}")
    public ResponseEntity<MedicalRecordDTO> updateMedicalRecord(
            @PathVariable Long id,
            @RequestBody MedicalRecordDTO dto) {

        MedicalRecordDTO updatedRecord =
                medicalRecordService.updateMedicalRecord(id, dto);

        return ResponseEntity.ok(updatedRecord);
    }

    // DELETE: Delete a medical record
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedicalRecord(
            @PathVariable Long id) {

        medicalRecordService.deleteMedicalRecord(id);

        return ResponseEntity.noContent().build();
    }
}
