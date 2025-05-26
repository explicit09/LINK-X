"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Plus, Brain } from "lucide-react";

const LearnPrompt = () => {
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleLearn = async () => {
    try {
      const formData = new FormData();
      formData.append("question", question);
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch("http://localhost:8080/create-course", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      console.log("Created course:", data);

      if (data.courseId) {
        router.push(`/learn/${data.courseId}`);
      } else {
        router.push("/learn");
      }
    } catch (err) {
      console.error("Failed to learn:", err);
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-lg">
      <CardHeader className="relative flex justify-between items-center">
        <CardTitle className="text-blue-600 text-xl">What would you like to learn?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Give a topic and your expertise; optionally, upload a pdf with content you'd like to learn"
            className="bg-gray-100 text-gray-900 border-gray-300"
          />
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Upload PDF
          </Button>
          <Button
            onClick={handleLearn}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Brain className="mr-2 h-5" />
            Learn
          </Button>
        </div>
        {file && (
          <div className="text-gray-700 text-sm truncate">
            Selected file: <span className="font-medium">{file.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LearnPrompt;
