import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

const tourSteps = [
  {
    title: "Welcome to ContentForge AI! 👋",
    description: "Let's take a quick tour of the main features to help you get started.",
  },
  {
    title: "Article Writer",
    description: "Generate high-quality, SEO-optimized articles powered by AI. Just enter your topic and let our AI do the rest!",
    highlightElement: "[data-tour='article-writer']",
    route: "/article-writer",
  },
  {
    title: "Keyword Research",
    description: "Research keywords, analyze competition, and find opportunities to rank better in search results.",
    highlightElement: "[data-tour='keyword-research']",
    route: "/keyword-research",
  },
  {
    title: "My Articles",
    description: "Access all your generated articles, edit them, and track their performance over time.",
    highlightElement: "[data-tour='my-articles']",
    route: "/my-articles",
  },
  {
    title: "Saved Keywords",
    description: "Save and organize your keywords into lists for easy access and tracking.",
    highlightElement: "[data-tour='saved-lists']",
    route: "/saved-lists",
  },
  {
    title: "Profile Settings",
    description: "Customize your experience, manage notifications, and update your account information.",
    highlightElement: "[data-tour='profile']",
    route: "/profile",
  },
];

interface ProductTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductTour({ open, onOpenChange }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const completeTour = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/user/complete-tour", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to complete tour");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tour Completed!",
        description: "You can always access the tour again from your profile settings.",
      });
    },
  });

  useEffect(() => {
    const step = tourSteps[currentStep];
    if (step?.highlightElement) {
      const element = document.querySelector(step.highlightElement);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-primary", "ring-offset-2");
      }
    }

    return () => {
      const step = tourSteps[currentStep];
      if (step?.highlightElement) {
        const element = document.querySelector(step.highlightElement);
        if (element) {
          element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
        }
      }
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      const nextStep = tourSteps[currentStep + 1];
      if (nextStep.route) {
        setLocation(nextStep.route);
      }
      setCurrentStep(currentStep + 1);
    } else {
      completeTour.mutate();
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    completeTour.mutate();
    onOpenChange(false);
  };

  const step = tourSteps[currentStep];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-6 right-6 w-[350px] max-w-[90vw] translate-y-0 translate-x-0 rounded-lg border bg-background p-6 shadow-lg duration-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{step.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            {step.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex items-center justify-between space-x-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="px-3"
          >
            Skip Tour
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            className="px-3"
          >
            {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}