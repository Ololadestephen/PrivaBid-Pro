'use client';

import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';

interface StatusMessageProps {
  type: 'success' | 'error';
  message: string;
}

export default function StatusMessage({ type, message }: StatusMessageProps) {
  if (!message) return null;
  
  const bgColor = type === 'success' ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50';
  const textColor = type === 'success' ? 'text-green-400' : 'text-red-400';
  const Icon = type === 'success' ? FaCheck : FaExclamationTriangle;

  return (
    <div className={`mb-6 p-4 ${bgColor} border rounded-lg`}>
      <div className={`flex items-center gap-2 ${textColor}`}>
        <Icon />
        <span>{message}</span>
      </div>
    </div>
  );
}