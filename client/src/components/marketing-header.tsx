import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu } from "lucide-react";
import { useState } from "react";
import wordgenLogo from "@/assets/wordgen-logo.png";

export function MarketingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between max-w-7xl">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2 px-4">
            <img src={wordgenLogo} alt="Word Gen.io" className="h-10 w-auto" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="lg:hidden p-2 hover:bg-gray-100 rounded-md"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Desktop navigation */}
        <nav className="hidden lg:flex items-center space-x-6 text-sm font-medium">
          <Link href="/docs" className="transition-colors hover:text-primary">
            Documentation
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-primary">
            Pricing
          </Link>
          <Link href="/auth">
            <Button variant="ghost" className="text-sm">
              Log in
            </Button>
          </Link>
          <Link href="/auth?register=true">
            <Button className="text-sm">
              Get Started
            </Button>
          </Link>
        </nav>
      </div>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="lg:hidden border-t bg-background/95 backdrop-blur">
          <nav className="container py-4 flex flex-col space-y-4">
            <Link href="/docs" className="px-4 py-2 hover:bg-gray-100 rounded-md">
              Documentation
            </Link>
            <Link href="/pricing" className="px-4 py-2 hover:bg-gray-100 rounded-md">
              Pricing
            </Link>
            <div className="flex flex-col space-y-2 px-4">
              <Link href="/auth">
                <Button variant="ghost" className="w-full text-sm">
                  Log in
                </Button>
              </Link>
              <Link href="/auth?register=true">
                <Button className="w-full text-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}