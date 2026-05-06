/**
 * GCodeParser.js
 * Converts raw G-code text back into a plannedPath array for visualization and review.
 */
export class GCodeParser {
  /**
   * Parse G-code text into an array of {x, y, z} points.
   */
  static parse(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const path = [];
    
    // Unified State Tracker
    let state = { x: 500, y: 500, z: 10 };
    
    for (let line of lines) {
      const cleanLine = line.split(';')[0].split('(')[0].trim().toUpperCase();
      if (!cleanLine) continue;

      const isMotion = cleanLine.match(/^(G0|G00|G1|G01|G2|G02|G3|G03)\b/);
      
      if (isMotion) {
        const cmd = isMotion[1];
        const motionType = (cmd === 'G0' || cmd === 'G00') ? 'travel' : 'cut';

        const xMatch = cleanLine.match(/X([-+]?[0-9]*\.?[0-9]+)/);
        const yMatch = cleanLine.match(/Y([-+]?[0-9]*\.?[0-9]+)/);
        const zMatch = cleanLine.match(/Z([-+]?[0-9]*\.?[0-9]+)/);
        const iMatch = cleanLine.match(/I([-+]?[0-9]*\.?[0-9]+)/);
        const jMatch = cleanLine.match(/J([-+]?[0-9]*\.?[0-9]+)/);

        // PERSISTENCE LOGIC: If coordinate is missing, use last known state
        const targetX = xMatch ? parseFloat(xMatch[1]) : state.x;
        const targetY = yMatch ? parseFloat(yMatch[1]) : state.y;
        const targetZ = zMatch ? parseFloat(zMatch[1]) : state.z;

        if (cmd.includes('G2') || cmd.includes('G3')) {
          const iOffset = iMatch ? parseFloat(iMatch[1]) : 0;
          const jOffset = jMatch ? parseFloat(jMatch[1]) : 0;
          const centerX = state.x + iOffset;
          const centerY = state.y + jOffset;
          
          const radius = Math.sqrt(iOffset**2 + jOffset**2);
          const startAngle = Math.atan2(-jOffset, -iOffset);
          const endAngle = Math.atan2(targetY - centerY, targetX - centerX);
          
          let diff = endAngle - startAngle;
          const isCW = cmd.includes('2');
          if (isCW && diff > 0) diff -= 2 * Math.PI;
          if (!isCW && diff < 0) diff += 2 * Math.PI;

          const segments = Math.max(5, Math.ceil(Math.abs(diff) * 12));
          for (let s = 1; s <= segments; s++) {
            const angle = startAngle + (diff * (s / segments));
            path.push({ 
                x: centerX + radius * Math.cos(angle), 
                y: centerY + radius * Math.sin(angle), 
                z: targetZ,
                type: motionType 
            });
          }
        } else {
          path.push({ x: targetX, y: targetY, z: targetZ, type: motionType });
        }
        
        // Update Persistent State
        state = { x: targetX, y: targetY, z: targetZ };
      }
    }
    return path;
  }
}
