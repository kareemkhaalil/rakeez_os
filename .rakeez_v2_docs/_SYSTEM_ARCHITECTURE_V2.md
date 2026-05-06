# RAKEEZ OS V2 - Core Architecture Manifest
## Philosophy: "Cognitive Vision, Deterministic Execution"

### 1. The Pipeline (Strict Order):
1.  **Input Layer:** User provides Text, PDF Spec Sheet, or Image (Blueprint/Sketch).
2.  **Cognitive Layer (Local AI):** Ollama running locally (e.g., Llama 3 for text, LLaVA for vision) on `http://localhost:11434`. It parses the input and outputs STRICT JSON. NO G-CODE GENERATION BY AI.
3.  **Geometry Layer (The CAM Kernel):** A custom JS/TS mathematical engine. It reads the JSON, generates 2D/3D splines, calculates Tool Offsets, and creates the Point Cloud.
4.  **Middleware (The Safety Inspector):** Validates the Point Cloud against Machine Limits, calculates Feedrates based on curvature (Kinematics), and outputs the final G-Code.
5.  **Digital Twin (The UI):** React-Three-Fiber & CSG engine rendering the exact physical output in an "Industrial Brutalism" interface.