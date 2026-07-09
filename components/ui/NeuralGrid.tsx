// src/components/ui/NeuralGrid.tsx
'use client';

import { useEffect, useRef } from 'react';

export function NeuralGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let particles: Array<{x: number; y: number; vx: number; vy: number; size: number}> = [];
    let mouseX = 0;
    let mouseY = 0;
    let isMouseMoving = false;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };
    
    const initParticles = () => {
      // Responsive particle count - optimized for performance
      const particleCount = Math.min(150, Math.floor(window.innerWidth * window.innerHeight / 18000));
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.3,
          size: 1.5 + Math.random() * 2.5,
        });
      }
    };
    
    // Mouse interaction for particle attraction
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMouseMoving = true;
      setTimeout(() => { isMouseMoving = false; }, 100);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update particle positions with mouse attraction
      particles.forEach(p => {
        if (isMouseMoving) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const angle = Math.atan2(dy, dx);
            const force = (200 - dist) / 2000;
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
          }
        }
        
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < -100) p.x = canvas.width + 100;
        if (p.x > canvas.width + 100) p.x = -100;
        if (p.y < -100) p.y = canvas.height + 100;
        if (p.y > canvas.height + 100) p.y = -100;
      });
      
      // Draw connections (neural network lines)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 200) {
            const opacity = (1 - dist / 200) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      
      // Draw particles with glow effect
      particles.forEach(p => {
        // Outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, 0.15)`;
        ctx.fill();
        
        // Main particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${0.4 + Math.sin(Date.now() * 0.002 * p.size) * 0.1})`;
        ctx.fill();
        
        // Core highlight
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, 0.8)`;
        ctx.fill();
      });
      
      animationId = requestAnimationFrame(draw);
    };
    
    resize();
    window.addEventListener('resize', resize);
    draw();
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <>
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 0,
          pointerEvents: 'auto'
        }} 
      />
      {/* Dark gradient overlay for better text readability */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: 1,
        background: 'radial-gradient(circle at center, rgba(5,7,13,0.2) 0%, rgba(5,7,13,0.85) 100%)',
        pointerEvents: 'none'
      }} />
    </>
  );
}