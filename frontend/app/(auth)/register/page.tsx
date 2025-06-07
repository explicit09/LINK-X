'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteFooter } from '@/components/SiteFooter';

import { signUpWithEmail } from '@/lib/auth/supabase-auth-service';
import { authService, type RegistrationData } from '@/lib/auth-service';

// Import GoogleAuthButton with no SSR to prevent hydration mismatches
const GoogleAuthButton = dynamic(
  () =>
    import('@/components/auth/GoogleAuthButton').then((mod) => ({
      default: mod.GoogleAuthButton,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-12 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    ),
  },
);

export default function Page() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [state, setState] = useState<
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data'
  >('idle');

  useEffect(() => {
    if (state === 'user_exists') {
      toast.error('Account already exists');
    } else if (state === 'failed') {
      toast.error('Failed to create account');
    } else if (state === 'invalid_data') {
      toast.error('Invalid data');
    } else if (state === 'success') {
      toast.success('Account created successfully');
      if (role === 'student') {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    }
  }, [state, router, role]);

  const handleChange = (value: string) => {
    if (value === 'student' || value === 'instructor') {
      setRole(value);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setEmail(formData.get('email') as string);
    setState('in_progress');

    try {
      // Step 1: Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.get('email') as string,
        formData.get('password') as string,
      );

      // Step 2: Prepare registration data for auth service
      const registrationData: RegistrationData = {
        role: role,
        name: role === 'instructor' ? String(formData.get('name') || '') : '',
        university: role === 'instructor' ? String(formData.get('university') || '') : '',
      };

      // Step 3: Use auth service to complete registration
      const registrationSuccess = await authService.register(registrationData);

      if (!registrationSuccess) {
        setState('failed');
        toast.error('Failed to complete registration');
        // If registration fails, we might want to delete the Firebase user
        // to avoid orphaned Firebase accounts
        try {
          await userCredential.user.delete();
          console.log('Cleaned up Firebase user after failed registration');
        } catch (deleteError) {
          console.error('Failed to cleanup Firebase user:', deleteError);
        }
        return;
      }

      // Registration successful
      setState('success');

    } catch (error: any) {
      console.error('Firebase Registration Error:', error.message);
      if (error.code === 'auth/email-already-in-use') {
        setState('user_exists');
        toast.error('Email is already registered!');
      } else if (error.code === 'auth/weak-password') {
        setState('invalid_data');
        toast.error('Password is too weak!');
      } else {
        setState('failed');
        toast.error('Failed to create account: ' + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="mb-8 text-center">
            <img
              src="/images/LearnXLogo.png"
              alt="LEARN-X"
              className="h-12 w-auto mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create your account
            </h1>
            <p className="text-gray-600">Start your learning journey today</p>
          </div>

          {/* Register Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="space-y-5">
              {/* Primary CTA - Google Sign Up */}
              <GoogleAuthButton
                mode="register"
                disabled={state === 'in_progress'}
              />

              {/* Visual Divider */}
              <div className="my-4 border-t border-gray-200"></div>

              {/* Registration Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  await handleSubmit(formData);
                }}
                className="space-y-5"
              >
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label
                    htmlFor="studentOrEducator"
                    className="text-sm font-medium text-gray-900"
                  >
                    I am a
                  </Label>
                  <Select onValueChange={handleChange} defaultValue="student">
                    <SelectTrigger
                      id="studentOrEducator"
                      className="h-12 px-3 text-base border-gray-300 rounded-lg bg-white transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo focus:ring-opacity-20 focus:outline-none"
                    >
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300 rounded-lg shadow-lg">
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="instructor">Educator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Instructor-specific fields */}
                {role === 'instructor' && (
                  <>
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-medium text-gray-900"
                      >
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        className="h-12 px-3 text-base border-gray-300 rounded-lg bg-white placeholder-gray-400 transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo focus:ring-opacity-20 focus:outline-none"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="university"
                        className="text-sm font-medium text-gray-900"
                      >
                        University Name
                      </Label>
                      <Input
                        id="university"
                        name="university"
                        className="h-12 px-3 text-base border-gray-300 rounded-lg bg-white placeholder-gray-400 transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo focus:ring-opacity-20 focus:outline-none"
                        type="text"
                        placeholder="Enter your university name"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-900"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    className="h-12 px-3 text-base border-gray-300 rounded-lg bg-white placeholder-gray-400 transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo focus:ring-opacity-20 focus:outline-none"
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                    defaultValue={email}
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-900"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    className="h-12 px-3 text-base border-gray-300 rounded-lg bg-white placeholder-gray-400 transition-colors focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo focus:ring-opacity-20 focus:outline-none"
                    type="password"
                    placeholder="Enter your password"
                    required
                  />

                  {/* Inline Security Note */}
                  <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Encrypted</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={state === 'in_progress' || state === 'success'}
                    className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-base">
                      {state === 'in_progress'
                        ? 'Creating account...'
                        : 'Sign up'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Secondary Actions */}
              <div className="text-center text-sm text-gray-600 pt-2">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-brand-indigo hover:text-brand-navy transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Site Footer */}
      <SiteFooter />
    </div>
  );
}
