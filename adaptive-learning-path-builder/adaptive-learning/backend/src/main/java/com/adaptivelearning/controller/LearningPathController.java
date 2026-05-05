package com.adaptivelearning.controller;

import com.adaptivelearning.dto.LearningPathDTOs;
import com.adaptivelearning.service.LearningPathService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/learning-paths")
@RequiredArgsConstructor
public class LearningPathController {

    private final LearningPathService learningPathService;

    @PostMapping
    public ResponseEntity<LearningPathDTOs.LearningPathResponse> createLearningPath(
            @RequestBody LearningPathDTOs.LearningPathRequest request) {
        LearningPathDTOs.LearningPathResponse response = learningPathService.save(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LearningPathDTOs.LearningPathResponse> getLearningPath(@PathVariable String id) {
        return learningPathService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<LearningPathDTOs.LearningPathSummary>> getAllLearningPaths() {
        return ResponseEntity.ok(learningPathService.findAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<LearningPathDTOs.LearningPathResponse> updateLearningPath(
            @PathVariable String id,
            @RequestBody LearningPathDTOs.LearningPathRequest request) {
        request.setId(id);
        return ResponseEntity.ok(learningPathService.save(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteLearningPath(@PathVariable String id) {
        if (learningPathService.deleteById(id)) {
            return ResponseEntity.ok(Map.of("message", "Learning path deleted successfully"));
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<LearningPathDTOs.LearningPathResponse> publishLearningPath(
            @PathVariable String id) {
        return learningPathService.findById(id)
            .map(existing -> {
                LearningPathDTOs.LearningPathRequest req = new LearningPathDTOs.LearningPathRequest(
                    existing.getId(), existing.getName(), existing.getDescription(),
                    "published", existing.getVersion() != null ? existing.getVersion() + 1 : 1,
                    existing.getCanvas(), existing.getNodes(), existing.getEdges()
                );
                return ResponseEntity.ok(learningPathService.save(req));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
