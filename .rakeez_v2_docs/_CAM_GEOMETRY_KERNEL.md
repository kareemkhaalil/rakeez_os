# RAKEEZ Geometry Kernel - CAM Math & Toolpaths

### 1. Offset Generation (The Core of CAM):
To support ANY shape (not just squares), we must use Polygon Offsetting algorithms (e.g., using libraries like `clipper-lib` or raw math).
- **Profile (Outside Cut):** Expand the polygon points outward by `ToolDiameter / 2`.
- **Pocket (Inside Cut):** Shrink the polygon inward by `ToolDiameter / 2`.

### 2. Step-over and Ramping:
- **Step-over:** Distance between concentric pocketing rings MUST NOT exceed `0.4 * ToolDiameter` to ensure a clean cut.
- **Plunging:** The tool MUST NOT drop straight down (Z-plunge). It must enter the material using a "Helical Ramp" or "Zig-Zag" to avoid breaking the endmill.