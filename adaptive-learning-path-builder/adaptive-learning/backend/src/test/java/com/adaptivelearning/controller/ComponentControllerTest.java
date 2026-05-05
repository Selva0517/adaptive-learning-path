package com.adaptivelearning.controller;

import com.adaptivelearning.dto.LearningPathDTOs;
import com.adaptivelearning.service.ComponentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ComponentController.class)
class ComponentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ComponentService componentService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getComponents_returnsListWithTotalCount() throws Exception {
        LearningPathDTOs.ComponentResponse comp = LearningPathDTOs.ComponentResponse.builder()
            .id("cmp-1")
            .title("Math Assessment")
            .shortDescription("A math diagnostic.")
            .type("assessment")
            .approximateDurationMinutes(30)
            .metadata(LearningPathDTOs.ComponentResponse.MetadataDto.builder()
                .assessment(LearningPathDTOs.ComponentResponse.AssessmentMetaDto.builder()
                    .maxScore(100)
                    .passingScore(50)
                    .build())
                .build())
            .build();

        when(componentService.getAllComponents()).thenReturn(
            new LearningPathDTOs.ComponentListResponse(List.of(comp), 1)
        );

        mockMvc.perform(get("/api/components"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCount").value(1))
            .andExpect(jsonPath("$.items[0].id").value("cmp-1"))
            .andExpect(jsonPath("$.items[0].type").value("assessment"))
            .andExpect(jsonPath("$.items[0].metadata.assessment.maxScore").value(100));
    }

    @Test
    void getComponents_returnsEmptyList_whenNoComponents() throws Exception {
        when(componentService.getAllComponents()).thenReturn(
            new LearningPathDTOs.ComponentListResponse(List.of(), 0)
        );

        mockMvc.perform(get("/api/components"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCount").value(0))
            .andExpect(jsonPath("$.items").isEmpty());
    }
}
