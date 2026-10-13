package com.teamvault.repositories;

import com.teamvault.entities.SessionToken;

import org.springframework.data.jpa.repository.*;

import java.time.Instant;
import java.util.*;

public interface SessionTokenRepository extends JpaRepository<SessionToken, String> {
    void deleteByExpiresAtBefore(Instant now);
}
