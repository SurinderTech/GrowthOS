// src/components/ui/Hero.tsx
'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Tilt from 'react-parallax-tilt';

interface HeroProps {
  onCTA: () => void;
}

export function Hero({ onCTA }: HeroProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };
  
  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 15,
        stiffness: 100,
        mass: 0.8,
      },
    },
  };
  
  const glowVariants = {
    animate: {
      boxShadow: [
        '0 0 20px rgba(99,102,241,0.3)',
        '0 0 40px rgba(99,102,241,0.6)',
        '0 0 20px rgba(99,102,241,0.3)',
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };
  
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={containerVariants}
      style={{ flex: 1, minWidth: 0 }}
    >
      <motion.div 
        variants={itemVariants}
        whileHover={{ scale: 1.05 }}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 100, padding: "7px 18px", marginBottom: 28 }}
      >
        <motion.div 
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} 
        />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: 2, textTransform: "uppercase" }}>AI Operating System for Growth</span>
      </motion.div>
      
      <motion.h1 
        variants={itemVariants}
        className="hero-title" 
        style={{ fontSize: "clamp(44px,6vw,86px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: -2, marginBottom: 12 }}
      >
        Execution<br />
        <motion.span 
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 5, repeat: Infinity }}
          style={{ background: "linear-gradient(135deg,#818cf8,#c4b5fd,#38bdf8)", backgroundSize: '200% 200%', WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          Becomes
        </motion.span><br />
        Inevitable.
      </motion.h1>
      
      <motion.p 
        variants={itemVariants}
        style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, maxWidth: 500, marginBottom: 36, fontWeight: 300 }}
      >
        GrowthOS combines AI, accountability, deep work systems, habit tracking, and execution analytics into one operating system designed to make progress{" "}
        <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>unavoidable.</span>
      </motion.p>
      
      <motion.div 
        variants={itemVariants}
        style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 44 }}
      >
        <motion.button 
          className="cta-btn" 
          onClick={onCTA}
          whileHover={{ scale: 1.05, y: -3, boxShadow: '0 16px 50px rgba(99,102,241,0.55)' }}
          whileTap={{ scale: 0.95 }}
          animate="animate"
          variants={glowVariants}
        >
          🔥 Start Building Your Future
        </motion.button>
        
        <motion.button 
          className="cta-btn-ghost"
          whileHover={{ scale: 1.05, x: 5, background: 'rgba(255,255,255,0.09)', color: 'white' }}
          whileTap={{ scale: 0.95 }}
        >
          ▶ Watch The System
        </motion.button>
      </motion.div>
      
      <motion.div variants={itemVariants} style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Tilt 
          tiltMaxAngleX={15} 
          tiltMaxAngleY={15} 
          scale={1.05}
          glareEnable={true}
          glareMaxOpacity={0.3}
          glareColor="#6366f1"
        >
          <div style={{ display: "flex" }}>
            {["#6366f1","#f472b6","#34d399","#fbbf24","#60a5fa"].map((c, i) => (
              <motion.div 
                key={i} 
                style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${c}88,${c})`, border: "2px solid #050709", marginLeft: i === 0 ? 0 : -10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}
                whileHover={{ y: -5, scale: 1.1, transition: { type: 'spring', stiffness: 300 } }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                {["S","J","A","M","R"][i]}
              </motion.div>
            ))}
          </div>
        </Tilt>
        <div>
          <motion.div 
            style={{ display: "flex", gap: 2, marginBottom: 3 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 2 }}
          >
            {[1,2,3,4,5].map(i=>(
              <motion.span 
                key={i} 
                style={{ color:"#fbbf24",fontSize:11 }}
                whileHover={{ scale: 1.3, rotate: 10 }}
              >
                ★
              </motion.span>
            ))}
          </motion.div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Trusted by <strong style={{ color: "rgba(255,255,255,0.6)" }}>12,400+</strong> executors worldwide</span>
        </div>
      </motion.div>
    </motion.div>
  );
}