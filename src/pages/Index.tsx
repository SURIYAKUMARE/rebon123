import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import InteractiveShowcase from "@/components/landing/InteractiveShowcase";
import JourneySection from "@/components/landing/JourneySection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import RenMentorDrawer from "@/components/mentor/RenMentorDrawer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <InteractiveShowcase />
        <JourneySection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
      <RenMentorDrawer />
    </div>
  );
};

export default Index;
