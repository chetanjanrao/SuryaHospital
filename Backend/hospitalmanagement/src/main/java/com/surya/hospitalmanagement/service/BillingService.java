
package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.BillingDTO;
import com.surya.hospitalmanagement.dto.PaymentRequestDTO;
import com.surya.hospitalmanagement.entity.Billing;
import com.surya.hospitalmanagement.entity.PaymentStatus;
import com.surya.hospitalmanagement.repository.BillingRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;

@Service
public class BillingService {

    private final BillingRepository billingRepository;

    public BillingService(BillingRepository billingRepository) {
        this.billingRepository = billingRepository;
    }

    // Get all invoices
    public List<BillingDTO> getAllInvoices() {
        return billingRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Get one invoice by database ID
    public BillingDTO getInvoiceById(Long id) {
        Billing billing = billingRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Invoice not found with ID: " + id));

        return convertToDTO(billing);
    }

    // Create a new invoice
    @Transactional
    public BillingDTO createInvoice(BillingDTO dto) {

        validateInvoice(dto);

        Billing billing = new Billing();

        billing.setInvoiceNumber(generateInvoiceNumber());
        billing.setPatientName(dto.getPatientName().trim());
        billing.setPatientId(dto.getPatientId().trim());
        billing.setDepartment(dto.getDepartment().trim());
        billing.setService(dto.getService().trim());
        billing.setInvoiceDate(dto.getInvoiceDate());
        billing.setDueDate(dto.getDueDate());
        billing.setAmount(dto.getAmount());
        billing.setPaidAmount(BigDecimal.ZERO);
        billing.setPaymentMethod("Not paid");
        billing.setStatus(PaymentStatus.PENDING);

        Billing savedBilling = billingRepository.save(billing);

        return convertToDTO(savedBilling);
    }

    // Record a payment against an invoice
    @Transactional
    public BillingDTO recordPayment(Long id, PaymentRequestDTO request) {

        Billing billing = billingRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Invoice not found with ID: " + id));

        BigDecimal paymentAmount = request.getAmount();

        if (paymentAmount == null ||
                paymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Payment amount must be greater than zero");
        }

        if (request.getPaymentMethod() == null ||
                request.getPaymentMethod().isBlank()) {
            throw new IllegalArgumentException(
                    "Payment method is required");
        }

        BigDecimal balance = billing.getAmount()
                .subtract(billing.getPaidAmount());

        if (paymentAmount.compareTo(balance) > 0) {
            throw new IllegalArgumentException(
                    "Payment cannot exceed the remaining balance: " + balance);
        }

        BigDecimal updatedPaidAmount =
                billing.getPaidAmount().add(paymentAmount);

        billing.setPaidAmount(updatedPaidAmount);
        billing.setPaymentMethod(request.getPaymentMethod().trim());

        updatePaymentStatus(billing);

        Billing savedBilling = billingRepository.save(billing);

        return convertToDTO(savedBilling);
    }

    // Update an invoice's payment status
    private void updatePaymentStatus(Billing billing) {

        if (billing.getPaidAmount().compareTo(billing.getAmount()) >= 0) {
            billing.setStatus(PaymentStatus.PAID);
        } else if (billing.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            billing.setStatus(PaymentStatus.PARTIAL);
        } else {
            billing.setStatus(PaymentStatus.PENDING);
        }
    }

    // Validate invoice information
    private void validateInvoice(BillingDTO dto) {

        if (dto == null) {
            throw new IllegalArgumentException(
                    "Invoice details are required");
        }

        if (isBlank(dto.getPatientName()) ||
                isBlank(dto.getPatientId()) ||
                isBlank(dto.getDepartment()) ||
                isBlank(dto.getService())) {
            throw new IllegalArgumentException(
                    "Patient, department, and service details are required");
        }

        if (dto.getAmount() == null ||
                dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Invoice amount must be greater than zero");
        }

        if (dto.getInvoiceDate() == null || dto.getDueDate() == null) {
            throw new IllegalArgumentException(
                    "Invoice date and due date are required");
        }

        if (dto.getDueDate().isBefore(dto.getInvoiceDate())) {
            throw new IllegalArgumentException(
                    "Due date must be on or after invoice date");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    // Generate an invoice number
    private String generateInvoiceNumber() {
        String prefix = "INV-" + Year.now().getValue() + "-";

        for (int attempt = 0; attempt < 5; attempt++) {
            String invoiceNumber = prefix +
                    String.format("%06d",
                            (int) (Math.random() * 1_000_000));

            if (!billingRepository.existsByInvoiceNumber(invoiceNumber)) {
                return invoiceNumber;
            }
        }

        throw new IllegalStateException(
                "Could not generate a unique invoice number. Please try again.");
    }

    // Convert the entity into frontend-friendly DTO data
    private BillingDTO convertToDTO(Billing billing) {

        BillingDTO dto = new BillingDTO();

        dto.setDatabaseId(billing.getId());
        dto.setId(billing.getInvoiceNumber());
        dto.setPatientName(billing.getPatientName());
        dto.setPatientId(billing.getPatientId());
        dto.setDepartment(billing.getDepartment());
        dto.setService(billing.getService());
        dto.setInvoiceDate(billing.getInvoiceDate());
        dto.setDueDate(billing.getDueDate());
        dto.setAmount(billing.getAmount());
        dto.setPaidAmount(billing.getPaidAmount());

        BigDecimal balance = billing.getAmount()
                .subtract(billing.getPaidAmount());

        dto.setBalance(balance);
        dto.setPaymentMethod(billing.getPaymentMethod());

        // Determine whether an unpaid invoice is overdue
        PaymentStatus status = billing.getStatus();

        if (balance.compareTo(BigDecimal.ZERO) > 0 &&
                billing.getDueDate().isBefore(LocalDate.now())) {
            // The current enum has no OVERDUE value.
            // The controller/frontend can derive overdue from dueDate and balance.
            dto.setStatus(status);
        } else {
            dto.setStatus(status);
        }

        return dto;
    }

    @Transactional
    public void deleteInvoice(Long id) {
        Billing billing = billingRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Invoice not found with ID: " + id));

        billingRepository.delete(billing);
    }
}
