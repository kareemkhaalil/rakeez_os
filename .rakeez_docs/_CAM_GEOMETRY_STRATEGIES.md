# RAKEEZ Geometry Engine - Machining Strategies

### 1. The Tool Offset Principle (R = Tool_Diameter / 2)
All coordinates provided by the user represent the "Target Object Boundary". The Middleware MUST calculate the tool center-point path.

### 2. POCKETING (الحفر الداخلي / التفريغ)
- **Goal:** Clear material INSIDE the boundary.
- **Math Logic:** Shrink the target boundary polygon INWARD by `R`.
- **Path Generation:** Generate concentric offset polygons (Step-overs) decreasing by `0.4 * Tool_Diameter` until the center is reached.
- **Z-Plunge:** Plunge strictly INSIDE the innermost polygon (Helical Ramp preferred).

### 3. PROFILING (النحت الخارجي / القص)
- **Goal:** Cut the object out of the raw stock.
- **Math Logic:** Expand the target boundary polygon OUTWARD by `R`.
- **Path Generation:** Tool moves along the expanded outer boundary. 
- **Z-Plunge:** Plunge MUST happen in the clearance area OUTSIDE the target boundary, followed by a Lead-in arc to the profile line.

### 4. Safety Validation Check
- `if (Operation == "POCKET" && Tool_Path_Bounds > Target_Bounds)` -> THROW ERROR (Crash detected).