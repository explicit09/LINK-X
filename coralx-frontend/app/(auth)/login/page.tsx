"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebaseconfig";

export default function Page() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [state, setState] = useState<"idle" | "in_progress" | "success" | "failed" | "invalid_data">("idle");

  useEffect(() => {
    if (state === "failed") {
      toast.error("Invalid credentials. Please try again.");
    } else if (state === "invalid_data") {
      toast.error("Error validating your submission.");
    } else if (state === "success") {
      toast.success("Logged in successfully!");
      setIsSuccessful(true);
      router.push("/dashboard");
    }
  }, [state, router]);

  const handleSubmit = async (formData: FormData) => {
    setEmail(formData.get("email") as string);
    setState("in_progress");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.get("email") as string,
        formData.get("password") as string
      );

      const token = await userCredential.user.getIdToken();

      const sessionRes = await fetch(`${API}/sessionLogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // important for cookies
        body: JSON.stringify({ idToken: token }),
      });

      if (!sessionRes.ok) {
        // Attempt to parse JSON; fall back to plain text otherwise.
        let errorPayload: any = {};
        try {
          errorPayload = await sessionRes.clone().json();
        } catch (_) {
          errorPayload.error = await sessionRes.text();
        }

        console.error("Session login error:", errorPayload.error || errorPayload.message || errorPayload);
        setState("failed");
        toast.error("Session setup failed. Please try again.");
        return;
      }

      setState("success");
      // router.push("/dashboard") will happen inside useEffect
    } catch (error: any) {
      console.error("Firebase Auth Error:", error.message);
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        setState("failed");
        toast.error("Invalid email or password!");
      } else {
        setState("invalid_data");
        toast.error("Unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="mb-8 text-center">
          <img
            src="/images/LearnXLogo.png"
            alt="LEARN-X"
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
          <p className="text-gray-600">Sign in to continue learning</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="space-y-5">
            {/* Primary CTA - Google Sign In */}
            <GoogleAuthButton 
              mode="login" 
              disabled={state === "in_progress"}
            />
            
            {/* Visual Divider */}
            <div className="my-4 border-t border-gray-200"></div>

            {/* Email/Password Form */}
            <AuthForm action={handleSubmit} defaultEmail={email}>
              <SubmitButton isSuccessful={isSuccessful}>
                Sign in
              </SubmitButton>
            </AuthForm>

            {/* Secondary Actions */}
            <div className="space-y-3 pt-2">
              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-brand-indigo hover:text-brand-navy font-medium transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
              
              <div className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-brand-indigo hover:text-brand-navy transition-colors"
                >
                  Sign up for free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
