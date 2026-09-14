import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface TimeRemainingTickerProps {
  dueDate: string;
  dueTime?: string;
  isSubmitted?: boolean;
}

export const TimeRemainingTicker: React.FC<TimeRemainingTickerProps> = ({ dueDate, dueTime = '23:59', isSubmitted = false }) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isOverdue, setIsOverdue] = useState<boolean>(false);

  useEffect(() => {
    if (!dueDate) {
      setTimeLeftStr('No due date set');
      setIsOverdue(false);
      return;
    }

    const calculateTimeLeft = () => {
      try {
        const targetDateTimeStr = `${dueDate}T${dueTime.length === 5 ? dueTime : '23:59'}:00`;
        const targetTime = new Date(targetDateTimeStr).getTime();
        const now = new Date().getTime();

        if (isNaN(targetTime)) {
          setTimeLeftStr(dueDate);
          setIsOverdue(false);
          return;
        }

        const diff = targetTime - now;

        if (diff <= 0) {
          setIsOverdue(true);
          const absDiff = Math.abs(diff);
          const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

          if (days > 0) {
            setTimeLeftStr(`Overdue by ${days}d ${hours}h`);
          } else if (hours > 0) {
            setTimeLeftStr(`Overdue by ${hours}h ${mins}m`);
          } else {
            setTimeLeftStr(`Overdue by ${mins}m`);
          }
        } else {
          setIsOverdue(false);
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);

          if (days > 0) {
            setTimeLeftStr(`${days}d ${hours}h left`);
          } else if (hours > 0) {
            setTimeLeftStr(`${hours}h ${mins}m left`);
          } else {
            setTimeLeftStr(`${mins}m ${secs}s left`);
          }
        }
      } catch {
        setTimeLeftStr(dueDate);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [dueDate, dueTime]);

  if (isSubmitted) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 font-mono">
        <Clock className="w-3.5 h-3.5" />
        Submitted
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-black font-mono px-2 py-0.5 rounded-md ${
      isOverdue ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' : 'bg-slate-100 text-[#002147] border border-slate-200'
    }`}>
      {isOverdue ? <AlertCircle className="w-3 h-3 text-red-600" /> : <Clock className="w-3 h-3 text-[#D4AF37]" />}
      <span>{timeLeftStr}</span>
    </span>
  );
};
