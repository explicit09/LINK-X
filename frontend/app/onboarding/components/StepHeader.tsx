/**
 * Step header component with icon, title, and description
 */

import { User, BookOpen, Target, Heart } from 'lucide-react';
import {
  STEP_COLORS,
  STEP_TITLES,
  STEP_DESCRIPTIONS,
} from '../constants/form-options';

interface StepHeaderProps {
  step: number;
}

const STEP_ICON_MAP = {
  1: User,
  2: BookOpen,
  3: Target,
  4: Heart,
} as const;

export function StepHeader({ step }: StepHeaderProps) {
  const IconComponent = STEP_ICON_MAP[step as keyof typeof STEP_ICON_MAP];
  const gradientColor = STEP_COLORS[step as keyof typeof STEP_COLORS];
  const title = STEP_TITLES[step as keyof typeof STEP_TITLES];
  const description = STEP_DESCRIPTIONS[step as keyof typeof STEP_DESCRIPTIONS];

  return (
    <div className="text-center mb-8">
      <div
        className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${gradientColor} rounded-2xl mb-4`}
      >
        <IconComponent className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
