package com.adaptivelearning.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "learning_paths")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningPath {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(length = 500)
    private String description;

    @Builder.Default
    private String status = "draft";

    @Builder.Default
    private Integer version = 1;

    // Store nodes as JSON string
    @Column(columnDefinition = "TEXT")
    private String nodesJson;

    // Store edges as JSON string
    @Column(columnDefinition = "TEXT")
    private String edgesJson;

    // Canvas state
    private Double canvasZoom;
    private Double canvasOffsetX;
    private Double canvasOffsetY;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
