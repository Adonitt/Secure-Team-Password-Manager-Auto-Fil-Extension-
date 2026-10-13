package com.teamvault.config;

import com.teamvault.security.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.util.List;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new Pbkdf2PasswordEncoder(
                "",
                16,
                600_000,
                Pbkdf2PasswordEncoder.SecretKeyFactoryAlgorithm.PBKDF2WithHmacSHA256);
    }

    @Bean
    SecurityFilterChain security(
            HttpSecurity http,
            BearerTokenFilter tokenFilter,
            AuthRateLimitFilter limiter,
            @Value("${app.web-origin}") String origin)
            throws Exception {
        var cors = new CorsConfiguration();
        cors.setAllowedOriginPatterns(List.of(origin, "chrome-extension://*"));
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Content-Type", "Authorization"));
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return http.cors(c -> c.configurationSource(source))
                .csrf(
                        c ->
                                c
                                        .disable()) // Bearer tokens are sent explicitly; no
                                                    // authentication cookies.
                .sessionManagement(c -> c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        c ->
                                c.requestMatchers("/auth/login", "/auth/register", "/health")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .exceptionHandling(
                        c ->
                                c.authenticationEntryPoint(
                                        (req, res, error) -> {
                                            res.setStatus(401);
                                            res.setContentType("application/json");
                                            res.getWriter()
                                                    .write("{\"detail\":\"Sign in required\"}");
                                        }))
                .addFilterBefore(tokenFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(limiter, BearerTokenFilter.class)
                .build();
    }

    @Bean
    FilterRegistrationBean<BearerTokenFilter> tokenRegistration(BearerTokenFilter filter) {
        var registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    FilterRegistrationBean<AuthRateLimitFilter> limiterRegistration(AuthRateLimitFilter filter) {
        var registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
