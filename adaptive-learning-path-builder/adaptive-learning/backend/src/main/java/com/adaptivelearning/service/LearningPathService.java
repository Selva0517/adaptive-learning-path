package com.adaptivelearning.service;

import com.adaptivelearning.dto.LearningPathDTOs;
import com.adaptivelearning.model.LearningPath;
import com.adaptivelearning.repository.LearningPathRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LearningPathService {

    private final LearningPathRepository learningPathRepository;
    private final ObjectMapper objectMapper;

    public LearningPathDTOs.LearningPathResponse save(LearningPathDTOs.LearningPathRequest request) {
        try {
            String id = (request.getId() != null && !request.getId().isBlank())
                ? request.getId()
                : "lp-" + UUID.randomUUID().toString().substring(0, 8);

            String nodesJson = objectMapper.writeValueAsString(request.getNodes());
            String edgesJson = objectMapper.writeValueAsString(request.getEdges());

            LearningPath.LearningPathBuilder builder = LearningPath.builder()
                .id(id)
                .name(request.getName() != null ? request.getName() : "Untitled Path")
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : "draft")
                .version(request.getVersion() != null ? request.getVersion() : 1)
                .nodesJson(nodesJson)
                .edgesJson(edgesJson);

            if (request.getCanvas() != null) {
                builder.canvasZoom(request.getCanvas().getZoom())
                    .canvasOffsetX(request.getCanvas().getOffsetX())
                    .canvasOffsetY(request.getCanvas().getOffsetY());
            }

            LearningPath saved = learningPathRepository.save(builder.build());
            return toResponse(saved);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize learning path", e);
        }
    }

    public Optional<LearningPathDTOs.LearningPathResponse> findById(String id) {
        return learningPathRepository.findById(id).map(this::toResponse);
    }

    public List<LearningPathDTOs.LearningPathSummary> findAll() {
        return learningPathRepository.findAll().stream()
            .map(lp -> LearningPathDTOs.LearningPathSummary.builder()
                .id(lp.getId())
                .name(lp.getName())
                .description(lp.getDescription())
                .status(lp.getStatus())
                .version(lp.getVersion())
                .createdAt(lp.getCreatedAt() != null ? lp.getCreatedAt().toString() : null)
                .updatedAt(lp.getUpdatedAt() != null ? lp.getUpdatedAt().toString() : null)
                .build())
            .toList();
    }

    public boolean deleteById(String id) {
        if (learningPathRepository.existsById(id)) {
            learningPathRepository.deleteById(id);
            return true;
        }
        return false;
    }

    private LearningPathDTOs.LearningPathResponse toResponse(LearningPath lp) {
        try {
            List<LearningPathDTOs.NodeDto> nodes = lp.getNodesJson() != null
                ? objectMapper.readValue(lp.getNodesJson(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, LearningPathDTOs.NodeDto.class))
                : List.of();

            List<LearningPathDTOs.EdgeDto> edges = lp.getEdgesJson() != null
                ? objectMapper.readValue(lp.getEdgesJson(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, LearningPathDTOs.EdgeDto.class))
                : List.of();

            LearningPathDTOs.CanvasDto canvas = new LearningPathDTOs.CanvasDto(
                lp.getCanvasZoom() != null ? lp.getCanvasZoom() : 1.0,
                lp.getCanvasOffsetX() != null ? lp.getCanvasOffsetX() : 0.0,
                lp.getCanvasOffsetY() != null ? lp.getCanvasOffsetY() : 0.0
            );

            return new LearningPathDTOs.LearningPathResponse(
                lp.getId(), lp.getName(), lp.getDescription(),
                lp.getStatus(), lp.getVersion(), canvas, nodes, edges,
                lp.getCreatedAt() != null ? lp.getCreatedAt().toString() : null,
                lp.getUpdatedAt() != null ? lp.getUpdatedAt().toString() : null
            );
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize learning path", e);
        }
    }
}
