"use client";

import { useEffect, useRef } from 'react';
import { Cpu, BookOpen, Zap, Award, BarChart, Database } from 'lucide-react';

const features = [
  {
    name: 'AI-Powered Personalization',
    description: 'Our AI analyzes your learning style and creates a customized curriculum that adapts to your needs.',
    icon: Cpu,
  },
  {
    name: 'Interactive Course Materials',
    description: 'Upload or link your Canvas modules that transform into interactive learning modules.',
    icon: BookOpen,
  },
  {
    name: 'Adaptive Assessments',
    description: "Quizzes and assessments that adjust to your student's progress, focusing on areas where you need more practice.",
    icon: Zap,
  },
  {
    name: 'No Cheating Allowed',
    description: 'Our AI prompting does not allow for students to receive answers for their assignments, just helpful insights.',
    icon: Award,
  },
  {
    name: 'Progress Analytics',
    description: "Detailed insights into your student's learning journey with metrics to track their improvement over time.",
    icon: BarChart,
  },
  {
    name: 'Cloud-Based Learning',
    description: 'Access your personalized learning materials from any device, with progress automatically synced.',
    icon: Database,
  },
];

const Features = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elements = entry.target.querySelectorAll('.reveal');
          if (entry.isIntersecting) {
            elements.forEach((el, index) => {
              setTimeout(() => {
                el.classList.add('active');
              }, index * 100);
            });
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

  return (
    <div id="features" ref={sectionRef} className="section bg-white/60">
      <div className="section-inner">
        <div className="text-center mb-16">
          <h5 className="reveal text-blue-600 text-sm font-semibold tracking-wide uppercase mb-3">
            Features
          </h5>
          <h2 className="reveal text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Revolutionize Your Student's Learning
          </h2>
          <p className="reveal max-w-2xl mx-auto text-gray-700">
            Our comprehensive suite of tools is designed to transform how your students learn, making complex concepts accessible and engaging.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.name}
              className="reveal bg-white border border-blue-100 rounded-xl p-6 shadow-sm transition-all duration-300 hover:border-blue-600"
            >
              <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-lg text-blue-600 mb-4">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.name}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
