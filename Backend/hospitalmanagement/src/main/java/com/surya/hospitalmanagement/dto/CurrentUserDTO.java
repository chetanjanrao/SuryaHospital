

package com.surya.hospitalmanagement.dto;

import java.util.List;

public class CurrentUserDTO {

    private String email;
    private boolean authenticated;
    private List<String> authorities;

    public CurrentUserDTO() {
    }

    public CurrentUserDTO(
            String email,
            boolean authenticated,
            List<String> authorities) {
        this.email = email;
        this.authenticated = authenticated;
        this.authorities = authorities;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isAuthenticated() {
        return authenticated;
    }

    public void setAuthenticated(boolean authenticated) {
        this.authenticated = authenticated;
    }

    public List<String> getAuthorities() {
        return authorities;
    }

    public void setAuthorities(List<String> authorities) {
        this.authorities = authorities;
    }
}
