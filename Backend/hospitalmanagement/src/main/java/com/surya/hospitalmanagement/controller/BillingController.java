
package com.surya.hospitalmanagement.controller;

import com.surya.hospitalmanagement.dto.BillingDTO;
import com.surya.hospitalmanagement.dto.PaymentRequestDTO;
import com.surya.hospitalmanagement.service.BillingService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing")
@CrossOrigin(origins = "http://localhost:5173")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    // Get all invoices
    @GetMapping
    public ResponseEntity<List<BillingDTO>> getAllInvoices() {
        return ResponseEntity.ok(
                billingService.getAllInvoices()
        );
    }

    // Get one invoice by database ID
    @GetMapping("/{id}")
    public ResponseEntity<BillingDTO> getInvoiceById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                billingService.getInvoiceById(id)
        );
    }

    // Create a new invoice
    @PostMapping
    public ResponseEntity<BillingDTO> createInvoice(
            @Valid @RequestBody BillingDTO billingDTO) {

        BillingDTO createdInvoice =
                billingService.createInvoice(billingDTO);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(createdInvoice);
    }

    // Record a payment
    @PostMapping("/{id}/payments")
    public ResponseEntity<BillingDTO> recordPayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentRequestDTO paymentRequestDTO) {

        return ResponseEntity.ok(
                billingService.recordPayment(id, paymentRequestDTO)
        );
    }

    // Delete an invoice
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(
            @PathVariable Long id) {

        billingService.deleteInvoice(id);

        return ResponseEntity.noContent().build();
    }
}
