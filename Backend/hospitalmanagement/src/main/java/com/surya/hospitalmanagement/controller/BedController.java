package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.BedDTO;
import com.surya.hospitalmanagement.service.BedService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/beds")
@CrossOrigin(origins = "http://localhost:5173")
public class BedController {

    private final BedService bedService;

    public BedController(BedService bedService) {
        this.bedService = bedService;
    }

    @GetMapping
    public ResponseEntity<List<BedDTO>> getAllBeds() {
        return ResponseEntity.ok(bedService.getAllBeds());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BedDTO> getBedById(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(bedService.getBedById(id));
    }

    @PostMapping
    public ResponseEntity<BedDTO> createBed(
            @RequestBody BedDTO dto
    ) {
        BedDTO createdBed = bedService.createBed(dto);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(createdBed);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BedDTO> updateBed(
            @PathVariable Long id,
            @RequestBody BedDTO dto
    ) {
        return ResponseEntity.ok(
                bedService.updateBed(id, dto)
        );
    }

    @PatchMapping("/{id}/release")
    public ResponseEntity<BedDTO> releaseBed(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                bedService.releaseBed(id)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBed(
            @PathVariable Long id
    ) {
        bedService.deleteBed(id);
        return ResponseEntity.noContent().build();
    }
}