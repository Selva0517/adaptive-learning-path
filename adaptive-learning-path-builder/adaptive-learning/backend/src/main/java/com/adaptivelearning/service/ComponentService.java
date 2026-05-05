package com.adaptivelearning.service;

import com.adaptivelearning.dto.LearningPathDTOs;
import com.adaptivelearning.model.Component;
import com.adaptivelearning.repository.ComponentRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ComponentService {

    private final ComponentRepository componentRepository;

    @PostConstruct
    public void seedComponents() {
        if (componentRepository.count() == 0) {
            List<Component> components = List.of(
                Component.builder()
                    .id("cmp-assess-math-1")
                    .title("Math Module 1 Assessment")
                    .shortDescription("Baseline math diagnostic used to route learners into appropriate difficulty tracks.")
                    .type(Component.ComponentType.assessment)
                    .approximateDurationMinutes(35)
                    .maxScore(100)
                    .passingScore(50)
                    .build(),
                Component.builder()
                    .id("cmp-unit-math-2-easy")
                    .title("Math Module 2 - Easy")
                    .shortDescription("Foundational math remediation unit covering algebra and arithmetic basics.")
                    .type(Component.ComponentType.unit)
                    .approximateDurationMinutes(35)
                    .recommendedMinutes(30)
                    .build(),
                Component.builder()
                    .id("cmp-unit-math-2-advanced")
                    .title("Math Module 2 - Advanced")
                    .shortDescription("Advanced math unit covering geometry, statistics, and complex problem solving.")
                    .type(Component.ComponentType.unit)
                    .approximateDurationMinutes(40)
                    .recommendedMinutes(35)
                    .build(),
                Component.builder()
                    .id("cmp-assess-reading-1")
                    .title("Reading & Comprehension Module 1")
                    .shortDescription("Baseline reading comprehension diagnostic to assess vocabulary and inference skills.")
                    .type(Component.ComponentType.assessment)
                    .approximateDurationMinutes(32)
                    .maxScore(100)
                    .passingScore(50)
                    .build(),
                Component.builder()
                    .id("cmp-unit-reading-2-easy")
                    .title("R&C Module 2 - Easy")
                    .shortDescription("Foundational reading unit with guided passage analysis and vocabulary building.")
                    .type(Component.ComponentType.unit)
                    .approximateDurationMinutes(32)
                    .recommendedMinutes(28)
                    .build(),
                Component.builder()
                    .id("cmp-unit-reading-2-advanced")
                    .title("R&C Module 2 - Advanced")
                    .shortDescription("Advanced reading unit with complex passage analysis and argument evaluation.")
                    .type(Component.ComponentType.unit)
                    .approximateDurationMinutes(32)
                    .recommendedMinutes(28)
                    .build(),
                Component.builder()
                    .id("cmp-assess-writing-1")
                    .title("Writing Skills Assessment")
                    .shortDescription("Evaluates grammar, sentence structure, and essay composition for SAT writing section.")
                    .type(Component.ComponentType.assessment)
                    .approximateDurationMinutes(40)
                    .maxScore(100)
                    .passingScore(60)
                    .build(),
                Component.builder()
                    .id("cmp-unit-writing-remedial")
                    .title("Writing Fundamentals Unit")
                    .shortDescription("Core writing skills covering grammar rules, punctuation, and sentence clarity.")
                    .type(Component.ComponentType.unit)
                    .approximateDurationMinutes(45)
                    .recommendedMinutes(40)
                    .build(),
                Component.builder()
                    .id("cmp-unit-writing-advanced")
                    .title("Advanced Writing Techniques")
                    .shortDescription("Advanced unit covering rhetoric, argumentation, and style for high SAT scores.")
                    .type(Component.ComponentType.unit)
                    .approximateDurationMinutes(45)
                    .recommendedMinutes(40)
                    .build(),
                Component.builder()
                    .id("cmp-assess-vocab-1")
                    .title("Vocabulary & Word Analysis")
                    .shortDescription("Assesses breadth of vocabulary and ability to derive word meaning from context.")
                    .type(Component.ComponentType.assessment)
                    .approximateDurationMinutes(25)
                    .maxScore(80)
                    .passingScore(40)
                    .build()
            );
            componentRepository.saveAll(components);
        }
    }

    public LearningPathDTOs.ComponentListResponse getAllComponents() {
        List<Component> all = componentRepository.findAll();
        List<LearningPathDTOs.ComponentResponse> items = all.stream()
            .map(LearningPathDTOs.ComponentResponse::from)
            .toList();
        return new LearningPathDTOs.ComponentListResponse(items, items.size());
    }
}
