package com.adaptivelearning.dto;

import com.adaptivelearning.model.Component;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;
import java.util.Map;

// ==================== Component DTOs ====================

class ComponentMetadataAssessment {
    public Integer maxScore;
    public Integer passingScore;
}

class ComponentMetadataUnit {
    public Integer recommendedMinutes;
}

class ComponentMetadata {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public ComponentMetadataAssessment assessment;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public ComponentMetadataUnit unit;
}

// ==================== Learning Path DTOs ====================

public class LearningPathDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComponentResponse {
        private String id;
        private String title;
        private String shortDescription;
        private String type;
        private Integer approximateDurationMinutes;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private MetadataDto metadata;

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class MetadataDto {
            @JsonInclude(JsonInclude.Include.NON_NULL)
            private AssessmentMetaDto assessment;
            @JsonInclude(JsonInclude.Include.NON_NULL)
            private UnitMetaDto unit;
        }

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class AssessmentMetaDto {
            private Integer maxScore;
            private Integer passingScore;
        }

        @Data
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class UnitMetaDto {
            private Integer recommendedMinutes;
        }

        public static ComponentResponse from(Component c) {
            MetadataDto meta = null;
            if (c.getType() == Component.ComponentType.assessment && c.getMaxScore() != null) {
                meta = MetadataDto.builder()
                    .assessment(AssessmentMetaDto.builder()
                        .maxScore(c.getMaxScore())
                        .passingScore(c.getPassingScore())
                        .build())
                    .build();
            } else if (c.getType() == Component.ComponentType.unit && c.getRecommendedMinutes() != null) {
                meta = MetadataDto.builder()
                    .unit(UnitMetaDto.builder()
                        .recommendedMinutes(c.getRecommendedMinutes())
                        .build())
                    .build();
            }
            return ComponentResponse.builder()
                .id(c.getId())
                .title(c.getTitle())
                .shortDescription(c.getShortDescription())
                .type(c.getType().name())
                .approximateDurationMinutes(c.getApproximateDurationMinutes())
                .metadata(meta)
                .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComponentListResponse {
        private List<ComponentResponse> items;
        private Integer totalCount;
    }

    // ==================== Learning Path Request/Response ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CanvasDto {
        private Double zoom;
        private Double offsetX;
        private Double offsetY;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PositionDto {
        private Double x;
        private Double y;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentConfigDto {
        private Integer maxScore;
        private Integer passingScore;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NodeConfigDto {
        private Integer approximateDurationMinutes;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private AssessmentConfigDto assessment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NodeDto {
        private String id;
        private String componentId;
        private String type;
        private String label;
        private PositionDto position;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private NodeConfigDto config;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConditionRuleDto {
        private String id;
        private String sourceType;
        private String sourceNodeId;
        private String metric;
        private String operator;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private Object value;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private ScoreRangeDto range;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreRangeDto {
        private Integer min;
        private Integer max;
        private Boolean minInclusive;
        private Boolean maxInclusive;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConditionsDto {
        private String operator;
        private List<ConditionRuleDto> rules;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EdgeDto {
        private String id;
        private String sourceNodeId;
        private String targetNodeId;
        private String label;
        private Integer priority;
        private Boolean isDefault;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private ConditionsDto conditions;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearningPathRequest {
        private String id;
        private String name;
        private String description;
        private String status;
        private Integer version;
        private CanvasDto canvas;
        private List<NodeDto> nodes;
        private List<EdgeDto> edges;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearningPathResponse {
        private String id;
        private String name;
        private String description;
        private String status;
        private Integer version;
        private CanvasDto canvas;
        private List<NodeDto> nodes;
        private List<EdgeDto> edges;
        private String createdAt;
        private String updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearningPathSummary {
        private String id;
        private String name;
        private String description;
        private String status;
        private Integer version;
        private String createdAt;
        private String updatedAt;
    }
}
