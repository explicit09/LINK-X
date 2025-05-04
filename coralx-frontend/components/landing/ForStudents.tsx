"use client";

import { useEffect, useRef } from 'react';
import { GraduationCap, Users, Code, BarChart } from 'lucide-react';

const StudentBenefits = () => {
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
      title: "Learn from Experts",
      description: "Collaborate with TAs and professors to further improve your learning.",
      icon: GraduationCap
    },
    {
      title: "Team Collaboration",
      description: "Develop teamwork skills by working with peers on real-world challenges and projects.",
      icon: Users
    },
    {
      title: "Test Practice",
      description: "Create practice work to better prepare for upcoming quizzes and tests.",
      icon: Code
    },
    {
      title: "Lecture Help",
      description: "Your professor explained a complicated topic in a way you didn't understand. No problem! Reworded and reworked lessons will help you further your education.",
      icon: BarChart
    }
  ];

  return (
    <div id="for-students" ref={sectionRef} className="section bg-white">
      <div className="section-inner">
        <div className="text-center mb-16">
          <h5 className="reveal text-blue-600 text-sm font-semibold tracking-wide uppercase mb-3">
            For Students
          </h5>
          <h2 className="reveal text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Skills You'll Develop
          </h2>
          <p className="reveal max-w-2xl mx-auto text-gray-600">
            Learn-X doesn't just teach class concepts — it equips you with practical skills for the modern world.
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

export default StudentBenefits;
