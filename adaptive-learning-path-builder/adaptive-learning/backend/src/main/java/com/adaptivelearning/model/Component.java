package com.adaptivelearning.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "components")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Component {

    @Id
    private String id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 280)
    private String shortDescription;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ComponentType type;

    @Column(nullable = false)
    private Integer approximateDurationMinutes;

    // Assessment metadata (nullable for units)
    private Integer maxScore;
    private Integer passingScore;

    // Unit metadata (nullable for assessments)
    private Integer recommendedMinutes;

    public enum ComponentType {
        unit, assessment
    }
}
