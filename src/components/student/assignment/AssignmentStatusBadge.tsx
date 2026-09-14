import React from 'react';
import { 
  Sparkles, 
  Clock, 
  Send, 
  Award, 
  RotateCcw, 
  AlertTriangle, 
  XCircle 
} from 'lucide-react';

export type LMSAssignmentStatus = 
  | 'New' 
  | 'In Progress' 
  | 'Submitted' 
  | 'Graded' 
  | 'Returned' 
  | 'Missing' 
  | 'Overdue';

interface AssignmentStatusBadgeProps {
  status: LMSAssignmentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const AssignmentStatusBadge: React.FC<AssignmentStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-xs font-black'
  }[size];

  switch (status) {
    case 'New':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200 ${sizeClasses}`}>
          <Sparkles className="w-3 h-3 text-blue-600" />
          <span>New</span>
        </span>
      );
    case 'In Progress':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 ${sizeClasses}`}>
          <Clock className="w-3 h-3 text-amber-700" />
          <span>In Progress (Draft)</span>
        </span>
      );
    case 'Submitted':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 ${sizeClasses}`}>
          <Send className="w-3 h-3 text-emerald-700" />
          <span>Submitted</span>
        </span>
      );
    case 'Graded':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-300 ${sizeClasses}`}>
          <Award className="w-3 h-3 text-purple-700" />
          <span>Graded</span>
        </span>
      );
    case 'Returned':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 ${sizeClasses}`}>
          <RotateCcw className="w-3 h-3 text-indigo-700" />
          <span>Returned for Correction</span>
        </span>
      );
    case 'Missing':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-orange-100 text-orange-900 border border-orange-300 ${sizeClasses}`}>
          <AlertTriangle className="w-3 h-3 text-orange-700" />
          <span>Missing</span>
        </span>
      );
    case 'Overdue':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-red-100 text-red-900 border border-red-300 ${sizeClasses}`}>
          <XCircle className="w-3 h-3 text-red-700" />
          <span>Overdue</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <span>{status}</span>
        </span>
      );
  }
};
