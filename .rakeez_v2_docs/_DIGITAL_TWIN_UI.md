# RAKEEZ Digital Twin & Telemetry UI
## Tech Stack: React, Three.js (react-three-fiber), TailwindCSS.

### 1. UI Architecture (Industrial Brutalism)
- **Theme:** Obsidian Black (`#0D0D0D`) background, Monospace fonts (e.g., JetBrains Mono).
- **Grid Layout:** No soft shadows, strict 1px or 2px solid borders.

### 2. Core Components
- **The 3D Canvas (Center):** - Render the Machine Bed (Grid Helper).
  - Render Raw Stock (Semi-transparent material).
  - Render the Tool (Cylinder geometry) moving dynamically based on the current G-Code line.
- **AI Intent Terminal (Left Panel):**
  - Stream the AI's internal thought process and JSON extraction live.
- **Telemetry Dashboard (Right Panel):**
  - **Gauges:** Spindle RPM, Feedrate (mm/min), Tool Load (%).
  - **State Changes:** If Middleware detects a Look-ahead error, flash the entire panel RED with the exact line number of the predicted collision.