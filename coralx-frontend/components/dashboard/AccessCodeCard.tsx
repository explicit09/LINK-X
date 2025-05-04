"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;  // ✅ Add the onSuccess prop, optional
}

export default function AccessCodePopup({ open, onClose, onSuccess }: Props) {
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [show, setShow] = useState(false);

  // Animate appearance with delay to trigger Tailwind transitions
  useEffect(() => {
    if (open) {
      setTimeout(() => setShow(true), 10);
    } else {
      setShow(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!accessCode.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8080/student/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accessCode }),
      });

      const data = await res.json();
      if (res.ok) {
        setAccessCode("");
        onClose();
        onSuccess?.();  // ✅ Call onSuccess if provided
      } else {
        console.error(data.error || "Failed to enroll.");
      }
    } catch (err) {
      console.error("Enrollment error:", err);
      alert("Network error or server is down.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
      <div
        className={`bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ${
          show ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <Card className="p-6 relative">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center text-blue-600">
              Join with Access Code
            </CardTitle>
            <Button
              variant="ghost"
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-4">
              <Input
                type="text"
                placeholder="Enter code..."
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="text-lg"
              />
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSubmit}
                disabled={isLoading || accessCode.trim() === ""}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
