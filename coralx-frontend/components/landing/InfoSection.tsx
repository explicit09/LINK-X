"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const InfoSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elements = entry.target.querySelectorAll(".reveal");
          if (entry.isIntersecting) {
            elements.forEach((el) => el.classList.add("active"));
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const benefits = [
    "Instant syllabus generation from any Canvas materials",
    "Smart quizzes that adapt to your student's learning pace",
    "Detailed progress tracking and performance insights",
    "Ethical AI that supports learning, not shortcuts",
  ];

  return (
    <div id="how-it-works" ref={sectionRef} className="bg-white py-20">
      <div className="section-inner container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <div className="order-2 lg:order-1">
            <h5 className="reveal text-blue-600 text-sm font-semibold tracking-wide uppercase mb-3">
              How It Works
            </h5>
            <h2 className="reveal text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Your Student's Personalized Learning Journey
            </h2>
            <p className="reveal text-lg text-gray-600 mb-6">
              Learn-X uses advanced AI to transform existing Canvas materials into engaging, personalized learning pathways tailored to each student's style, pace, and goals.
            </p>

            <div className="reveal space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0" />
                  <p className="text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>

            <div className="reveal">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                <Link href="#features">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Visual representation */}
          <div className="order-1 lg:order-2">
            <div className="reveal relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-sky-100 rounded-xl blur-xl opacity-50"></div>
              <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-xl">
                <div className="aspect-[4/3] bg-white flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-white to-gray-50 p-6 flex flex-col">
                    {/* Top card preview */}
                    <div className="bg-gray-100 rounded-lg p-4 mb-4">
                      <div className="h-6 w-2/3 bg-blue-200 rounded mb-3"></div>
                      <div className="h-4 w-full bg-blue-100 rounded mb-2"></div>
                      <div className="h-4 w-5/6 bg-blue-100 rounded mb-2"></div>
                      <div className="h-4 w-4/6 bg-blue-100 rounded"></div>
                    </div>

                    {/* List preview */}
                    <div className="flex-1 bg-gray-100 rounded-lg p-4 flex flex-col">
                      <div className="h-5 w-1/2 bg-blue-200 rounded mb-4"></div>
                      <div className="flex-1 grid grid-cols-1 gap-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-10 bg-blue-50 rounded flex items-center px-3"
                          >
                            <div className="h-4 w-4 bg-blue-400 rounded-full mr-3"></div>
                            <div className="h-4 w-3/4 bg-blue-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-100 rounded-full blur-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoSection;
