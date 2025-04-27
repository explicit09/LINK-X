"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Loader2 } from "lucide-react"; // <--- we add Loader2 spinner icon!

const AccessCodeCard = () => {
  const [accessCode, setAccessCode] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAccessCodeSubmit = async () => {
    setIsLoading(true);

    try {
      console.log("Access Code Submitted:", accessCode);
      // Simulate a request (you would replace this with your real API call)
      await new Promise((resolve) => setTimeout(resolve, 1500)); //Remove when functionality is added

      // Clear the input after success
      setAccessCode("");
    } catch (error) {
      console.error("Failed to submit access code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "transition-all duration-300",
        isExpanded
          ? "fixed inset-0 bg-white z-50 flex items-center justify-center p-6"
          : "relative"
      )}
    >
      <Card
        className={cn(
          "bg-white border border-gray-200 shadow-lg transition-all duration-300",
          isExpanded
            ? "w-full max-w-2xl h-full p-6 overflow-auto"
            : "w-full"
        )}
        
      >
        <CardHeader className="relative flex justify-between items-center">
          <CardTitle className="text-xl text-blue-600">
            Enter Access Code
          </CardTitle>
          {isExpanded && (
            <Button
              variant="ghost"
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
            >
              <X className="h-6 w-6" />
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              placeholder="Enter access code..."
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="bg-gray-100 text-gray-900 border-gray-300 w-full h-12 text-lg"
            />
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              onClick={handleAccessCodeSubmit}
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
  );
};

export default AccessCodeCard;
