
import React from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-16 h-16'
  };

  const containerSizes = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-2xl',
    lg: 'p-4 rounded-3xl',
    xl: 'p-6 rounded-[2.5rem]'
  };

  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-md',
    lg: 'text-2xl',
    xl: 'text-5xl sm:text-7xl'
  };

  const subtextSizes = {
    sm: 'text-[6px]',
    md: 'text-[8px]',
    lg: 'text-[10px]',
    xl: 'text-[10px] sm:text-xs'
  };

  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${size === 'xl' ? 'flex-col' : ''}`}>
      <div className={`relative bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30 shadow-xl flex-shrink-0 ${containerSizes[size]}`}>
        <Activity className={`text-white ${iconSizes[size]}`} />
      </div>
      
      {showText && (
        <div className={size === 'xl' ? 'text-center' : 'min-w-0'}>
          <h1 className={`font-black tracking-tighter text-[var(--text-main)] ${textSizes[size]}`}>
            VIP <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">LAYER</span>
          </h1>
          <p className={`font-bold text-emerald-500 uppercase tracking-[0.5em] leading-none ${subtextSizes[size]}`}>
            Intelligence
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo;
