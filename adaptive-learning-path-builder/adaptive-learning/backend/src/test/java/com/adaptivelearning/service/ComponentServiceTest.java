package com.adaptivelearning.service;

import com.adaptivelearning.dto.LearningPathDTOs;
import com.adaptivelearning.model.Component;
import com.adaptivelearning.repository.ComponentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ComponentServiceTest {

    @Autowired
    private ComponentService componentService;

    @Autowired
    private ComponentRepository componentRepository;

    @Test
    void seedComponents_populatesDatabase() {
        // Seeds run on @PostConstruct; we just verify they exist
        LearningPathDTOs.ComponentListResponse result = componentService.getAllComponents();

        assertThat(result.getTotalCount()).isGreaterThan(0);
        assertThat(result.getItems()).isNotEmpty();
    }

    @Test
    void getAllComponents_includesAssessmentWithMetadata() {
        LearningPathDTOs.ComponentListResponse result = componentService.getAllComponents();

        boolean hasAssessmentWithMeta = result.getItems().stream()
            .filter(c -> "assessment".equals(c.getType()))
            .anyMatch(c -> c.getMetadata() != null && c.getMetadata().getAssessment() != null);

        assertThat(hasAssessmentWithMeta).isTrue();
    }

    @Test
    void getAllComponents_includesUnits() {
        LearningPathDTOs.ComponentListResponse result = componentService.getAllComponents();

        boolean hasUnit = result.getItems().stream()
            .anyMatch(c -> "unit".equals(c.getType()));

        assertThat(hasUnit).isTrue();
    }

    @Test
    void componentResponse_from_mapsFieldsCorrectly() {
        Component c = Component.builder()
            .id("test-cmp-1")
            .title("Test Component")
            .shortDescription("Short description.")
            .type(Component.ComponentType.assessment)
            .approximateDurationMinutes(30)
            .maxScore(100)
            .passingScore(60)
            .build();
        componentRepository.save(c);

        LearningPathDTOs.ComponentListResponse result = componentService.getAllComponents();
        var found = result.getItems().stream()
            .filter(i -> "test-cmp-1".equals(i.getId()))
            .findFirst();

        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Test Component");
        assertThat(found.get().getMetadata().getAssessment().getMaxScore()).isEqualTo(100);
        assertThat(found.get().getMetadata().getAssessment().getPassingScore()).isEqualTo(60);
    }
}
