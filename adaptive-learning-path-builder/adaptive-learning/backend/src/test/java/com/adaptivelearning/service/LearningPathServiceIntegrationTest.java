package com.adaptivelearning.service;

import com.adaptivelearning.dto.LearningPathDTOs;
import com.adaptivelearning.model.LearningPath;
import com.adaptivelearning.repository.LearningPathRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class LearningPathServiceIntegrationTest {

    @Autowired
    private LearningPathService learningPathService;

    @Autowired
    private LearningPathRepository repository;

    private LearningPathDTOs.LearningPathRequest buildRequest(String name) {
        LearningPathDTOs.NodeDto startNode = new LearningPathDTOs.NodeDto(
            "node-start", "system-start", "start", "Start",
            new LearningPathDTOs.PositionDto(400.0, 50.0), null
        );
        LearningPathDTOs.NodeDto mathNode = new LearningPathDTOs.NodeDto(
            "node-math-1", "cmp-assess-math-1", "assessment", "Math Module 1",
            new LearningPathDTOs.PositionDto(400.0, 150.0),
            new LearningPathDTOs.NodeConfigDto(35, new LearningPathDTOs.AssessmentConfigDto(100, 50))
        );

        LearningPathDTOs.ConditionRuleDto rule = new LearningPathDTOs.ConditionRuleDto(
            "rule-1", "assessment", "node-math-1", "score_range", "between",
            null, new LearningPathDTOs.ScoreRangeDto(0, 49, true, true)
        );
        LearningPathDTOs.EdgeDto edge = new LearningPathDTOs.EdgeDto(
            "edge-1", "node-start", "node-math-1", "Start assessment",
            1, true, new LearningPathDTOs.ConditionsDto("AND", List.of(rule))
        );

        return new LearningPathDTOs.LearningPathRequest(
            null, name, "Test description", "draft", 1,
            new LearningPathDTOs.CanvasDto(0.7, 0.0, 0.0),
            List.of(startNode, mathNode), List.of(edge)
        );
    }

    @Test
    void save_persistsLearningPath_withNodesAndEdges() {
        LearningPathDTOs.LearningPathResponse saved = learningPathService.save(buildRequest("SAT Test Path"));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("SAT Test Path");
        assertThat(saved.getStatus()).isEqualTo("draft");
        assertThat(saved.getNodes()).hasSize(2);
        assertThat(saved.getEdges()).hasSize(1);
        assertThat(saved.getEdges().get(0).getConditions().getRules()).hasSize(1);
    }

    @Test
    void findById_returnsPersistedPath() {
        LearningPathDTOs.LearningPathResponse saved = learningPathService.save(buildRequest("Reload Test"));

        Optional<LearningPathDTOs.LearningPathResponse> found = learningPathService.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Reload Test");
        assertThat(found.get().getNodes()).hasSize(2);
        assertThat(found.get().getEdges().get(0).getConditions().getRules().get(0).getMetric()).isEqualTo("score_range");
    }

    @Test
    void findById_returnsEmpty_whenNotFound() {
        Optional<LearningPathDTOs.LearningPathResponse> found = learningPathService.findById("nonexistent-id");
        assertThat(found).isEmpty();
    }

    @Test
    void findAll_returnsAllPaths() {
        learningPathService.save(buildRequest("Path 1"));
        learningPathService.save(buildRequest("Path 2"));

        List<LearningPathDTOs.LearningPathSummary> all = learningPathService.findAll();
        assertThat(all.size()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void deleteById_removesPath() {
        LearningPathDTOs.LearningPathResponse saved = learningPathService.save(buildRequest("Delete Me"));
        String id = saved.getId();

        boolean deleted = learningPathService.deleteById(id);

        assertThat(deleted).isTrue();
        assertThat(learningPathService.findById(id)).isEmpty();
    }

    @Test
    void save_withExistingId_updatesPath() {
        LearningPathDTOs.LearningPathResponse saved = learningPathService.save(buildRequest("Original Name"));

        LearningPathDTOs.LearningPathRequest updateReq = buildRequest("Updated Name");
        updateReq.setId(saved.getId());
        LearningPathDTOs.LearningPathResponse updated = learningPathService.save(updateReq);

        assertThat(updated.getId()).isEqualTo(saved.getId());
        assertThat(updated.getName()).isEqualTo("Updated Name");
    }
}
