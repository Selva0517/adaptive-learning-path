package com.adaptivelearning.controller;

import com.adaptivelearning.dto.LearningPathDTOs;
import com.adaptivelearning.service.LearningPathService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LearningPathController.class)
class LearningPathControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LearningPathService learningPathService;

    @Autowired
    private ObjectMapper objectMapper;

    private LearningPathDTOs.LearningPathResponse buildMockResponse() {
        return new LearningPathDTOs.LearningPathResponse(
            "lp-001", "SAT Adaptive Path", "Routes learners based on performance.",
            "draft", 1, new LearningPathDTOs.CanvasDto(0.7, 0.0, 0.0),
            List.of(), List.of(), null, null
        );
    }

    @Test
    void createLearningPath_returns201() throws Exception {
        LearningPathDTOs.LearningPathRequest req = new LearningPathDTOs.LearningPathRequest(
            null, "Test Path", "A test.", "draft", 1,
            new LearningPathDTOs.CanvasDto(1.0, 0.0, 0.0), List.of(), List.of()
        );

        when(learningPathService.save(any())).thenReturn(buildMockResponse());

        mockMvc.perform(post("/api/learning-paths")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("lp-001"))
            .andExpect(jsonPath("$.status").value("draft"));
    }

    @Test
    void getLearningPath_returnsPath_whenExists() throws Exception {
        when(learningPathService.findById("lp-001")).thenReturn(Optional.of(buildMockResponse()));

        mockMvc.perform(get("/api/learning-paths/lp-001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("lp-001"))
            .andExpect(jsonPath("$.name").value("SAT Adaptive Path"));
    }

    @Test
    void getLearningPath_returns404_whenNotFound() throws Exception {
        when(learningPathService.findById("nonexistent")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/learning-paths/nonexistent"))
            .andExpect(status().isNotFound());
    }

    @Test
    void getAllLearningPaths_returnsList() throws Exception {
        when(learningPathService.findAll()).thenReturn(List.of(
            LearningPathDTOs.LearningPathSummary.builder()
                .id("lp-001").name("SAT Adaptive Path").status("draft").version(1).build()
        ));

        mockMvc.perform(get("/api/learning-paths"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("lp-001"));
    }

    @Test
    void deleteLearningPath_returns200_whenExists() throws Exception {
        when(learningPathService.deleteById("lp-001")).thenReturn(true);

        mockMvc.perform(delete("/api/learning-paths/lp-001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Learning path deleted successfully"));
    }

    @Test
    void deleteLearningPath_returns404_whenNotFound() throws Exception {
        when(learningPathService.deleteById("bad-id")).thenReturn(false);

        mockMvc.perform(delete("/api/learning-paths/bad-id"))
            .andExpect(status().isNotFound());
    }
}
