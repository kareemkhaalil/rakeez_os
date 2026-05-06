# RAKEEZ Middleware - Mathematical & Kinematic Engine

### 1. S-Curve Acceleration (Jerk Control)
To prevent machine vibration during complex 3D cuts (e.g., Turbines), the Agent MUST implement S-Curve acceleration for feedrate calculations.
- **Equation:** `s(t) = s_0 + v_0*t + 0.5*a_0*t^2 + (1/6)*j*t^3`
- Where `j` is the Jerk (rate of change of acceleration). Max allowable Jerk must not exceed machine frame limits (Parameter: `MAX_JERK_MM_S3`).

### 2. Look-Ahead Buffer & Collision Detection
- The Middleware MUST parse the next 500 lines of G-Code before sending line 1.
- Calculate vectors for each segment. If the angle between vector A and vector B is acute (sharp turn), dynamically reduce the Feedrate (F) to prevent tool breakage.

### 3. NURBS & Spline Tessellation
For complex, undefined curves (Generative Design):
- Input: Spline control points.
- Output: Linear G01 segments.
- **Equation:** `C(u) = Σ N_i,p(u) * P_i`
- Tolerance: Linear approximation must keep Surface Deviation error < 0.01mm.