
package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.PatientDTO;
import com.surya.hospitalmanagement.service.PatientService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@CrossOrigin(origins = "http://localhost:5173")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    // Get all patients
    @GetMapping
    public List<PatientDTO> getAllPatients() {
        return patientService.getAllPatients();
    }

    // Create patient
    @PostMapping
    public PatientDTO createPatient(@RequestBody PatientDTO patientDTO) {
        return patientService.savePatient(patientDTO);
    }

    // Update patient
    @PutMapping("/{id}")
    public PatientDTO updatePatient(
            @PathVariable Long id,
            @RequestBody PatientDTO patientDTO) {

        return patientService.updatePatient(id, patientDTO);
    }

    // Delete patient
    @DeleteMapping("/{id}")
    public void deletePatient(@PathVariable Long id) {
        patientService.deletePatient(id);
    }
}
