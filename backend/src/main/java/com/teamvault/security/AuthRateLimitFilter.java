package com.teamvault.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/** Local demo throttle. A production deployment needs a shared limiter. */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private final ConcurrentHashMap<String, Window> attempts = new ConcurrentHashMap<>();

    private record Window(long started, int count) {}

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if ("POST".equals(request.getMethod())
                && (request.getRequestURI().equals("/auth/login")
                        || request.getRequestURI().equals("/auth/register"))) {
            long now = System.currentTimeMillis();
            if (attempts.size() > 1000)
                attempts.entrySet().removeIf(entry -> now - entry.getValue().started() > 60_000);
            Window window =
                    attempts.compute(
                            request.getRemoteAddr(),
                            (ip, old) ->
                                    old == null || now - old.started() > 60_000
                                            ? new Window(now, 1)
                                            : new Window(old.started(), old.count() + 1));
            if (window.count() > 20) {
                response.setStatus(429);
                response.setHeader("Retry-After", "60");
                response.setContentType("application/json");
                response.getWriter()
                        .write(
                                "{\"detail\":\"Too many sign-in attempts. Try again in a"
                                    + " minute.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
