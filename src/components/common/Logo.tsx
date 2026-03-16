import React from 'react';

interface LogoProps {
  size?: 'small' | 'normal' | 'large';
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'normal', 
  showText = true, 
  variant = 'light' 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    normal: 'w-10 h-10 text-base',
    large: 'w-16 h-16 text-2xl'
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/30 relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative tracking-tight">WM</span>
      </div>
      {showText && size !== 'small' && (
        <div>
          <h1 className={`font-bold ${variant === 'dark' ? 'text-white' : 'bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent'} ${size === 'large' ? 'text-xl' : 'text-sm'}`}>
            World Medicine
          </h1>
          {size === 'large' && <p className="text-[10px] text-slate-400 -mt-1">MDLP Analytics Pro</p>}
        </div>
      )}
    </div>
  );
};

export default Logo;
