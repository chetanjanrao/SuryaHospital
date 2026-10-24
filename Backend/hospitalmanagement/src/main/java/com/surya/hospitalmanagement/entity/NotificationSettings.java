package com.surya.hospitalmanagement.entity;

//package com.surya.hospitalmanagement.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "notification_settings")
public class NotificationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private boolean appointments = true;

    private boolean billing = true;

    private boolean patientUpdates = false;

    private boolean systemAlerts = true;

    private boolean emailNotifications = true;

    private boolean inAppNotifications = true;

    public NotificationSettings() {
    }

    public Long getId() {
        return id;
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