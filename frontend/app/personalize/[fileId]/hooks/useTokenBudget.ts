import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

const TOKEN_COST_PER_1K = 0.02; // $0.02 per 1000 tokens
const TOKEN_LIMIT = 1000; // 1000 tokens per session

export function useTokenBudget(content: string, progress: number) {
  const [tokenUsage, setTokenUsage] = useState(0);
  const [tokenLimit] = useState(TOKEN_LIMIT);
  const [estimatedCost, setEstimatedCost] = useState(0);

  useEffect(() => {
    // Rough estimation: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(content.length / 4);
    setTokenUsage(estimatedTokens);
    
    // Calculate cost
    const cost = (estimatedTokens / 1000) * TOKEN_COST_PER_1K;
    setEstimatedCost(cost);
  }, [content]);

  // Check token budget status
  useEffect(() => {
    const checkBudget = async () => {
      try {
        const data = await apiClient.get('/api/personalization/token-usage');
        if (data.usage) {
          setTokenUsage(data.usage);
        }
      } catch (error) {
        console.error('Failed to check token usage:', error);
      }
    };

    // Check every 30 seconds during streaming
    if (progress > 0 && progress < 100) {
      const interval = setInterval(checkBudget, 30000);
      return () => clearInterval(interval);
    }
  }, [progress]);

  const percentageUsed = (tokenUsage / tokenLimit) * 100;
  const isApproachingLimit = percentageUsed >= 80;
  const canContinue = tokenUsage < tokenLimit;

  return {
    tokenUsage,
    tokenLimit,
    estimatedCost,
    percentageUsed,
    isApproachingLimit,
    canContinue
  };
}