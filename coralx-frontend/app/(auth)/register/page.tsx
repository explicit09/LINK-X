"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import Header from "@/components/link-x/Header";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebaseconfig";

export default function Page() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "educator">("student");
  const [state, setState] = useState<
    "idle" | "in_progress" | "success" | "failed" | "user_exists" | "invalid_data"
  >("idle");

  useEffect(() => {
    if (state === "user_exists") {
      toast.error("Account already exists");
    } else if (state === "failed") {
      toast.error("Failed to create account");
    } else if (state === "invalid_data") {
      toast.error("Invalid data");
    } else if (state === "success") {
      toast.success("Account created successfully");
      if (role === "student") {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    }
  }, [state, router, role]);

  const handleChange = (value: string) => {
    if (value === "student" || value === "educator") {
      setRole(value);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setEmail(formData.get("email") as string);
    setState("in_progress");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.get("email") as string,
        formData.get("password") as string
      );
      const idToken = await userCredential.user.getIdToken();
      localStorage.setItem("token", idToken);

      const registerEndpoint =
        role === "student" ? "register/student" : "register/professor";

      const resp = await fetch(`${API}/${registerEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          idToken,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        console.error("Postgres register error:", err.error);
        setState("failed");
        return;
      }

      const loginResp = await fetch(`${API}/sessionLogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });
      if (!loginResp.ok) {
        const err = await loginResp.json();
        console.error("sessionLogin error:", err.error);
        setState("failed");
        return;
      }

      setState("success");
    } catch (error: any) {
      console.error("Registration Error:", error);
      if (error.code === "auth/email-already-in-use") {
        setState("user_exists");
      } else if (error.code === "auth/weak-password") {
        setState("invalid_data");
      } else {
        setState("failed");
      }
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <Header isLoggedIn={false} showAuthButton={false} />
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign Up</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          {/* Role dropdown */}
          <div className="flex flex-col gap-2">
            <p className="text-zinc-600 text-sm font-normal dark:text-zinc-400">
              I am a
            </p>
            <Select onValueChange={handleChange}>
              <SelectTrigger
                id="studentOrEducator"
                className="bg-muted text-md md:text-sm rounded-md border border-input px-3 py-2"
              >
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-800 border border-input text-sm rounded-md shadow-md">
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="educator">Educator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SubmitButton isSuccessful={state === "success"}>
            Sign Up
          </SubmitButton>

          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}