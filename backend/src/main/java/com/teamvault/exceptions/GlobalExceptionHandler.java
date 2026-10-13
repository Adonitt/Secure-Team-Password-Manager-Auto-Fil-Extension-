package com.teamvault.exceptions;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ProblemDetail status(ResponseStatusException e) {
        return ProblemDetail.forStatusAndDetail(
                e.getStatusCode(), e.getReason() == null ? "Request failed" : e.getReason());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail validation(MethodArgumentNotValidException e) {
        var errors = e.getBindingResult().getFieldErrors();
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                errors.isEmpty()
                        ? "Invalid request"
                        : errors.getFirst().getField()
                                + ": "
                                + errors.getFirst().getDefaultMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ProblemDetail invalidJson() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Invalid request fields");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail duplicate() {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, "This record already exists or is still in use");
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ProblemDetail conflict() {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, "Credential changed; refresh before saving");
    }
}
