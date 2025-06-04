import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SettingToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function SettingToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  icon,
  className,
}: SettingToggleProps) {
  return (
    <div
      className={cn('flex items-start justify-between space-x-4', className)}
    >
      <div className="flex items-start space-x-3 flex-1">
        {icon && <div className="mt-1 flex-shrink-0">{icon}</div>}
        <div className="space-y-1 flex-1">
          <Label
            htmlFor={id}
            className="text-sm font-medium leading-none cursor-pointer"
          >
            {label}
          </Label>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="flex-shrink-0"
      />
    </div>
  );
}
