

package com.surya.hospitalmanagement.dto;

public class SecuritySettingDTO {

    private Long id;

    private Boolean twoFactorEnabled;

    public SecuritySettingDTO() {
    }

    public SecuritySettingDTO(Long id, Boolean twoFactorEnabled) {
        this.id = id;
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Boolean getTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(Boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }
}
