# RAKEEZ Middleware - Review & Validation Engine

1. **Pre-Flight Check:** Before any G-code reaches the hardware, the Middleware must simulate the entire path in a virtual buffer.
2. **Corner Deceleration Logic:** - Identify arc segments (G02/G03).
   - Apply the formula: `V_max = sqrt(Centripetal_Force * Radius / Mass)`.
   - Override the user's Feedrate if it exceeds V_max to prevent machine jitter.
3. **Zero-Point Verification:** Always verify that the program starts at a safe Z-clearance height (+10mm minimum).