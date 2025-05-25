"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebaseconfig";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      if (error.code === 'auth/user-not-found') {
        toast.error("No account found with this email address.");
      } else {
        toast.error("Failed to send password reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex">
      {/* Hero Section - Left Side */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8 bg-gradient-to-br from-brand-navy to-brand-indigo">
        <div className="max-w-md mx-auto text-white">
          {/* Logo */}
          <div className="mb-8">
            <img
              src="/images/LearnXLogo.png"
              alt="LEARN-X"
              className="h-12 w-auto brightness-0 invert"
            />
          </div>
          
          {/* Value Proposition */}
          <h1 className="text-4xl font-bold mb-6 leading-tight">
            Reset your password securely
          </h1>
          
          <p className="text-blue-100 text-lg mb-8 leading-relaxed">
            We'll send you a secure link to reset your password and get you back to learning.
          </p>
          
          {/* Trust Indicators */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-green-800" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-blue-100">Secure password reset</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-green-800" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-blue-100">Email verification required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form - Right Side */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <img
              src="/images/LearnXLogo.png"
              alt="LEARN-X"
              className="h-8 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-600">Enter your email to receive reset instructions</p>
          </div>

          {/* Reset Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 animate-fade-in border border-gray-100">
            <div className="hidden lg:block text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600">Enter your email to receive reset instructions</p>
            </div>

            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-900">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-3 text-base border-gray-300 rounded-lg bg-white placeholder-gray-400 transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo focus:ring-opacity-20 focus:outline-none border"
                    placeholder="Enter your email"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-brand-indigo hover:bg-brand-navy text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Reset Email"}
                </button>

                <div className="text-center pt-4 border-t border-gray-100">
                  <Link
                    href="/login"
                    className="text-sm text-brand-indigo hover:text-brand-navy font-medium transition-colors"
                  >
                    ← Back to Sign In
                  </Link>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Email Sent!</h3>
                  <p className="text-gray-600 mb-4">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Check your inbox and follow the instructions to reset your password.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => {setSent(false); setEmail("");}}
                    className="text-sm text-brand-indigo hover:text-brand-navy font-medium transition-colors"
                  >
                    Try a different email
                  </button>
                  
                  <div className="text-center">
                    <Link
                      href="/login"
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      ← Back to Sign In
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 