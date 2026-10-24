package com.surya.hospitalmanagement.dto;

public class DepartmentDTO {

    private Long id;
    private String name;
    private String code;
    private String head;
    private String location;
    private Integer doctors;
    private Integer beds;
    private String description;
    private String status;

    // Default constructor
    public DepartmentDTO() {
    }

    // Parameterized constructor
    public DepartmentDTO(
            Long id,
            String name,
            String code,
            String head,
            String location,
            Integer doctors,
            Integer beds,
            String description,
            String status
    ) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.head = head;
        this.location = location;
        this.doctors = doctors;
        this.beds = beds;
        this.description = description;
        this.status = status;
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getHead() {
        return head;
    }

    public void setHead(String head) {
        this.head = head;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Integer getDoctors() {
        return doctors;
    }

    public void setDoctors(Integer doctors) {
        this.doctors = doctors;
    }

    public Integer getBeds() {
        return beds;
    }

    public void setBeds(Integer beds) {
        this.beds = beds;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}