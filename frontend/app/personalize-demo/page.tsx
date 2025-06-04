'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Sparkles, BookOpen, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function PersonalizationDemoPage() {
  const demoFiles = [
    {
      id: 'demo-1',
      name: 'Introduction to Physics - Chapter 1',
      course: 'Physics 101',
      type: 'textbook_chapter'
    },
    {
      id: 'demo-2', 
      name: 'Marketing Strategy Presentation',
      course: 'Business Studies',
      type: 'presentation_slides'
    },
    {
      id: 'demo-3',
      name: 'Biology Lecture Notes - Cell Division',
      course: 'Biology Fundamentals',
      type: 'lecture_notes'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Personalized Learning Demo
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Experience how we transform complex content into personalized study guides
          </p>
          <div className="flex justify-center gap-8 mb-12">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <span className="text-gray-700">Student-Friendly</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <span className="text-gray-700">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              <span className="text-gray-700">Gamified Learning</span>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Simple & Clear</h3>
            <p className="text-gray-600">
              Complex concepts broken down into easy-to-understand explanations
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Interactive Controls</h3>
            <p className="text-gray-600">
              Play, pause, skip, and customize your learning experience
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Achievements & Progress</h3>
            <p className="text-gray-600">
              Earn points, unlock achievements, and track your learning journey
            </p>
          </Card>
        </div>

        {/* Demo Files */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Try These Demo Files</h2>
          <div className="space-y-4">
            {demoFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{file.name}</h3>
                  <p className="text-sm text-gray-600">{file.course}</p>
                </div>
                <Link href={`/personalize/${file.id}?demo=true`}>
                  <Button>
                    Try Demo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Upload your own materials and experience personalized learning
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}