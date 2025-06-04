interface OnboardingPromptProps {
  onComplete: () => void;
  onDismiss: () => void;
}

export function OnboardingPrompt({
  onComplete,
  onDismiss,
}: OnboardingPromptProps) {
  return (
    <div className="flex justify-center items-center min-h-screen px-4">
      <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Profile Setup Needed
        </h2>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t find your learning profile. Would you like to set up
          your preferences to get personalized content?
        </p>
        <div className="space-y-3">
          <button
            onClick={onComplete}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Set Up Profile
          </button>
          <button
            onClick={onDismiss}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Continue Without Profile
          </button>
        </div>
      </div>
    </div>
  );
}
