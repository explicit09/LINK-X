
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import InfoSection from "@/components/landing/InfoSection";
import ForStudents from "@/components/landing/ForStudents";
import Cta from "@/components/landing/Cta";
import Footer from "@/components/landing/Footer";
import LandingHeader from "@/components/landing/LandingHeader";
import ForEducators from "@/components/landing/ForEducators"

export default function LandingPage() {
  return (
    <div className="flex flex-col bg-background text-foreground min-h-screen w-full overflow-hidden">
      <LandingHeader />
      <div  className="relative min-h-screen flex items-center justify-center pt-8 overflow-hidden bg-white">
      <Hero />
      </div>
      <Features />
      <InfoSection />
      <ForStudents />
      <ForEducators />
      <Cta />
      <Footer />
    </div>
  );
}
