
package com.surya.hospitalmanagement.dto;

public class UserProfileDTO {

    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String jobTitle;

    // No-argument constructor
    public UserProfileDTO() {
    }

    // Parameterized constructor
    public UserProfileDTO(
            Long id,
            String fullName,
            String email,
            String phone,
            String jobTitle
    ) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.jobTitle = jobTitle;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }
}
