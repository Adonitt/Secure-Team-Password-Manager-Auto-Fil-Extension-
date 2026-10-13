package com.teamvault.security;

import com.teamvault.repositories.SessionTokenRepository;

import jakarta.servlet.*;
import jakarta.servlet.http.*;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Component
public class BearerTokenFilter extends OncePerRequestFilter {
    private final SessionTokenRepository sessions;

    public BearerTokenFilter(SessionTokenRepository sessions) {
        this.sessions = sessions;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ") && header.length() < 100) {
            sessions.findById(TokenHasher.hash(header.substring(7)))
                    .filter(session -> session.getExpiresAt().isAfter(Instant.now()))
                    .ifPresent(
                            session ->
                                    SecurityContextHolder.getContext()
                                            .setAuthentication(
                                                    new UsernamePasswordAuthenticationToken(
                                                            session.getUser().getId().toString(),
                                                            null,
                                                            List.of())));
        }
        chain.doFilter(request, response);
    }
}
