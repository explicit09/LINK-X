import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAssistantSectionProps {
  aiPulse: boolean;
}

export const AIAssistantSection = ({ aiPulse }: AIAssistantSectionProps) => {
  return (
    <Card className={cn(
      "canvas-card bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-purple-200 relative overflow-hidden",
      aiPulse ? "ring-2 ring-purple-300 ring-opacity-75" : ""
    )}>
      <CardContent className="p-6 text-center relative">
        {/* Subtle animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100/20 via-blue-100/20 to-transparent opacity-0 animate-pulse" 
             style={{ animationDuration: '3s' }} />
        
        <div className="relative">
          <div className={cn(
            "w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300",
            aiPulse ? "scale-110 shadow-lg shadow-purple-400" : "shadow-md"
          )}>
            <Brain className="h-8 w-8 text-white" />
            <div className={cn(
              "absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center transition-all duration-300",
              aiPulse ? "scale-125 animate-bounce" : ""
            )}>
              <Zap className="h-3 w-3 text-yellow-800" />
            </div>
          </div>
        </div>
        
        <h3 className="canvas-heading-3 mb-2 bg-gradient-to-r from-purple-800 to-blue-800 bg-clip-text text-transparent">
          AI Study Assistant
        </h3>
        
        <p className="canvas-small text-purple-600 mb-4 leading-relaxed">
          Stuck? Highlight anything or click here to ask your AI tutor instantly.
        </p>
        
        <Button 
          className={cn(
            "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
            "shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-medium"
          )}
        >
          <Brain className="h-4 w-4 mr-2" />
          Start Learning Now
        </Button>
        
        <p className="text-xs text-purple-500 mt-3 opacity-75">
          💡 Try highlighting text anywhere for instant AI help
        </p>
      </CardContent>
    </Card>
  );
};