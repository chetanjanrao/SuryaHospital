
package com.surya.hospitalmanagement.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "departments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "surya_department_code",
                        columnNames = "code"
                )
        }
)
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String head;

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private Integer doctors = 0;

    @Column(nullable = false)
    private Integer beds = 0;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String status = "Active";

    public Department() {
    }

    public Department(
            String name,
            String code,
            String head,
            String location,
            Integer doctors,
            Integer beds,
            String description,
            String status
    ) {
        this.name = name;
        this.code = code;
        this.head = head;
        this.location = location;
        this.doctors = doctors;
        this.beds = beds;
        this.description = description;
        this.status = status;
    }

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
