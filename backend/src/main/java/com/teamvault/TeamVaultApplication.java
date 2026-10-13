package com.teamvault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(
        excludeName =
                "org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration")
public class TeamVaultApplication {
    public static void main(String[] args) {
        SpringApplication.run(TeamVaultApplication.class, args);
    }
}
