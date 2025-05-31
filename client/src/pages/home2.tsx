import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronDown, Menu } from "lucide-react";
import wgenLogo from "@/assets/wgen_sqr.png";
import { useState } from "react";

export default function Home2() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen relative">
      {/* Promo Banner */}
      <div className="w-full bg-[#16100d] text-white py-2 px-4 flex justify-center items-center gap-4 fixed top-0 z-50">
        <span style={{ fontFamily: 'Literata-Light' }}>
          Sign up today for 25% off your first month
        </span>
        <span className="underline cursor-pointer" style={{ fontFamily: 'Sora-Bold' }}>
          Learn more
        </span>
      </div>

      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-slate-800 bg-opacity-70"
        style={{
          backgroundImage: 'url("/images/bg1.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          boxShadow: 'inset 0 0 0 2000px rgba(0, 0, 0, 0.3)'
        }}
      />

      {/* Content container */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="fixed w-full py-4" style={{ top: '32px' }}>
          <div className="flex justify-between items-center">
            {/* Desktop Navigation */}
            <div className="hidden md:flex bg-white rounded-lg shadow-lg py-2 px-4 ml-4 items-center gap-4">
              <img src={wgenLogo} alt="Wordgen Logo" className="h-8 w-8" />
              <div className="flex items-center gap-4 font-sora-bold text-lg">
                <Button variant="ghost" className="text-black hover:text-gray-900 flex items-center gap-1">
                  Product
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" className="text-black hover:text-gray-900 flex items-center gap-1">
                  Resources
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" className="text-black hover:text-gray-900">Pricing</Button>
              </div>
            </div>

            <div className="hidden md:flex bg-white rounded-lg shadow-lg py-2 px-4 mr-4 items-center gap-2 font-sora-bold text-lg">
              <Button variant="ghost" className="text-black hover:text-gray-900">
                Contact sales
              </Button>
              <Button variant="ghost" className="text-black hover:text-gray-900">
                Sign in
              </Button>
              <Button variant="ghost" className="text-black hover:text-gray-900">
                View demo
              </Button>
              <Button className="bg-black text-white hover:bg-black/90">
                Start free trial
              </Button>
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden w-full mx-4">
              <div className="flex justify-between items-center w-full bg-white rounded-lg shadow-lg py-2 px-4">
                <img src={wgenLogo} alt="Wordgen Logo" className="h-8 w-8" />
                <Button variant="ghost" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  <Menu className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white mt-2 mx-4 rounded-lg shadow-lg py-4">
              <div className="flex flex-col gap-2">
                <Button variant="ghost" className="text-black hover:text-gray-900 flex items-center justify-between px-4">
                  Product
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" className="text-black hover:text-gray-900 flex items-center justify-between px-4">
                  Resources
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" className="text-black hover:text-gray-900 px-4">
                  Pricing
                </Button>
                <div className="h-px bg-gray-200 my-2" />
                <Button variant="ghost" className="text-black hover:text-gray-900 px-4">
                  Contact sales
                </Button>
                <Button variant="ghost" className="text-black hover:text-gray-900 px-4">
                  Sign in
                </Button>
                <Button variant="ghost" className="text-black hover:text-gray-900 px-4">
                  View demo
                </Button>
                <Button className="bg-black text-white hover:bg-black/90 mx-4">
                  Start free trial
                </Button>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Content */}
        <div className="pl-6 pt-[155px]">
          <div>
            <div className="max-w-[1200px]">
              <h1 
                className="text-[90px] text-white leading-[0.95] tracking-tight"
                style={{ 
                  fontFamily: 'Sora-ExtraBold'
                }}
              >
                The new age<br/>
                of content creation<br/>
                <span className="inline-block ml-[420px]">is AI-first</span>
              </h1>
            </div>
            <div className="w-[800px] h-[3px] bg-white/60 my-8"></div>
            <p className="text-xl text-white/90 mb-8 max-w-[600px]" style={{ fontFamily: 'Literata-Light' }}>
              Wordgen revolutionizes content optimization and search visibility. Our AI-first platform delivers instant SEO analysis, content recommendations, and keyword intelligence—so you get automated content optimization to power your organic growth.
            </p>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 border-white bg-transparent text-white hover:bg-white/10 px-8 py-3 text-base w-[160px]"
                style={{ fontFamily: 'Sora-Bold' }}
              >
                View demo
              </Button>
              <Button 
                variant="default" 
                size="lg" 
                className="bg-black text-white hover:bg-black/90 px-8 py-3 text-base w-[160px]"
                style={{ fontFamily: 'Sora-Bold' }}
              >
                Start free trial
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}