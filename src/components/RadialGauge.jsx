import React from 'react';
import { motion } from 'framer-motion';

/**
 * Modular Radial Gauge - inspired by premium smart-control dials.
 */
export const RadialGauge = ({ 
  value = 0, 
  min = 0, 
  max = 100, 
  label = "Metric", 
  unit = "", 
  color = "#39FF14",
  subtitle = ""
}) => {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - percentage);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Track */}
        <svg 
           width={size} height={size} 
           className="rotate-[-90deg]"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            strokeLinecap="round"
            className="filter drop-shadow-[0_0_8px_var(--color-neon-primary)]"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }}
          />
        </svg>

        {/* Value Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-mono font-bold text-industrial-gray-500 uppercase tracking-widest mb-0.5">
            {label}
          </span>
          <div className="flex items-baseline">
            <span className="text-xl font-bold font-mono tracking-tighter text-industrial-aluminum">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            <span className="text-[8px] font-mono text-industrial-gray-600 font-bold ml-1">
              {unit}
            </span>
          </div>
        </div>
      </div>
      {subtitle && (
        <span className="mt-2 text-[9px] font-mono text-industrial-gray-500 uppercase font-bold tracking-tighter">
          {subtitle}
        </span>
      )}
    </div>
  );
};
