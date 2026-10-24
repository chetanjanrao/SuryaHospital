package com.surya.hospitalmanagement.dto;

import com.surya.hospitalmanagement.entity.BedStatus;

public class BedDTO {

    private Long id;

    private String bedNumber;

    private String department;

    private String ward;

    private String bedType;

    private BedStatus status;

    private Long patientId;

    private String patientName;

    public BedDTO() {
    }

    public BedDTO(
            Long id,
            String bedNumber,
            String department,
            String ward,
            String bedType,
            BedStatus status,
            Long patientId,
            String patientName
    ) {
        this.id = id;
        this.bedNumber = bedNumber;
        this.department = department;
        this.ward = ward;
        this.bedType = bedType;
        this.status = status;
        this.patientId = patientId;
        this.patientName = patientName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBedNumber() {
        return bedNumber;
    }

    public void setBedNumber(String bedNumber) {
        this.bedNumber = bedNumber;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getWard() {
        return ward;
    }

    public void setWard(String ward) {
        this.ward = ward;
    }

    public String getBedType() {
        return bedType;
    }

    public void setBedType(String bedType) {
        this.bedType = bedType;
    }

    public BedStatus getStatus() {
        return status;
    }

    public void setStatus(BedStatus status) {
        this.status = status;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }
}