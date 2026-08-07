// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ProblemHero,
  NovaLiveSection,
  WhoItsForSection,
  Footer,
} from "@/components";
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // GSAP Scroll Animations (excluding .ph to allow ProblemHero to handle its own opacity/visibility)
    const sections = document.querySelectorAll('section:not(.ph)');

    sections.forEach((section) => {
      gsap.fromTo(section,
        {
          opacity: 0,
          y: 80,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse',
            scrub: false,
          },
        }
      );
    });

    // Animate section tags
    const sectionTags = document.querySelectorAll('.section-tag');
    sectionTags.forEach((tag) => {
      gsap.fromTo(tag,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: tag,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <>
      <ProblemHero onStartTransformation={() => router.push('/signup')} />
      <NovaLiveSection />
      <WhoItsForSection onCTA={() => router.push('/signup')} />
      <Footer onCTA={() => router.push('/signup')} />
    </>
  );
}