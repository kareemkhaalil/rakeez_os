# RAKEEZ UI - Command Center Specification
## Design Language: Industrial Brutalism

1. **The Grid System:** Use a strict 12-column grid. No rounded corners (Border-radius: 0).
2. **The 3D Engine:** Use react-three-fiber. The Digital Twin must show:
   - Tool position (Real-time).
   - Ghost path (Calculated path vs Actual path).
3. **Status Indicators:** - GREEN: System Healthy / Safe Path.
   - ORANGE: AI is calculating / Middleware is reviewing.
   - RED: Collision detected / Hardware Override.