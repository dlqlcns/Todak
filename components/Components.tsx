
import React from 'react';
import { ScreenName } from '../types';
import { Home, Calendar, PieChart, Bell, User, LogOut, ChevronLeft } from 'lucide-react';

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-[24px] p-6 shadow-sm border border-olivegray/30 ${className}`}>
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', fullWidth = false, className = '', ...props }) => {
  const baseStyle = "py-4 px-6 rounded-2xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-[15px] tracking-wide";
  const variants = {
    primary: "bg-olive text-white hover:bg-olive-dark shadow-md shadow-olive/20",
    secondary: "bg-beige border border-olive text-olive hover:bg-olive/10",
    danger: "bg-white border border-softorange text-softorange hover:bg-softorange/10",
    ghost: "bg-transparent text-warmbrown/60 hover:text-warmbrown"
  };
  
  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Bottom Navigation ---
interface BottomNavProps {
  current: ScreenName;
  onNavigate: (screen: ScreenName) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ current, onNavigate }) => {
  const navItems: { id: ScreenName; icon: React.FC<any>; label: string }[] = [
    { id: 'home', icon: Home, label: '홈' },
    { id: 'calendar', icon: Calendar, label: '캘린더' },
    { id: 'report', icon: PieChart, label: '리포트' },
    { id: 'notification', icon: Bell, label: '알림' },
    { id: 'profile', icon: User, label: 'MY' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-olivegray/20 px-6 py-4 flex justify-between items-center z-50 max-w-md mx-auto rounded-t-[24px] shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
      {navItems.map((item) => {
        const isActive = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-colors duration-200 ${isActive ? 'text-olive' : 'text-olivegray'}`}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

// --- Header ---
export const Header: React.FC<{ 
  title?: string; 
  subtitle?: string; 
  rightContent?: React.ReactNode; 
  onLogout?: () => void;
  onBack?: () => void;
}> = ({ title, subtitle, rightContent, onLogout, onBack }) => (
  <>
    {/* Sticky Brand Bar - Fixed 'Todak' */}
    <div className="sticky top-0 z-40 px-6 py-4 bg-[#F4F1EC]/95 backdrop-blur-md flex justify-between items-center transition-all border-b border-transparent">
        <div className="flex items-center gap-2">
            {onBack && (
                <button 
                    onClick={onBack} 
                    className="p-1 -ml-2 text-warmbrown/40 hover:text-olive rounded-full transition-colors"
                    aria-label="뒤로가기"
                >
                    <ChevronLeft size={28} />
                </button>
            )}
            <span className="text-3xl font-black text-olive uppercase tracking-widest font-sans drop-shadow-sm">Todak</span>
        </div>
        {onLogout && (
          <button 
            onClick={onLogout} 
            className="p-2 -mr-2 text-warmbrown/40 hover:text-softorange hover:bg-white rounded-full transition-all"
            aria-label="로그아웃"
          >
            <LogOut size={22} />
          </button>
        )}
    </div>
    
    {/* Scrollable Title Section */}
    {(title || subtitle || rightContent) && (
      <div className="px-6 pb-6 pt-2 flex items-end justify-between animate-[fadeIn_0.3s_0.1s_both]">
          <div>
              {subtitle && <p className="text-sm text-warmbrown/70 font-medium mb-1 tracking-wide">{subtitle}</p>}
              {title && <h1 className="text-2xl font-bold text-warmbrown tracking-tight leading-tight">{title}</h1>}
          </div>
          {rightContent && <div className="mb-1">{rightContent}</div>}
      </div>
    )}
  </>
);

// --- Modal Wrapper ---
export const ModalWrapper: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-warmbrown/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="bg-[#FCFCFA] rounded-[32px] w-full max-w-sm max-h-[85vh] overflow-y-auto relative z-10 shadow-[0_10px_40px_rgba(0,0,0,0.05)] animate-[slideUp_0.3s_ease-out] border border-white">
        {children}
      </div>
    </div>
  );
};
