"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Award, Database } from "lucide-react";
import Link from "next/link";
import { auth } from "@/firebaseconfig";
import { onAuthStateChanged, User } from "firebase/auth";

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elements = entry.target.querySelectorAll('.reveal');
          if (entry.isIntersecting) {
            elements.forEach((el) => {
              el.classList.add('active');
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden bg-white"
    >
      {/* Background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-200/40 rounded-full filter blur-3xl opacity-40"></div>
        <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-sky-200/40 rounded-full filter blur-3xl opacity-40"></div>
      </div>

      <div className="container px-6 mx-auto max-w-6xl">
        <div className="text-center">
          <div className="inline-block reveal mb-4 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full border border-blue-300">
            AI Learning Platform
          </div>

          <h1 className="reveal text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-gray-900 text-balance">
            <span className="text-gradient">
              Learn it your way.
            </span>
          </h1>

          <p className="reveal text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Traditional learning doesn't work for everyone. Our AI-powered platform personalizes education to match your student's unique learning style.
          </p>

          <div className="reveal flex flex-col sm:flex-row gap-4 justify-center mt-10">
            {user ? (
              <>
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-base h-12 px-6"
                  asChild
                >
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="text-base h-12 px-6 border-gray-300 text-gray-700 hover:bg-gray-100"
                  asChild
                >
                  <Link href="#how-it-works">How It Works</Link>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-base h-12 px-6"
                  asChild
                >
                  <Link href="/register">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="text-base h-12 px-6 border-gray-300 text-gray-700 hover:bg-gray-100"
                  asChild
                >
                  <Link href="#how-it-works">How It Works</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="reveal mt-16 md:mt-24 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition">
            <div className="rounded-full w-12 h-12 flex items-center justify-center bg-blue-100 mb-4">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Personalized Learning</h3>
            <p className="text-gray-700">AI adapts to your student's unique learning style for maximum engagement</p>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition">
            <div className="rounded-full w-12 h-12 flex items-center justify-center bg-blue-100 mb-4">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Integration with Canvas</h3>
            <p className="text-gray-700">Add your course info to Canvas and Learn-X can take it and use it to personalize learning for your students</p>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition">
            <div className="rounded-full w-12 h-12 flex items-center justify-center bg-blue-100 mb-4">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Cloud Integration</h3>
            <p className="text-gray-700">Access your learning materials anywhere, anytime with cloud storage</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
