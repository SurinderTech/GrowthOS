import Hero from "@/components/Hero";
import ScrollSection from "@/components/ScrollSection";
import HowItworks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <ScrollSection />
      <HowItworks/>
      <Footer/>
    </>
  );
}