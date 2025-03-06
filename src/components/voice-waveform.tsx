"use client";

import React, { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  isActive: boolean;
}

export default function VoiceWaveform({ isActive }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Animation variables
    const bars = 40; // More bars for more detailed visualization
    const barWidth = canvas.width / bars - 2;
    const barHeights = Array(bars).fill(0);
    
    // Animation function
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update bar heights
      for (let i = 0; i < bars; i++) {
        if (isActive) {
          // Enhanced random height pattern when active
          // Create a more natural wave pattern with higher center bars
          const centerOffset = Math.abs(i - bars / 2) / (bars / 2);
          const centerFactor = 1 - centerOffset * 0.5;
          const targetHeight = Math.random() * canvas.height * 0.8 * centerFactor;
          
          // More responsive transition when active
          barHeights[i] = barHeights[i] + (targetHeight - barHeights[i]) * 0.3;
        } else {
          // Gradually decrease height when inactive with a slight pulse
          const pulse = Math.sin(Date.now() / 1000 * 2) * 5 + 10;
          barHeights[i] = Math.max(pulse, barHeights[i] * 0.95);
        }
        
        // Draw bar with gradient
        const height = barHeights[i];
        const x = i * (barWidth + 2);
        const y = (canvas.height - height) / 2;
        
        // Create gradient for more vivid visualization
        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        if (isActive) {
          gradient.addColorStop(0, "#3b82f6"); // Blue top
          gradient.addColorStop(1, "#60a5fa"); // Lighter blue bottom
        } else {
          gradient.addColorStop(0, "#9ca3af"); // Gray top
          gradient.addColorStop(1, "#d1d5db"); // Lighter gray bottom
        }
        
        ctx.fillStyle = gradient;
        
        // Rounded rectangle
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 2);
        ctx.fill();
      }
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);
  
  return (
    <div className="w-full flex flex-col items-center justify-center">
      {/* Active indicator */}
      {isActive && (
        <div className="text-center mb-2">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
            <span className="mr-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            Listening...
          </span>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className="w-full h-12"
        aria-label="Voice waveform visualization"
      />
    </div>
  );
} 