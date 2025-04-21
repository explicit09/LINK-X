"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from 'next/link';
import { auth } from "@/firebaseconfig";
import { onAuthStateChanged, User } from "firebase/auth";

const Cta = () => {
  const ctaRef = useRef<HTMLDivElement>(null);
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

    if (ctaRef.current) {
      observer.observe(ctaRef.current);
    }

    return () => {
      if (ctaRef.current) {
        observer.unobserve(ctaRef.current);
      }
    };
  }, []);

  return (
    <div id="pricing" ref={ctaRef} className="section bg-blue-50/60">
      <div className="section-inner max-w-4xl">
        <div className="relative p-8 md:p-12 rounded-2xl overflow-hidden border border-blue-200 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-sky-100 opacity-90"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTAwIDEwMFYwaC0xMDBsMTAwIDEwMHptLTEwMC0xMDBMMCA1MHYyNWw1MC01MEg3NUwwIDEwMGgxMDBWNzVMMjUgMTAwaDI1TDEwMCAyMFYwTDUwIDUweiIgZmlsbD0icmdiYSgwLDAsMCwwLjA0KSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-20 mix-blend-overlay"></div>

          <div className="relative text-center">
            <h2 className="reveal text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to transform your student's education?
            </h2>
            <p className="reveal text-lg text-blue-800 mb-8 max-w-2xl mx-auto">
              Join hundreds of institutions who are already teaching their students with personalized AI learning.
            </p>

            <div className="reveal flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <Button
                    size="lg"
                    className="bg-blue-600 text-white hover:bg-blue-700 text-base h-12 px-6"
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
                    className="text-blue-700 border-blue-300 hover:bg-blue-100 text-base h-12 px-6"
                    asChild
                  >
                    <Link href="/contact">Schedule a Demo</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="bg-blue-600 text-white hover:bg-blue-700 text-base h-12 px-6"
                    asChild
                  >
                    <Link href="/register">
                      Start Learning Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-blue-700 border-blue-300 hover:bg-blue-100 text-base h-12 px-6"
                    asChild
                  >
                    <Link href="/contact">Schedule a Demo</Link>
                  </Button>
                </>
              )}
            </div>

            <p className="reveal text-sm text-blue-700 mt-6">
              No credit card required. Start with a free 14-day trial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cta;
