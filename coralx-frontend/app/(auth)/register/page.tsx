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
import { Checkbox } from "@/components/ui/checkbox";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebaseconfig";

export default function Page() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "educator">("student");
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");

  const [state, setState] = useState<
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data"
  >("idle");

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    name: "",
    job: "",
    traits: "",
    learningStyle: "",
    depth: "",
    topics: "",
    interests: "",
    schedule: "",
    quizzes: false,
  });

  useEffect(() => {
    if (state === "user_exists") toast.error("Account already exists");
    else if (state === "failed") toast.error("Failed to create account");
    else if (state === "invalid_data") toast.error("Invalid data");
    else if (state === "success") {
      toast.success("Account created successfully");
      router.push("/dashboard");
    }
  }, [state, router]);

  const handleRoleChange = (value: string) => {
    if (value === "student" || value === "educator") {
      setRole(value);
      setShowOnboarding(value === "student");
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setEmail(formData.get("email") as string);
    setPassword(formData.get("password") as string);
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
      const bodyData: any = {
        email: formData.get("email"),
        password: formData.get("password"),
        idToken: token,
      };

      if (role === "educator") {
        signupUrl = "http://localhost:8080/register/instructor";
        bodyData.name = formData.get("name");
        bodyData.university = formData.get("university");
      } else if (role === "student") {
        signupUrl = "http://localhost:8080/register/student";
        bodyData.onboarding = {
          name: onboardingData.name,
          answers: [
            onboardingData.job,
            onboardingData.traits,
            onboardingData.learningStyle,
            onboardingData.depth,
            onboardingData.topics,
            onboardingData.interests,
            onboardingData.schedule,
          ],
          quizzes: onboardingData.quizzes,
        };
      } else {
        setState("invalid_data");
        return;
      }

      const postgresResponse = await fetch(signupUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!postgresResponse.ok) {
        console.error(await postgresResponse.text());
        setState("failed");
        return;
      }

      await fetch(`${API}/sessionLogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken: token }),
      });

      setState("success");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setState("user_exists");
      } else if (error.code === "auth/weak-password") {
        setState("invalid_data");
        toast.error("Password is too weak!");
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
          <h3 className="text-xl font-semibold dark:text-blue-400">Sign Up</h3>
        </div>

        {!showOnboarding && (
          <AuthForm action={handleSubmit} defaultEmail={email}>
            <div className="flex flex-col gap-2">
              <p className="text-zinc-600 text-sm font-normal dark:text-zinc-400">
                I am a
              </p>
              <Select onValueChange={handleRoleChange}>
                <SelectTrigger className="bg-muted rounded-md border border-input px-3 py-2">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-input text-sm rounded-md shadow-md">
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="educator">Educator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "educator" && (
              <>
                <label>Full Name</label>
                <input
                  name="name"
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <label>University Name</label>
                <input
                  name="university"
                  type="text"
                  className="input"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  required
                />
              </>
            )}

            <SubmitButton isSuccessful={state === "success"}>
              Sign Up
            </SubmitButton>

            <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-400 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </AuthForm>
        )}

        {showOnboarding && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(new FormData(e.currentTarget));
            }}
            className="flex flex-col gap-4 px-4"
          >
            <input name="email" type="hidden" value={email} />
            <input name="password" type="hidden" value={password} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                What should Link‑X call you?
              </label>
              <input
                required
                className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm"
                onChange={(e) =>
                  setOnboardingData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                What do you do?
              </label>
              <input
                className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm"
                onChange={(e) =>
                  setOnboardingData((prev) => ({
                    ...prev,
                    job: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Traits Link-X should have
              </label>
              <input
                className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm"
                onChange={(e) =>
                  setOnboardingData((prev) => ({
                    ...prev,
                    traits: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Preferred Learning Style
              </label>
              <Select
                onValueChange={(v) =>
                  setOnboardingData((prev) => ({ ...prev, learningStyle: v }))
                }
              >
                <SelectTrigger className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
                  <SelectValue placeholder="Choose style" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 rounded-md shadow-md">
                  <SelectItem value="visual">Visual</SelectItem>
                  <SelectItem value="auditory">Auditory</SelectItem>
                  <SelectItem value="games">Games</SelectItem>
                  <SelectItem value="text-based">Text-based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Depth of Explanation
              </label>
              <Select
                onValueChange={(v) =>
                  setOnboardingData((prev) => ({ ...prev, depth: v }))
                }
              >
                <SelectTrigger className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
                  <SelectValue placeholder="Choose depth" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 rounded-md shadow-md">
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="detailed">In-depth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Topics of Interest
              </label>
              <input
                className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm"
                onChange={(e) =>
                  setOnboardingData((prev) => ({
                    ...prev,
                    topics: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Other Interests
              </label>
              <input
                className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm"
                onChange={(e) =>
                  setOnboardingData((prev) => ({
                    ...prev,
                    interests: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Preferred Study Schedule
              </label>
              <Select
                onValueChange={(v) =>
                  setOnboardingData((prev) => ({ ...prev, schedule: v }))
                }
              >
                <SelectTrigger className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
                  <SelectValue placeholder="Choose schedule" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 rounded-md shadow-md" >
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={onboardingData.quizzes}
                onCheckedChange={(c) =>
                  setOnboardingData((prev) => ({
                    ...prev,
                    quizzes: c === true,
                  }))
                }
              />
              <label className="text-sm text-gray-700">
                Include quizzes for progress tracking?
              </label>
            </div>

            <SubmitButton isSuccessful={state === "success"}>
              Finish Sign Up
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
