"use client";

import { useEffect, useRef } from 'react';
import { GraduationCap, Users, Code, BarChart, BookOpen, Award } from 'lucide-react';

const EducatorBenefits = () => {
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

  const benefits = [
    {
      title: "Compatibility",
      description: "Works with Canvas. With just a short few steps, your class materials on Canvas can be uploaded to the Learn-X AI.",
      icon: BookOpen
    },
    {
      title: "Anti-Cheating",
      description: "The Learn-X AI engine prevents students from getting answers to homework and quiz questions.",
      icon: Award
    },
    {
      title: "Personalization",
      description: "Your students can get a more personalized lesson.",
      icon: Users
    },
    {
      title: "Analytics",
      description: "Learn what questions and concepts students are struggling with.",
      icon: BarChart
    }
  ];

  return (
    <div id="for-educators" ref={sectionRef} className="section bg-white">
      <div className="section-inner">
        <div className="text-center mb-16">
          <h5 className="reveal text-blue-600 text-sm font-semibold tracking-wide uppercase mb-3">
            For Educators
          </h5>
          <h2 className="reveal text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Help Your Students Learn Their Own Way
          </h2>
          <p className="reveal max-w-2xl mx-auto text-gray-600">
            Learn-X doesn't just teach your students class concepts — it equips them with practical skills for the modern world.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {benefits.map((benefit) => (
            <div 
              key={benefit.title}
              className="reveal bg-white border border-gray-200 rounded-xl p-6 flex items-start shadow-sm transition-all hover:shadow-md"
            >
              <div className="rounded-full w-12 h-12 flex items-center justify-center bg-blue-100 mr-4 flex-shrink-0">
                <benefit.icon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-700">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EducatorBenefits;
