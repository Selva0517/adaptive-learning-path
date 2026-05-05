# Adaptive Learning Path Builder

A full-stack web application for creating adaptive learning paths with conditional routing logic. Built with **React + TypeScript** (frontend) and **Java Spring Boot** (backend).

---

## Architecture

```
adaptive-learning/
├── backend/          ← Spring Boot (Java 21, Maven, H2)
│   └── src/
│       ├── main/java/com/adaptivelearning/
│       │   ├── AdaptiveLearningApplication.java  (entry point)
│       │   ├── WebConfig.java                    (CORS)
│       │   ├── controller/                       (REST endpoints)
│       │   ├── service/                          (business logic)
│       │   ├── model/                            (JPA entities)
│       │   ├── repository/                       (Spring Data JPA)
│       │   └── dto/                              (request/response DTOs)
│       └── test/                                 (unit + integration tests)
└── frontend/         ← React 18 + TypeScript + Vite
    └── src/
        ├── App.tsx                               (main application)
        └── main.tsx                              (entry point)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 21+ |
| Maven | 3.8+ |
| Node.js | 18+ |
| npm | 9+ |

---

## Running Locally

### 1. Backend (Spring Boot)

```bash
cd backend
mvn spring-boot:run
```

Backend starts on **http://localhost:8080**

- H2 Console: http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:mem:adaptivedb`)
- The database is seeded automatically with 10 sample components on startup

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on **http://localhost:3000**

The Vite dev server proxies `/api` requests to `http://localhost:8080`.

> **Note:** If the backend is not running, the frontend falls back to built-in demo data and still works for UI demonstration purposes.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/components` | Get all draggable content components |
| `POST` | `/api/learning-paths` | Create a new learning path |
| `GET` | `/api/learning-paths` | List all saved learning paths |
| `GET` | `/api/learning-paths/{id}` | Load a specific learning path |
| `PUT` | `/api/learning-paths/{id}` | Update a learning path |
| `DELETE` | `/api/learning-paths/{id}` | Delete a learning path |
| `POST` | `/api/learning-paths/{id}/publish` | Publish a learning path |

---

## Sample API Calls

**Get components:**
```bash
curl http://localhost:8080/api/components
```

**Save a learning path:**
```bash
curl -X POST http://localhost:8080/api/learning-paths \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SAT Adaptive Path",
    "description": "Routes learners based on performance.",
    "status": "draft",
    "version": 1,
    "canvas": { "zoom": 0.7, "offsetX": 0, "offsetY": 0 },
    "nodes": [
      {
        "id": "node-start",
        "componentId": "system-start",
        "type": "start",
        "label": "Start",
        "position": { "x": 400, "y": 50 }
      },
      {
        "id": "node-math-1",
        "componentId": "cmp-assess-math-1",
        "type": "assessment",
        "label": "Math Module 1",
        "position": { "x": 400, "y": 150 },
        "config": {
          "approximateDurationMinutes": 35,
          "assessment": { "maxScore": 100, "passingScore": 50 }
        }
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "sourceNodeId": "node-start",
        "targetNodeId": "node-math-1",
        "label": "Begin",
        "priority": 1,
        "isDefault": true,
        "conditions": { "operator": "AND", "rules": [] }
      }
    ]
  }'
```

---

## Running Tests

### Backend tests

```bash
cd backend
mvn test
```

Test output is saved to `backend/target/surefire-reports/`.

### What's tested

| Test | Type | Coverage |
|------|------|----------|
| `ComponentControllerTest` | Unit (MockMvc) | GET /api/components responses |
| `LearningPathControllerTest` | Unit (MockMvc) | All CRUD endpoints, 404 handling |
| `LearningPathServiceIntegrationTest` | Integration (H2) | Save, load, update, delete, conditional rules |
| `ComponentServiceTest` | Integration (H2) | Seed data, DTO mapping |

---

## UI Features

| Feature | Implementation |
|---------|---------------|
| Left panel | Loads from API, searchable, filterable by type |
| Canvas | Drag-and-drop with node repositioning |
| Connections | Click the ● handle on a node and drag to another node |
| Conditional logic | Click an edge → Properties panel → Add rules |
| Assessment conditions | score_range (between), score (gte/lte/eq), passed, completion |
| Unit conditions | completion, time_spent_minutes, percentage_completion |
| Zoom & pan | Scroll wheel to zoom, drag canvas to pan |
| Save / Load | Save draft or publish; reload any saved path |
| Properties panel | Edit node labels, duration, score thresholds; edit edge labels and conditions |

---

## Technology Choices

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | React 18 + TypeScript | Type safety, component model, ecosystem |
| Build tool | Vite | Fast HMR, minimal config |
| Backend | Spring Boot 3.2 (Java 21) | Convention-over-config, JPA, testability |
| Database | H2 in-memory | Zero setup, sufficient for assessment scope |
| Persistence | JPA/Hibernate + JSON text columns | Graph topology stored as JSON strings; simple and flexible |
| Testing | JUnit 5, MockMvc, Spring Boot Test | Covers both unit and integration layers |

---

## Assumptions & Tradeoffs

1. **H2 in-memory**: Data resets on restart. For production, swap `application.properties` to a PostgreSQL datasource — no code changes needed.
2. **Nodes/edges as JSON**: Rather than a complex graph schema, nodes and edges are serialized as JSON text columns. This keeps the schema simple while preserving all graph data.
3. **No authentication**: Out of scope for the assessment. Can be added with Spring Security.
4. **Frontend demo mode**: If the backend is unreachable, the app loads mock data so the UI can be evaluated independently.
5. **Canvas is a custom renderer**: No third-party graph library was used — this demonstrates direct DOM manipulation, SVG edges, and state management from scratch.

---

## Time Spent

~8 hours total:
- Backend API + data model: ~2.5 hours
- Frontend canvas + interactions: ~4 hours
- Tests: ~1 hour
- Documentation: ~0.5 hours

