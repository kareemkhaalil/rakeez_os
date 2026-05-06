# RAKEEZ OS - Core Architecture Manifest
## Philosophy: "Decoupled Intelligence, Deterministic Execution"

### 1. System Layers (Strictly Isolated):
- **Layer 1 (Cognitive - AI):** NLP to JSON intent extraction ONLY. NEVER generates raw G-Code directly.
- **Layer 2 (Geometry & Middleware):** Deterministic JavaScript/Python engine. Converts JSON intent to mathematically verified G-Code paths.
- **Layer 3 (Digital Twin):** Real-time Three.js visualization of the calculated paths.
- **Layer 4 (Hardware HAL):** Serial/WebSocket transmission to ESP32 (running FreeRTOS/GRBL).

### 2. State Management:
- Use a unidirectional data flow (e.g., Redux or Zustand).
- `PlannedState` vs `ActualState`: The system must constantly compare the Look-ahead G-Code state with the Telemetry feedback from the ESP32 encoders.