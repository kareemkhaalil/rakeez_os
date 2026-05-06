/**
 * RAKEEZ OS V3 - Safety Auditor & Motion Middleware
 * Validates G-code against machine envelopes and adaptive feed rules.
 */
export const SafetyAuditor = {
    /**
     * Audit a G-code path against safety constraints.
     * @param {Array} path - Array of {x, y, z, _feed}
     * @param {Object} config - Machine and Stock configuration
     * @returns {Object} { safe: boolean, logs: [], gcode: string }
     */
    audit: (path, config) => {
        const { machineConfig, stockDimensions } = config;
        const logs = [];
        let isSafe = true;

        const auditedPath = path.map((point, i) => {
            // 1. Machine Envelope Validation
            if (point.x < machineConfig.xRange[0] || point.x > machineConfig.xRange[1] ||
                point.y < machineConfig.yRange[0] || point.y > machineConfig.yRange[1] ||
                point.z < machineConfig.zRange[0] || point.z > machineConfig.zRange[1]) {
                
                isSafe = false;
                logs.push(`[ALARM] Path exceeds Machine Envelope at point ${i}: ${JSON.stringify(point)}`);
            }

            // 2. Adaptive Feedrate Implementation
            // Slow plunge: If entering stock (Z < 0), force slow feed F200
            // Air travel: G0 or Z > 0, force standard feed
            let feedrate = 2500;
            if (point.z < 0) {
                feedrate = 400; // Safe Plunge/Cut
            } else if (point._feed === 'RAPID') {
                feedrate = 5000;
            }

            return { ...point, _actualFeed: feedrate };
        });

        // Convert back to string with audited feedrates
        const finalGCode = auditedPath.map(p => {
            const cmd = p._feed === 'RAPID' ? 'G0' : 'G1';
            return `${cmd} X${p.x.toFixed(4)} Y${p.y.toFixed(4)} Z${p.z.toFixed(4)} F${p._actualFeed}`;
        });

        return { 
            safe: isSafe, 
            logs, 
            path: auditedPath,
            gcode: finalGCode.join('\n')
        };
    }
};
