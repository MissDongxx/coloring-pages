import { HelpCircle, Star, User, Settings, Home, Search, Info, Mail } from 'lucide-react';
import { ComponentType, Suspense } from 'react';

const ICON_MAP: Record<string, any> = {
  HelpCircle,
  Star,
  User,
  Settings,
  Home,
  Search,
  Info,
  Mail,
};

export function SmartIcon({
  name,
  size = 24,
  className,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  [key: string]: any;
}) {
  const IconComponent = ICON_MAP[name] || HelpCircle;

  return (
    <IconComponent size={size} className={className} {...props} />
  );
}
