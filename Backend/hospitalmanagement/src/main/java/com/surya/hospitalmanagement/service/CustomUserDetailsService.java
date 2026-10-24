


package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.entity.AppUser;
import com.surya.hospitalmanagement.repository.AppUserRepository;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    public CustomUserDetailsService(
            AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        String normalizedEmail = email.trim()
                .toLowerCase(Locale.ROOT);

        AppUser appUser = appUserRepository
                .findByEmail(normalizedEmail)
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "Invalid email or password"
                        )
                );

        return new User(
                appUser.getEmail(),
                appUser.getPasswordHash(),
                List.of(
                        new SimpleGrantedAuthority(
                                "ROLE_" + appUser.getRole().name()
                        )
                )
        );
    }
}
