import React from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  name?: string;
  role?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = 'User',
  role = 'student',
  size = 'md',
  className = ''
}) => {
  // Extract initials cleanly from real registered name
  const getInitials = (fullName: string): string => {
    if (!fullName) return 'U';
    const clean = fullName.trim().replace(/[^A-Za-z\s]/g, '');
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  // Size definitions
  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  // Role-based palette (Neutral, clean, high contrast)
  const roleStyles = {
    admin: 'bg-indigo-800 text-indigo-100 border border-indigo-600 shadow-xs font-black',
    staff: 'bg-blue-800 text-blue-100 border border-blue-600 shadow-xs font-bold',
    student: 'bg-slate-700 text-slate-100 border border-slate-600 shadow-xs font-bold'
  };

  const activeRoleStyle = role === 'admin' 
    ? roleStyles.admin 
    : role === 'staff' 
      ? roleStyles.staff 
      : roleStyles.student;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl font-mono select-none shrink-0 ${sizeStyles[size]} ${activeRoleStyle} ${className}`}
      title={name}
      aria-label={`User avatar for ${name}`}
    >
      {initials || <UserIcon className="w-4 h-4 opacity-80" />}
    </div>
  );
};
