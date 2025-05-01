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
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
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
    if (value === "student" || value === "instructor") {
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

      const token = await userCredential.user.getIdToken();
      localStorage.setItem("token", token);

      let signupUrl = "";
      if (role == "student") {
        signupUrl = "http://localhost:8080/register/student";
      } else if (role == "instructor") {
        signupUrl = "http://localhost:8080/register/instructor";
      } else {
        setState("invalid_data");
        toast.error("Please select Student or Educator.");
        return;
      }

      const bodyData: any = {
        email: formData.get("email"),
        password: formData.get("password"),
        idToken: token,
      };

      // if instructor, include name + university
      if (role === "instructor") {
        bodyData.name = formData.get("name");
        bodyData.university = formData.get("university");
      }

      const postgresResponse = await fetch(signupUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!postgresResponse.ok) {
        const errorData = await postgresResponse.json();
        console.error("Postgres user creation error:", errorData.error);
        setState("failed");
        toast.error("Failed to create Postgres user record");
        return;
      }
      console.log("success")

      const loginResponse = await fetch("http://localhost:8080/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken: token }),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        console.error("Session login error:", errorData.error);
        setState("failed");
        toast.error("Failed to set session cookie.");
        return;
      }

      setState("success");
      router.push("/onboarding");
    } catch (error: any) {
      console.error("Registration Error:", error.message);
      if (error.code === "auth/email-already-in-use") {
        setState("user_exists");
        toast.error("Email is already registered!");
      } else if (error.code === "auth/weak-password") {
        setState("invalid_data");
        toast.error("Password is too weak!");
      } else {
        setState("failed");
        toast.error("Failed to create account.");
      }
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <Header isLoggedIn={false} showAuthButton={false} />
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-blue-400">Sign Up</h3>
        </div>

        <AuthForm action={handleSubmit} defaultEmail={email}>
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
              <SelectContent className="bg-white border border-input text-sm rounded-md shadow-md">
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="instructor">Educator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ✅ Show these fields ONLY if Educator selected */}
          {role === "instructor" && (
            <div className="flex flex-col gap-2">
              <p className="text-zinc-600 text-sm font-normal dark:text-zinc-400">
              Full Name
            </p>
              <input
                type="text"
                name="name"
                placeholder=""
                className="bg-muted text-md md:text-sm rounded-md border border-input px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-zinc-600 text-sm font-normal dark:text-zinc-400">
              University Name
            </p>
              <input
                type="text"
                name="university"
                placeholder=""
                className="bg-muted text-md md:text-sm rounded-md border border-input px-3 py-2"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                required
              />
            </div>
          )}

          <SubmitButton isSuccessful={state === "success"}>
            Sign Up
          </SubmitButton>

          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-400 hover:underline dark:text-blue-400"
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