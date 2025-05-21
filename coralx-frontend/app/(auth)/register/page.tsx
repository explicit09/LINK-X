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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
      // Step 1: Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.get("email") as string,
        formData.get("password") as string
      );

      const token = await userCredential.user.getIdToken();
      localStorage.setItem("token", token);

      // Step 2: Determine signup URL based on role
      let signupUrl = "";
      if (role === "student") {
        signupUrl = `${API_URL}/register/student`;
      } else if (role === "instructor") {
        signupUrl = `${API_URL}/register/instructor`;
      } else {
        setState("invalid_data");
        toast.error("Please select Student or Educator.");
        return;
      }

      // Step 3: Prepare data for backend
      const bodyData: any = {
        email: String(formData.get("email")),
        password: String(formData.get("password")),
        idToken: token,
      };

      // Add instructor-specific fields if needed
      if (role === "instructor") {
        bodyData.name = String(formData.get("name") || "");
        bodyData.university = String(formData.get("university") || "");
      }

      console.log('Sending registration data:', JSON.stringify(bodyData, null, 2));
      
      // Step 4: Register user in backend database
      try {
        const postgresResponse = await fetch(signupUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
          credentials: 'include',
          mode: 'cors',
        });

        if (!postgresResponse.ok) {
          if (postgresResponse.status === 409) {
            // Duplicate email detected from backend
            setState("user_exists");
            toast.error("Email is already registered!");
            return;
          }

          let errorMessage = 'Failed to create user record';
          let errorPayload: any = {};
          try {
            errorPayload = await postgresResponse.clone().json();
          } catch (_) {
            errorPayload.error = await postgresResponse.text();
          }

          console.error(
            "Postgres user creation error:",
            errorPayload.error || errorPayload.message || errorPayload,
          );

          errorMessage = errorPayload.error || errorPayload.message || 'Invalid data format';

          // Handle specific backend validation errors
          if (errorMessage.includes('pattern') || errorMessage.includes('validation')) {
            setState("invalid_data");
            toast.error(`Validation error: ${errorMessage}`);
          } else {
            setState("failed");
            toast.error(`Registration failed: ${errorMessage}`);
          }

          return;
        }
        
        console.log("User created successfully in database");
        
        // Step 5: Create session login
        try {
          const loginResponse = await fetch(`${API_URL}/sessionLogin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ idToken: token }),
          });

          if (!loginResponse.ok) {
            let errorMessage = 'Failed to set session cookie';
            let loginPayload: any = {};
            try {
              loginPayload = await loginResponse.clone().json();
            } catch (_) {
              loginPayload.error = await loginResponse.text();
            }

            console.error("Session login error:", loginPayload.error || loginPayload.message || loginPayload);
            errorMessage = loginPayload.error || loginPayload.message || 'Session login failed';
            setState("failed");
            toast.error(`Session error: ${errorMessage}`);
            return;
          }
          
          // Success path
          setState("success");
          router.push("/onboarding");
        } catch (sessionError) {
          console.error("Session creation error:", sessionError);
          setState("failed");
          toast.error("Failed to create session");
          return;
        }
      } catch (dbError) {
        console.error("Database registration error:", dbError);
        setState("failed");
        toast.error("Failed to register in database");
        return;
      }
    } catch (error: any) {
      console.error("Firebase Registration Error:", error.message);
      if (error.code === "auth/email-already-in-use") {
        setState("user_exists");
        toast.error("Email is already registered!");
      } else if (error.code === "auth/weak-password") {
        setState("invalid_data");
        toast.error("Password is too weak!");
      } else {
        setState("failed");
        toast.error("Failed to create account: " + error.message);
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