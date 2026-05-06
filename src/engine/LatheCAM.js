/**
 * RAKEEZ OS V3 - LatheCAM Engine
 * Specialized in 4-Axis (XZA) Rotary Turning.
 */
export const LatheCAM = {
    generate: (intent) => {
        const { dimensions, parameters, tool_diameter } = intent;
        const length = dimensions.w || 120;
        const radius = dimensions.radius || 40;
        const header = [
            "; RAKEEZ OS V3 - LATHE_CAM_v1.0",
            "; MODE: 4-AXIS ROTARY TURNING",
            "G21 ; UNITS: MM",
            "G90 ; COORD: ABSOLUTE",
            "M3 S12000 ; SPINDLE START",
            "G0 Z5 X50 ; SAFE START"
        ].join('\n');

        const paths = [];

        // 1. Roughing Passes (Cylindrical Clearing)
        const depth = 2.0; 
        for (let r = radius + 5; r >= radius; r -= depth) {
            for (let z = 0; z <= length; z += 5) {
                const a = (z * 360 / 10) % 360; 
                paths.push({ x: r, y: 0, z: z, a: a, _feed: 'CUT' });
            }
        }

        // 2. Finishing Profile
        for (let z = 0; z <= length; z += 0.5) {
            const profileFactor = Math.sin((z / length) * Math.PI);
            const currentR = radius - (profileFactor * 5);
            const a = (z * 360 / 2) % 360;
            paths.push({ x: currentR, y: 0, z: z, a: a, _feed: 'CUT' });
        }

        return {
            header,
            path: paths
        };
    }
};
