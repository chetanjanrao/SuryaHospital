package com.surya.hospitalmanagement.dto;

public class NotificationSettingsDTO {

    private Long id;

    private boolean appointments;
    private boolean billing;
    private boolean patientUpdates;
    private boolean systemAlerts;
    private boolean emailNotifications;
    private boolean inAppNotifications;

    // No-argument constructor
    public NotificationSettingsDTO() {
    }

    // Parameterized constructor
    public NotificationSettingsDTO(
            Long id,
            boolean appointments,
            boolean billing,
            boolean patientUpdates,
            boolean systemAlerts,
            boolean emailNotifications,
            boolean inAppNotifications) {

        this.id = id;
        this.appointments = appointments;
        this.billing = billing;
        this.patientUpdates = patientUpdates;
        this.systemAlerts = systemAlerts;
        this.emailNotifications = emailNotifications;
        this.inAppNotifications = inAppNotifications;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public boolean isAppointments() {
        return appointments;
    }

    public void setAppointments(boolean appointments) {
        this.appointments = appointments;
    }

    public boolean isBilling() {
        return billing;
    }

    public void setBilling(boolean billing) {
        this.billing = billing;
    }

    public boolean isPatientUpdates() {
        return patientUpdates;
    }

    public void setPatientUpdates(boolean patientUpdates) {
        this.patientUpdates = patientUpdates;
    }

    public boolean isSystemAlerts() {
        return systemAlerts;
    }

    public void setSystemAlerts(boolean systemAlerts) {
        this.systemAlerts = systemAlerts;
    }

    public boolean isEmailNotifications() {
        return emailNotifications;
    }

    public void setEmailNotifications(boolean emailNotifications) {
        this.emailNotifications = emailNotifications;
    }

    public boolean isInAppNotifications() {
        return inAppNotifications;
    }

    public void setInAppNotifications(boolean inAppNotifications) {
        this.inAppNotifications = inAppNotifications;
    }
}
