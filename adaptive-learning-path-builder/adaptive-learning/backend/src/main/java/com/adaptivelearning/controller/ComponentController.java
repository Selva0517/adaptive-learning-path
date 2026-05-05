package com.adaptivelearning.controller;

import com.adaptivelearning.dto.LearningPathDTOs;
import com.adaptivelearning.service.ComponentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/components")
@RequiredArgsConstructor
public class ComponentController {

    private final ComponentService componentService;

    @GetMapping
    public ResponseEntity<LearningPathDTOs.ComponentListResponse> getComponents() {
        return ResponseEntity.ok(componentService.getAllComponents());
    }
}
