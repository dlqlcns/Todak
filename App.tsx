import React, { useState, useEffect, useMemo } from 'react';
import { User, MoodRecord, ScreenName, EmotionId, Recommendation } from './types';
import { EMOTIONS, AI_EMPATHY_MESSAGES } from './constants';
import { generateEmpathyMessage, generateWeeklyReview, generateMonthlyReview, generateMediaRecommendations } from './services/aiService';
import { Card, Button, BottomNav, Header, ModalWrapper } from './components/Components';
import { CalendarModal } from './components/CalendarModal';
import { login, signup, fetchMoods, saveMood, deleteMood, fetchReminder, saveReminder, checkIdAvailability } from './services/api';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, LabelList
} from 'recharts';
import { ChevronDown, ChevronLeft, ChevronRight, Play, BookOpen, Music, LogOut, Loader2, Sparkles, CloudSun, Calendar as CalendarIcon, Check, ExternalLink } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays, startOfMonth, endOfMonth, getDay, addMonths, subMonths, addWeeks, subWeeks, getWeekOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

// --- Screens ---

// 1. Onboarding / Login (Updated with Landing -> Login/Signup Flow)
const LoginScreen: React.FC<{ onLogin: (user: User, isNew: boolean) => void }> = ({ onLogin }) => {
  const [view, setView] = useState<'landing' | 'login' | 'signup'>('landing');
  const [formData, setFormData] = useState({ id: '', password: '', confirmPassword: '', nickname: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [idCheckStatus, setIdCheckStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');
  const [idCheckMessage, setIdCheckMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async () => {
    const { id, password, confirmPassword, nickname } = formData;

    if (!id || !password) {
        setError('아이디와 비밀번호를 모두 입력해주세요.');
        return;
    }

    if (isSignup && idCheckStatus === 'duplicate') {
        setError('이미 존재하는 아이디입니다');
        return;
    }

    if (isSignup && password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
    }

    try {
        setIsSubmitting(true);
        if (view === 'login') {
            const loggedIn = await login(id, password);
            onLogin(loggedIn, false);
        } else {
            if (!nickname) {
                setError('닉네임을 입력해주세요.');
                return;
            }
            if (password !== confirmPassword) {
                setError('비밀번호가 일치하지 않습니다.');
                return;
            }
            const newUser = await signup(id, password, nickname);
            onLogin(newUser, true);
        }
    } catch (e: any) {
        const message = e?.message || '';
        if (view === 'login') {
            if (message.includes('존재하지 않는 아이디') || message.includes('비밀번호가 올바르지 않아요.')) {
                setError('아이디 또는 비밀번호를 확인하세요');
            } else {
                setError(message || '로그인 처리 중 오류가 발생했어요.');
            }
        } else {
            if (message.includes('이미 사용 중인 아이디')) {
                setError('이미 존재하는 아이디입니다');
            } else {
                setError(message || '회원가입 처리 중 오류가 발생했어요.');
            }
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (view !== 'signup') {
        setIdCheckStatus('idle');
        setIdCheckMessage('');
        return;
    }

    const trimmedId = formData.id.trim();
    if (!trimmedId) {
        setIdCheckStatus('idle');
        setIdCheckMessage('');
        return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
        try {
            setIdCheckStatus('checking');
            const available = await checkIdAvailability(trimmedId);
            if (cancelled) return;
            if (available) {
                setIdCheckStatus('available');
                setIdCheckMessage('사용 가능한 아이디입니다.');
            } else {
                setIdCheckStatus('duplicate');
                setIdCheckMessage('이미 존재하는 아이디입니다');
            }
        } catch (e) {
            if (cancelled) return;
            setIdCheckStatus('idle');
            setIdCheckMessage('아이디 중복 확인 중 오류가 발생했어요.');
        }
    }, 300);

    return () => {
        cancelled = true;
        clearTimeout(timer);
    };
  }, [formData.id, view]);

  const Background = () => (
    <>
      <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-peach rounded-full blur-[80px] opacity-60"></div>
      <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-mint rounded-full blur-[80px] opacity-60"></div>
    </>
  );

  // Landing View
  if (view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col p-8 bg-beige justify-center items-center relative overflow-hidden">
        <Background />
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-[fadeIn_0.5s]">
          <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center text-5xl mb-6 shadow-[0_15px_35px_rgba(242,164,109,0.25)] animate-float">
              🌱
          </div>
          <h1 className="text-3xl font-bold text-warmbrown mb-2 font-sans tracking-tight">마음, 토닥</h1>
          <p className="text-warmbrown/60 mb-12 text-center">당신의 하루를 따뜻하게 안아줄게요</p>
          
          <div className="w-full space-y-4">
              <Button fullWidth onClick={() => setView('login')} className="bg-olive text-white shadow-lg shadow-olive/20 py-4 text-lg hover:scale-[1.02] transition-transform">
                로그인
              </Button>
              <Button fullWidth variant="secondary" onClick={() => setView('signup')} className="bg-white border-none shadow-md text-warmbrown hover:bg-gray-50 py-4 text-lg hover:scale-[1.02] transition-transform">
                회원가입
              </Button>
          </div>
  
        </div>
      </div>
    );
  }

  // Login or Signup Form View
  const isSignup = view === 'signup';

  return (
    <div className="min-h-screen flex flex-col p-8 bg-beige justify-center items-center relative overflow-hidden">
        <Background />
        <div className="relative z-10 w-full max-w-sm">
            <button 
                onClick={() => { setView('landing'); setError(''); setFormData({id:'', password:'', confirmPassword:'', nickname:''}); }}
                className="mb-8 w-10 h-10 rounded-full bg-white/50 hover:bg-white flex items-center justify-center text-warmbrown/60 hover:text-warmbrown transition-colors shadow-sm"
            >
                <ChevronLeft size={24} />
            </button>

            <h2 className="text-3xl font-bold text-warmbrown mb-2 animate-[slideUp_0.3s]">
                {isSignup ? '반가워요!' : '다시 오셨군요!'}
            </h2>
            <p className="text-warmbrown/60 mb-8 animate-[slideUp_0.3s_0.1s_both]">
                {isSignup ? '당신의 이야기를 들려줄 준비가 되었나요?' : '오늘 하루는 어땠나요?'}
            </p>

            <div className="space-y-4 animate-[slideUp_0.4s_0.2s_both]">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-warmbrown/60 ml-1">아이디</label>
                    <input
                        name="id"
                        type="text"
                        placeholder="아이디를 입력해주세요"
                        value={formData.id}
                        onChange={handleChange}
                        className="w-full bg-white/60 px-5 py-4 rounded-2xl text-warmbrown placeholder:text-warmbrown/30 focus:outline-none focus:ring-2 focus:ring-olive/50 transition-all border border-transparent focus:bg-white"
                    />
                    {isSignup && formData.id && idCheckStatus !== 'idle' && (
                        <p className={`text-xs ml-1 ${idCheckStatus === 'duplicate' ? 'text-softorange' : 'text-olive'}`}>
                            {idCheckMessage}
                        </p>
                    )}
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-warmbrown/60 ml-1">비밀번호</label>
                    <input
                        name="password"
                        type="password"
                        placeholder="비밀번호를 입력해주세요"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full bg-white/60 px-5 py-4 rounded-2xl text-warmbrown placeholder:text-warmbrown/30 focus:outline-none focus:ring-2 focus:ring-olive/50 transition-all border border-transparent focus:bg-white"
                    />
                </div>

            {isSignup && (
                <div className="space-y-2 animate-[fadeIn_0.3s]">
                    <label className="text-xs font-bold text-warmbrown/60 ml-1">비밀번호 확인</label>
                    <input
                        name="confirmPassword"
                        type="password"
                        placeholder="비밀번호를 다시 입력해주세요"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full bg-white/60 px-5 py-4 rounded-2xl text-warmbrown placeholder:text-warmbrown/30 focus:outline-none focus:ring-2 focus:ring-olive/50 transition-all border border-transparent focus:bg-white"
                    />
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-softorange text-xs ml-1">비밀번호가 일치하지 않습니다.</p>
                    )}
                </div>
            )}

                {isSignup && (
                    <div className="space-y-2 animate-[fadeIn_0.3s]">
                        <label className="text-xs font-bold text-warmbrown/60 ml-1">닉네임</label>
                        <input 
                            name="nickname"
                            type="text" 
                            placeholder="토닥이가 불러줄 이름이에요" 
                            value={formData.nickname}
                            onChange={handleChange}
                            className="w-full bg-white/60 px-5 py-4 rounded-2xl text-warmbrown placeholder:text-warmbrown/30 focus:outline-none focus:ring-2 focus:ring-olive/50 transition-all border border-transparent focus:bg-white"
                        />
                    </div>
                )}
            </div>

            {error && <p className="text-softorange text-sm mt-4 font-medium animate-pulse flex items-center gap-1">⚠️ {error}</p>}

            <Button fullWidth onClick={handleSubmit} className="mt-10 shadow-xl shadow-olive/20 py-4 text-lg hover:scale-[1.02] transition-transform">
                {isSignup ? '가입 완료' : '로그인'}
            </Button>
        </div>
    </div>
  );
};

// 2. Onboarding Slide (Splash Modal)
const OnboardingScreen: React.FC<{ name: string; onFinish: () => void }> = ({ name, onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000); 
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="absolute inset-0 z-[60] bg-olive text-white p-10 flex flex-col justify-center items-center text-center overflow-hidden animate-[fadeIn_0.5s]">
        <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-warmyellow rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-96 h-96 bg-softorange rounded-full blur-[100px] opacity-30"></div>
        
        <div className="z-10 animate-[slideUp_0.8s] space-y-8">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
                <span className="text-peach">{name}</span>님,<br/>
                오늘 당신의 마음은<br/>어떤 색인가요?
            </h2>
            <p className="text-white/80 text-lg leading-relaxed font-light">
                기쁨도 슬픔도 모두 소중해요.<br/>
                토닥이가 곁에서<br/>
                당신의 이야기를 들어줄게요. 🌿
            </p>
        </div>
    </div>
  );
};

// 3. Service Guide Overlay (Coach Mark)
const ServiceGuideOverlay: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
    const [doNotShow, setDoNotShow] = useState(false);

    const handleDismiss = () => {
        if (doNotShow) {
            localStorage.setItem('todak_guide_seen', 'true');
        }
        onDismiss();
    };

    return (
        <div 
            onClick={handleDismiss}
            className="fixed inset-0 z-[100] max-w-md mx-auto cursor-pointer touch-none"
        >
            {/* SVG Mask Background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                <defs>
                    <mask id="guide-mask">
                        <rect width="100%" height="100%" fill="white" />
                        
                        {/* 1. Emotion Grid Cutout (Top) - y=182, height=190 (emotion grid height) */}
                        <rect x="14" y="220" width="calc(100% - 28px)" height="340" rx="24" fill="black" />
                        
                        {/* 2. Report Tab Cutout (Bottom Center) - left-39% aligned */}
                        <rect x="calc(50% - 28px)" y="calc(100% - 66px)" width="56" height="56" rx="20" fill="black" />
                        
                        {/* 3. MY Tab Cutout (Bottom Right) - Shifted right (x=calc(100% - 63px)) */}
                        <rect x="calc(100% - 63px)" y="calc(100% - 66px)" width="56" height="56" rx="20" fill="black" />
                    </mask>
                </defs>
                {/* The dark overlay with holes */}
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#guide-mask)" />
            </svg>

            <div className="relative w-full h-full pointer-events-none">
                {/* 1. Emotion Grid Arrow (Top Center) - top-[14%] */}
                <div className="absolute top-[14%] left-[38.5%] -translate-x-1/2 w-max flex flex-col items-center gap-2 animate-bounce">
                    <div className="text-white text-lg font-bold text-center drop-shadow-md leading-relaxed whitespace-nowrap">
                        오늘의 기분을<br/>선택해보세요
                    </div>
                    {/* Down Arrow */}
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M19 12l-7 7-7-7"/>
                    </svg>
                </div>

                {/* 2. Report Tab Arrow (Bottom Center) */}
                <div className="absolute bottom-[75px] left-1/2 -translate-x-1/2 w-max flex flex-col items-center gap-2">
                     <div className="text-white text-sm font-bold text-center drop-shadow-md leading-relaxed whitespace-nowrap">
                        주간, 월간 회고를<br/>확인할 수 있어요
                    </div>
                     {/* Down Arrow */}
                     <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M19 12l-7 7-7-7"/>
                    </svg>
                </div>

                {/* 3. MY Tab Arrow (Bottom Right) - Adjusted to right-2 */}
                <div className="absolute bottom-[75px] right-2 flex flex-col items-end gap-2 pr-1">
                     <div className="text-white text-sm font-bold text-right drop-shadow-md leading-relaxed whitespace-nowrap">
                        나의 감정 기록<br/>통계를 알 수 있어요
                     </div>
                     {/* Down Arrow */}
                     <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                         <path d="M12 5v14M19 12l-7 7-7-7"/>
                    </svg>
                </div>

                {/* Top Right: Do Not Show Again - In header area */}
                <div 
                    className="absolute top-5 right-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md cursor-pointer pointer-events-auto"
                    onClick={(e) => {
                        e.stopPropagation();
                        setDoNotShow(!doNotShow);
                    }} 
                >
                    <button 
                        className={`w-4 h-4 rounded border border-white flex items-center justify-center transition-colors ${doNotShow ? 'bg-white text-black' : 'bg-transparent'}`}
                    >
                        {doNotShow && <Check size={12} strokeWidth={3} />}
                    </button>
                    <span className="text-white text-xs font-medium">
                        다시 보지 않기
                    </span>
                </div>

                {/* Bottom: Touch to start - Moved under emotion grid */}
                <div className="absolute top-[570px] w-full flex justify-center">
                    <span className="text-white/50 text-xs animate-pulse">
                        화면을 터치하면 시작합니다
                    </span>
                </div>
            </div>
        </div>
    );
};

// 4. Home Screen
const HomeScreen: React.FC<{
  user: User;
  todayMood?: MoodRecord;
  onSaveMood: (emoIds: EmotionId[], text: string, aiMsg?: string, recs?: Recommendation[]) => Promise<void>;
  onLogout: () => void;
}> = ({ user, todayMood, onSaveMood, onLogout }) => {
  const [selectedEmos, setSelectedEmos] = useState<EmotionId[]>([]);
  const [text, setText] = useState('');
  const [showTextWarning, setShowTextWarning] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Toggle emotion selection (max 3)
  const toggleEmotion = (id: EmotionId) => {
    if (selectedEmos.includes(id)) {
        setSelectedEmos(prev => prev.filter(e => e !== id));
    } else {
        if (selectedEmos.length < 3) {
            setSelectedEmos(prev => [...prev, id]);
        }
    }
  };

  // If already recorded today
  if (todayMood) {
    const primaryEmo = EMOTIONS.find(e => e.id === todayMood.emotionIds[0])!;
    const allRecordedEmos = todayMood.emotionIds.map(id => EMOTIONS.find(e => e.id === id)).filter(Boolean);
    
    // Use stored recommendations or fallback to mock
    const displayedRecs = todayMood.recommendations && todayMood.recommendations.length > 0
        ? todayMood.recommendations
        : [];

    return (
      <div className="pb-28 space-y-6 animate-[fadeIn_0.5s_ease-out]">
        <Header 
            subtitle={`${format(new Date(), 'M월 d일 EEEE', { locale: ko })}`}
            title={`${user.nickname}님의 하루`} 
            onLogout={onLogout}
        />
        
        <div className="px-6 space-y-6">
            {/* Today's Mood Card */}
            <div className={`relative overflow-hidden rounded-[32px] p-8 ${primaryEmo.colorClass} shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-transform hover:scale-[1.01]`}>
            <div className="absolute right-[-10px] top-[-10px] text-[160px] opacity-20 pointer-events-none select-none animate-float">
                {primaryEmo.emoji}
            </div>
            <div className="relative z-10">
                <div className="flex flex-col gap-3 mb-6">
                <span className={`text-sm font-medium ${primaryEmo.textColorClass} opacity-70`}>오늘의 감정</span>
                <div className="flex items-end gap-3 flex-wrap">
                        {allRecordedEmos.map((emo, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-5xl filter drop-shadow-sm">{emo?.emoji}</span>
                                <span className={`text-2xl font-bold ${emo?.textColorClass} tracking-tight`}>{emo?.label}</span>
                            </div>
                        ))}
                </div>
                </div>
                <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                    <p className={`text-lg font-medium ${primaryEmo.textColorClass} leading-relaxed whitespace-pre-wrap`}>
                        "{todayMood.content}"
                    </p>
                </div>
            </div>
            </div>

            {/* AI Message */}
            <div className="flex gap-4 items-start animate-[slideUp_0.4s_0.1s_both]">
                <div className="w-12 h-12 rounded-full bg-white border border-olive/10 flex items-center justify-center text-2xl shrink-0 mt-1 shadow-sm">🌱</div>
                <div className="bg-white p-6 rounded-[24px] rounded-tl-none shadow-sm border border-olivegray/20 flex-1 relative">
                    <div className="absolute top-6 left-[-6px] w-3 h-3 bg-white border-l border-b border-olivegray/20 rotate-45"></div>
                    <h4 className="text-xs font-bold text-olive mb-2 uppercase tracking-wider">To. {user.nickname}</h4>
                    <p className="text-warmbrown leading-relaxed text-[15px]">
                        {todayMood.aiMessage || AI_EMPATHY_MESSAGES[todayMood.emotionIds[0]] || AI_EMPATHY_MESSAGES.default}
                    </p>
                </div>
            </div>

            {/* Recommendations */}
            <div className="animate-[slideUp_0.4s_0.2s_both]">
                <h3 className="text-lg font-bold text-warmbrown mb-4 flex items-center gap-2 px-1">
                    <Sparkles size={18} className="text-softorange" />
                    마음 처방전
                </h3>
                <div className="space-y-3">
                    {displayedRecs.map((rec, i) => (
                        <Card 
                            key={rec.id || i} 
                            onClick={() => rec.link && window.open(rec.link, '_blank')}
                            className={`flex items-center gap-5 transition-colors border border-transparent hover:border-olive/20 !p-5 ${rec.link ? 'hover:bg-white/80 cursor-pointer group' : 'cursor-default'}`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-warmbrown/80 shrink-0 ${
                                rec.type === 'music' ? 'bg-blue-50' : rec.type === 'video' ? 'bg-red-50' : 'bg-green-50'
                            }`}>
                                {rec.type === 'music' && <Music size={22} className="text-blue-400" />}
                                {rec.type === 'video' && <Play size={22} className="text-red-400" />}
                                {rec.type === 'activity' && <BookOpen size={22} className="text-green-500" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h4 className="font-bold text-warmbrown text-[16px]">{rec.title}</h4>
                                    {rec.link && <ExternalLink size={14} className="text-warmbrown/30 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </div>
                                <p className="text-sm text-warmbrown/60">{rec.desc}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (selectedEmos.length === 0) return;

    if (!text.trim()) {
        setShowTextWarning(true);
        return;
    }
    setIsLoadingAi(true);
    
    // 1. Generate real AI message
    const msgPromise = generateEmpathyMessage(selectedEmos, text);

    // 2. Generate Media Recommendations
    const emotionLabels = selectedEmos.map(id => EMOTIONS.find(e => e.id === id)?.label).join(', ');
    const recsPromise = generateMediaRecommendations(emotionLabels, text);

    const [msg, mediaRecs] = await Promise.all([msgPromise, recsPromise]);

    // Combine Recommendations
    const finalRecs: Recommendation[] = [
        {
            id: 'gen-music',
            type: 'music',
            title: mediaRecs.music.title,
            desc: mediaRecs.music.reason,
            link: `https://open.spotify.com/search/${encodeURIComponent(mediaRecs.music.searchQuery)}`
        },
        {
            id: 'gen-video',
            type: 'video',
            title: mediaRecs.video.title,
            desc: mediaRecs.video.reason,
            link: `https://www.youtube.com/results?search_query=${encodeURIComponent(mediaRecs.video.searchQuery)}`
        },
        {
            id: 'gen-activity',
            type: 'activity',
            title: mediaRecs.activity.title,
            desc: mediaRecs.activity.reason
        }
    ];

    await onSaveMood(selectedEmos, text, msg, finalRecs);
    setIsLoadingAi(false);
  };

  if (isLoadingAi) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-beige p-6 text-center">
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center text-6xl mb-8 animate-bounce shadow-xl shadow-olive/10">
                🌱
              </div>
              <h2 className="text-2xl font-bold text-warmbrown mb-3 tracking-tight">마음을 헤아리고 있어요</h2>
              <p className="text-warmbrown/60">당신에게 꼭 필요한 위로와 추천을 준비 중이에요.</p>
          </div>
      )
  }

  return (
    <div className="pb-28 space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <Header 
        subtitle="오늘 하루,"
        title="마음의 색을 골라주세요" 
        onLogout={onLogout}
      />

      <div className="px-6 space-y-8">
        {/* Emotion Grid */}
        <div>
            <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-warmbrown/60">최대 3개까지 선택할 수 있어요</span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-5">
                {EMOTIONS.map((emo) => {
                    const isSelected = selectedEmos.includes(emo.id);
                    return (
                        <button
                            key={emo.id}
                            onClick={() => toggleEmotion(emo.id)}
                            className={`aspect-square rounded-[24px] flex flex-col items-center justify-center transition-all duration-300 relative ${
                                isSelected 
                                ? `ring-4 ring-offset-2 ring-beige scale-105 ${emo.colorClass} shadow-lg shadow-black/5` 
                                : 'bg-white shadow-sm border border-olivegray/10 hover:bg-gray-50'
                            }`}
                        >
                            <span className="text-3xl mb-2 filter drop-shadow-sm">{emo.emoji}</span>
                            <span className="text-xs font-semibold text-warmbrown/60">{emo.label}</span>
                            {isSelected && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-warmbrown/80" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>

        {/* Input Area (Always Visible) */}
        <div className="animate-[slideUp_0.4s_ease-out]">
                <h3 className="text-lg font-bold text-warmbrown mb-4 pl-1">한 줄 기록</h3>
                <textarea
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (showTextWarning && e.target.value.trim()) {
                            setShowTextWarning(false);
                        }
                    }}
                    maxLength={200}
                    placeholder="오늘 어떤 일이 있었나요? 편하게 적어주세요."
                    className="w-full h-40 p-6 bg-white rounded-[24px] border border-olivegray/20 focus:ring-2 focus:ring-olive focus:border-transparent resize-none mb-2 text-warmbrown placeholder:text-warmbrown/30 shadow-sm"
                />
                {showTextWarning && !text.trim() && (
                    <p className="text-softorange text-sm mb-4">한 줄 기록을 작성해주세요.</p>
                )}
                <Button fullWidth onClick={handleSubmit} disabled={selectedEmos.length === 0} className="py-5 text-lg shadow-xl shadow-olive/20">
                    기록 완료하기
                </Button>
        </div>
      </div>
    </div>
  );
};

// 5. Calendar Screen
const CalendarScreen: React.FC<{ 
    moods: Record<string, MoodRecord>;
    onDateClick: (date: string) => void;
    onLogout: () => void;
    onBack: () => void;
}> = ({ moods, onDateClick, onLogout, onBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(monthStart),
        end: endOfWeek(endOfMonth(currentDate))
    });

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Calculate monthly record count
    const currentMonthPrefix = format(currentDate, 'yyyy-MM');
    const monthlyRecordCount = Object.keys(moods).filter(key => key.startsWith(currentMonthPrefix)).length;

    const monthNavigator = (
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-olivegray/20">
            <button onClick={handlePrevMonth} className="p-1 text-warmbrown/40 hover:text-olive"><ChevronLeft size={18}/></button>
            <span className="font-bold text-warmbrown text-xs min-w-[60px] text-center">{format(currentDate, 'yyyy. MM')}</span>
            <button onClick={handleNextMonth} className="p-1 text-warmbrown/40 hover:text-olive"><ChevronRight size={18}/></button>
        </div>
    );

    return (
        <div className="pb-28 min-h-screen">
             <Header 
                title="마음 달력" 
                subtitle={`이번 달은 ${monthlyRecordCount}번 기록했어요`}
                rightContent={monthNavigator} 
                onLogout={onLogout}
                onBack={onBack}
             />

            <div className="px-6">
                {/* Calendar Grid */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-olivegray/10 mt-4">
                    <div className="grid grid-cols-7 mb-6">
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                            <div key={day} className={`text-center text-xs font-bold ${i===0 ? 'text-softorange' : 'text-warmbrown/40'}`}>
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-6">
                        {daysInMonth.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const record = moods[dateStr];
                            const isCurrentMonth = format(day, 'M') === format(currentDate, 'M');
                            // Use the first emotion to display in calendar
                            const emo = record && record.emotionIds.length > 0 
                                ? EMOTIONS.find(e => e.id === record.emotionIds[0]) 
                                : null;
                            const isToday = isSameDay(day, new Date());
                            const hasMultiple = record && record.emotionIds.length > 1;

                            return (
                                <div 
                                    key={dateStr} 
                                    onClick={() => onDateClick(dateStr)}
                                    className={`flex flex-col items-center justify-start min-h-[50px] cursor-pointer relative group ${!isCurrentMonth ? 'opacity-20' : ''}`}
                                >
                                    <span className={`text-[10px] mb-2 w-6 h-6 flex items-center justify-center rounded-full font-medium transition-colors ${isToday ? 'bg-olive text-white' : 'text-warmbrown/60 group-hover:bg-beige'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {emo ? (
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${emo.colorClass} shadow-sm transition-transform group-hover:scale-110 ring-2 ring-white relative`}>
                                            {emo.emoji}
                                            {hasMultiple && (
                                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center border border-olivegray/20">
                                                    <span className="text-[8px] font-bold text-warmbrown">+</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center group">
                                            <div className="w-1.5 h-1.5 bg-olivegray/30 rounded-full group-hover:bg-olive/40 transition-colors"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-warmbrown/40 text-xs bg-white/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                    오늘의 색으로 채워가는 한 달
                    </p>
                </div>
            </div>
        </div>
    );
};

// 6. Report Screen
const ReportScreen: React.FC<{ 
    moods: Record<string, MoodRecord>;
    weeklyReview: string | null;
    monthlyReview: string | null;
    onGenerateWeeklyReview: (review: string | null) => void;
    onGenerateMonthlyReview: (review: string | null) => void;
    onDateClick: (date: string) => void;
    onLogout: () => void;
    onBack: () => void;
}> = ({ moods, weeklyReview, monthlyReview, onGenerateWeeklyReview, onGenerateMonthlyReview, onDateClick, onLogout, onBack }) => {
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
    const [baseDate, setBaseDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    // --- Date Navigation ---
    const handlePrev = () => {
        setBaseDate(prev => viewMode === 'weekly' ? subWeeks(prev, 1) : subMonths(prev, 1));
        // Reset review when changing period to force regeneration or clear state
        if (viewMode === 'weekly') onGenerateWeeklyReview(null);
        else onGenerateMonthlyReview(null);
    };

    const handleNext = () => {
        setBaseDate(prev => viewMode === 'weekly' ? addWeeks(prev, 1) : addMonths(prev, 1));
        if (viewMode === 'weekly') onGenerateWeeklyReview(null);
        else onGenerateMonthlyReview(null);
    };

    const periodLabel = viewMode === 'weekly' 
        ? `${format(baseDate, 'M월', { locale: ko })} ${getWeekOfMonth(baseDate, { weekStartsOn: 0 })}주차`
        : format(baseDate, 'yyyy. MM');

    const periodNavigator = (
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-olivegray/20">
            <button onClick={handlePrev} className="p-1 text-warmbrown/40 hover:text-olive"><ChevronLeft size={18}/></button>
            <span className="font-bold text-warmbrown text-xs min-w-[60px] text-center">{periodLabel}</span>
            <button onClick={handleNext} className="p-1 text-warmbrown/40 hover:text-olive"><ChevronRight size={18}/></button>
        </div>
    );

    // --- Data Preparation ---
    const daysToShow = useMemo(() => {
        if (viewMode === 'weekly') {
            const startCurrentWeek = startOfWeek(baseDate, { weekStartsOn: 0 }); // Sunday
            const endCurrentWeek = endOfWeek(baseDate, { weekStartsOn: 0 }); // Saturday
            return eachDayOfInterval({ start: startCurrentWeek, end: endCurrentWeek });
        } else {
            const startCurrentMonth = startOfMonth(baseDate);
            const endCurrentMonth = endOfMonth(baseDate);
            return eachDayOfInterval({ start: startCurrentMonth, end: endCurrentMonth });
        }
    }, [viewMode, baseDate]);

    // We need real hex values for Recharts
    const getHexFromClass = (cls: string) => {
        const match = cls.match(/bg-\[(#[0-9A-Fa-f]{6})\]/);
        return match ? match[1] : '#E5E7EB';
    };

    const chartData = daysToShow.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = moods[dateStr];
        const emotionIds = record ? record.emotionIds : [];
        const count = emotionIds.length;
        
        // Split value into segments (total sum = 1)
        const segmentValue = count > 0 ? 1 / count : 0;
        
        const emo1 = count > 0 ? EMOTIONS.find(e => e.id === emotionIds[0]) : null;
        const emo2 = count > 1 ? EMOTIONS.find(e => e.id === emotionIds[1]) : null;
        const emo3 = count > 2 ? EMOTIONS.find(e => e.id === emotionIds[2]) : null;

        return {
            name: viewMode === 'weekly' ? format(day, 'E', { locale: ko }) : format(day, 'd'), // Day name vs Date number
            fullDate: dateStr, // Added full date for click handler
            hasValue: !!record,
            // Stacked values
            s1: segmentValue,
            c1: emo1 ? getHexFromClass(emo1.colorClass) : '#f3f4f6',
            s2: count > 1 ? segmentValue : 0,
            c2: emo2 ? getHexFromClass(emo2.colorClass) : 'transparent',
            s3: count > 2 ? segmentValue : 0,
            c3: emo3 ? getHexFromClass(emo3.colorClass) : 'transparent',
            
            // Tooltip data
            emoji: emotionIds.map(id => EMOTIONS.find(e => e.id === id)?.emoji).join(' '),
            hasMultiple: count > 1
        };
    });

    const hasData = chartData.some(d => d.hasValue);

    // --- AI Generation Logic ---
    useEffect(() => {
        const fetchReview = async () => {
            const records = daysToShow.map(d => moods[format(d, 'yyyy-MM-dd')]).filter(Boolean);
            const currentReview = viewMode === 'weekly' ? weeklyReview : monthlyReview;

            // Only generate if we have data AND don't have a review for this session yet
            if (hasData && !currentReview && !isLoading) {
                setIsLoading(true);
                if (viewMode === 'weekly') {
                    const review = await generateWeeklyReview(records);
                    onGenerateWeeklyReview(review);
                } else {
                    const review = await generateMonthlyReview(records);
                    onGenerateMonthlyReview(review);
                }
                setIsLoading(false);
            }
        };
        fetchReview();
    }, [viewMode, hasData, daysToShow, weeklyReview, monthlyReview]); // Dependencies updated

    const currentReview = viewMode === 'weekly' ? weeklyReview : monthlyReview;
    const reviewTitle = viewMode === 'weekly' ? "AI 주간 회고" : "AI 월간 회고";

    return (
        <div className="pb-28 space-y-6">
            <Header title="리포트" subtitle="마음의 흐름" rightContent={periodNavigator} onLogout={onLogout} onBack={onBack} />
            
            <div className="px-6 space-y-6">
                {/* View Mode Toggle */}
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-olivegray/10">
                    <button 
                        onClick={() => {
                            setViewMode('weekly');
                            setBaseDate(new Date()); // Reset to today when switching mode for UX
                            onGenerateWeeklyReview(null); // Clear previous logic
                        }}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                            viewMode === 'weekly' 
                            ? 'bg-olive text-white shadow-md' 
                            : 'text-warmbrown/40 hover:bg-beige/50'
                        }`}
                    >
                        주간
                    </button>
                    <button 
                         onClick={() => {
                             setViewMode('monthly');
                             setBaseDate(new Date());
                             onGenerateMonthlyReview(null);
                         }}
                         className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                            viewMode === 'monthly' 
                            ? 'bg-olive text-white shadow-md' 
                            : 'text-warmbrown/40 hover:bg-beige/50'
                        }`}
                    >
                        월간
                    </button>
                </div>

                {/* Chart - Reduced height to h-44 */}
                <Card className="h-44 pt-8 border-transparent shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-center relative overflow-hidden">
                    {!hasData ? (
                        <div className="flex flex-col items-center justify-center text-center opacity-60">
                            <div className="w-16 h-16 bg-beige rounded-full flex items-center justify-center text-3xl mb-3 animate-float">
                                🎨
                            </div>
                            <p className="text-warmbrown font-medium">기록이 없어요.</p>
                            <p className="text-xs text-warmbrown/60 mt-1">이 기간의 마음은 비어있네요.</p>
                        </div>
                    ) : (
                        // Conditional rendering: Scrollable for Monthly with wide min-width
                        <div className={`w-full h-full ${viewMode === 'monthly' ? 'overflow-x-auto' : ''}`}>
                             <div className={`${viewMode === 'monthly' ? 'min-w-[1000px] pr-4' : 'w-full'} h-full`}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={chartData} 
                                        margin={{top: 20, right: 15, left: 15, bottom: 10}}
                                        onClick={(state: any) => {
                                            // Fix: Type cast state to any to access activePayload which is missing in Recharts types
                                            if (state && state.activePayload && state.activePayload.length > 0) {
                                                const clickedDate = state.activePayload[0].payload.fullDate;
                                                onDateClick(clickedDate);
                                            }
                                        }}
                                        barCategoryGap={viewMode === 'monthly' ? 8 : 8}
                                    >
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fill: '#7B5B3E', fontSize: 11, fontWeight: 500}} 
                                            dy={10}
                                            interval={0}
                                            padding={{ left: 10, right: 10 }}
                                        />
                                        <Tooltip 
                                            cursor={{fill: 'transparent'}} 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    if (!data.hasValue) return null;
                                                    return (
                                                        <div className="bg-white px-4 py-3 shadow-xl rounded-2xl border border-olive/10 flex items-center gap-2 animate-[fadeIn_0.2s] whitespace-nowrap">
                                                            <span className="text-xs text-warmbrown/60 mr-1">{data.fullDate}</span>
                                                            <span className="text-xl">{data.emoji}</span>
                                                            {data.hasMultiple && <span className="text-[10px] text-warmbrown/50 font-bold bg-beige px-1.5 py-0.5 rounded-full">Mixed</span>}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }} 
                                        />
                                        {/* Stacked Bars as Separated Rounded Squares */}
                                        <Bar dataKey="s1" stackId="a" radius={[8, 8, 8, 8]} barSize={viewMode === 'monthly' ? 20 : 24} stroke="#ffffff" strokeWidth={viewMode === 'monthly' ? 2 : 4} isAnimationActive={true} cursor="pointer" background={{ fill: '#f3f4f6', radius: 8 }}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-s1-${index}`} fill={entry.hasValue ? entry.c1 : 'transparent'} />
                                            ))}
                                        </Bar>
                                        <Bar dataKey="s2" stackId="a" radius={[8, 8, 8, 8]} barSize={viewMode === 'monthly' ? 20 : 24} stroke="#ffffff" strokeWidth={viewMode === 'monthly' ? 2 : 4} isAnimationActive={true} cursor="pointer">
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-s2-${index}`} fill={entry.c2} />
                                            ))}
                                        </Bar>
                                        <Bar dataKey="s3" stackId="a" radius={[8, 8, 8, 8]} barSize={viewMode === 'monthly' ? 20 : 24} stroke="#ffffff" strokeWidth={viewMode === 'monthly' ? 2 : 4} isAnimationActive={true} cursor="pointer">
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-s3-${index}`} fill={entry.c3} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                             </div>
                        </div>
                    )}
                </Card>

                {/* AI Review */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-olivegray/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-warmyellow rounded-bl-full opacity-20"></div>
                    <h3 className="text-lg font-bold text-warmbrown mb-4 flex items-center gap-2 relative z-10">
                        <CloudSun size={20} className="text-olive" /> {reviewTitle}
                    </h3>
                    {isLoading ? (
                        <div className="flex items-center gap-3 text-warmbrown/50 py-6">
                            <Loader2 className="animate-spin text-olive" size={24} />
                            <span className="text-sm font-medium">지난 시간을 돌아보고 있어요...</span>
                        </div>
                    ) : (
                        <p className="text-warmbrown/80 leading-relaxed text-[15px] whitespace-pre-wrap relative z-10">
                            {hasData ? (currentReview || "당신의 이야기가 궁금해요. 기록을 남겨주세요!") : "이 기간의 기록이 없어 편지를 쓸 수 없어요. ☁️"}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// 7. Notification Screen
const NotificationScreen: React.FC<{
    userId: number;
    onLogout: () => void;
    onBack: () => void;
}> = ({ userId, onLogout, onBack }) => {
    const [reminderTime, setReminderTime] = useState('22:00');
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const loadReminder = async () => {
            try {
                const savedTime = await fetchReminder(userId);
                if (mounted && savedTime) {
                    setReminderTime(savedTime.slice(0, 5));
                }
            } catch (err) {
                console.error(err);
                if (mounted) {
                    setError('알림 설정을 불러오지 못했어요.');
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        loadReminder();
        return () => {
            mounted = false;
        };
    }, [userId]);

    const handleSave = async () => {
        if (!reminderTime) {
            setError('알림 시간을 선택해주세요.');
            return;
        }

        setIsSaving(true);
        setError('');
        setStatusMessage('');
        try {
            const saved = await saveReminder(userId, reminderTime);
            setReminderTime(saved);
            setStatusMessage('알림 설정이 완료되었어요.');
        } catch (err) {
            console.error(err);
            setError('알림 설정 저장에 실패했어요.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="pb-28">
            <Header title="알림 설정" onLogout={onLogout} onBack={onBack} />
            <div className="px-6">
                <Card className="mt-4 space-y-6">
                    <div>
                        <h3 className="font-bold text-warmbrown mb-3">매일 마음 기록 알림</h3>
                        <div className="flex gap-3">
                            <input
                                type="time"
                                value={reminderTime}
                                disabled={isLoading}
                                onChange={(e) => setReminderTime(e.target.value)}
                                className="flex-1 p-4 bg-beige rounded-2xl border-none font-mono text-lg text-warmbrown"
                            />
                            <Button className="px-6" onClick={handleSave} disabled={isSaving || isLoading}>
                                {isSaving ? '저장 중...' : '저장'}
                            </Button>
                        </div>
                        <p className="text-xs text-warmbrown/50 mt-3 pl-1">설정한 시간에 다정한 알림을 보내드릴게요.</p>
                        {statusMessage && <p className="text-sm text-olive mt-2 font-semibold">{statusMessage}</p>}
                        {error && <p className="text-sm text-softorange mt-2">{error}</p>}
                    </div>

                    <div className="pt-6 border-t border-olivegray/10">
                        <h4 className="text-sm font-bold text-warmbrown/80 mb-4">알림 메시지 미리보기</h4>
                        <div className="space-y-3">
                            {["오늘 하루는 어떤 색이었나요? 🎨", "잠들기 전, 마음을 토닥여주세요 🌙", "당신의 이야기를 들려주세요 📒"].map((msg, i) => (
                                <div key={i} className="bg-beige/50 p-4 rounded-2xl text-sm text-warmbrown/80 flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-softorange shrink-0"></span>
                                    {msg}
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// 8. Profile Screen
const ProfileScreen: React.FC<{ 
    user: User; 
    moods: Record<string, MoodRecord>;
    onLogout: () => void;
    onBack: () => void;
    openDeleteModal: () => void;
}> = ({ user, moods, onLogout, onBack, openDeleteModal }) => {
    const [statPeriod, setStatPeriod] = useState<string>('all');
    const totalDays = Object.keys(moods).length;

    // Get Available Months for Filter
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        Object.keys(moods).forEach(date => {
            months.add(date.substring(0, 7)); // 'YYYY-MM'
        });
        return Array.from(months).sort().reverse();
    }, [moods]);

    // Filter Moods based on selection
    const filteredMoods = useMemo(() => {
        const allMoods = Object.values(moods) as MoodRecord[];
        if (statPeriod === 'all') return allMoods;
        return allMoods.filter(m => m.date.startsWith(statPeriod));
    }, [moods, statPeriod]);
    
    const filteredCount = filteredMoods.length;

    const currentStreak = useMemo(() => {
        const recordedDates = new Set(Object.keys(moods));
        if (recordedDates.size === 0) return 0;

        let streak = 0;
        let cursor = new Date();

        while (true) {
            const key = format(cursor, 'yyyy-MM-dd');
            if (recordedDates.has(key)) {
                streak += 1;
                cursor = subDays(cursor, 1);
            } else {
                break;
            }
        }

        return streak;
    }, [moods]);

    // Calculate all emotion counts based on FILTERED moods
    const emoCounts = filteredMoods.reduce((acc: Record<string, number>, curr: MoodRecord) => {
        curr.emotionIds.forEach(id => {
            acc[id] = (acc[id] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>);

    // Create a sorted list of all emotions with their counts
    const sortedEmotions = [...EMOTIONS]
        .map(emo => ({ ...emo, count: emoCounts[emo.id] || 0 }))
        .sort((a, b) => b.count - a.count);

    // Find max count for progress bar calculation
    const maxCount = sortedEmotions[0]?.count || 1;

    return (
        <div className="space-y-6 pb-28">
            <Header title="마이 페이지" onLogout={onLogout} onBack={onBack} />
            <div className="px-6 space-y-6">
                <div className="flex items-center gap-5 mb-2 bg-white p-6 rounded-[32px] shadow-sm border border-olivegray/10">
                    <div className="w-20 h-20 bg-beige rounded-full flex items-center justify-center text-warmbrown text-3xl font-bold border border-olive/10">
                        {user.nickname[0]}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-warmbrown mb-1">{user.nickname}</h2>
                        <p className="text-olive font-medium text-sm bg-olive/10 px-3 py-1 rounded-full inline-block">함께한 지 {totalDays + 1}일째</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-5 rounded-[24px] text-center shadow-sm border border-olivegray/10 flex flex-col justify-center">
                        <div className="text-2xl font-bold text-warmbrown transition-all">{filteredCount}</div>
                        <div className="text-[11px] text-warmbrown/50 mt-1 font-medium">
                            {statPeriod === 'all' ? '총 기록' : '선택 기간 기록'}
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] text-center shadow-sm border border-olivegray/10 flex flex-col justify-center">
                        <div className="text-2xl font-bold text-softorange">{currentStreak}</div>
                        <div className="text-[11px] text-warmbrown/50 mt-1 font-medium">연속 기록 🔥</div>
                    </div>
                </div>

                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-olivegray/10">
                    <div className="flex justify-between items-center mb-4 pl-1">
                        <h3 className="font-bold text-warmbrown">내 감정 팔레트</h3>
                        <div className="relative">
                            <select
                                value={statPeriod}
                                onChange={(e) => setStatPeriod(e.target.value)}
                                className="appearance-none bg-beige/50 border border-transparent hover:bg-beige pl-3 pr-8 py-1.5 rounded-xl text-xs font-bold text-olive focus:outline-none focus:ring-2 focus:ring-olive/20 transition-all cursor-pointer"
                            >
                                <option value="all">전체 기간</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{m.split('-')[0]}년 {m.split('-')[1]}월</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-olive pointer-events-none" />
                        </div>
                    </div>

                    {filteredCount > 0 ? (
                        <div className="space-y-4">
                            {sortedEmotions.map((emo) => {
                                return (
                                    <div key={emo.id} className={`flex items-center gap-4 transition-opacity ${emo.count === 0 ? 'opacity-40' : 'opacity-100'}`}>
                                        <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center text-xl shrink-0 ${emo.colorClass} shadow-sm`}>
                                            {emo.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-end mb-1.5">
                                                <span className="text-sm font-semibold text-warmbrown/80">{emo.label}</span>
                                                <span className="text-xs font-bold text-olive">{emo.count}회</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-beige rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full opacity-80 transition-all duration-500 ${emo.colorClass}`}
                                                    style={{ width: `${(emo.count / maxCount) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="py-10 text-center text-warmbrown/40">
                            <p className="text-sm">해당 기간의 기록이 없어요 ☁️</p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[24px] p-2 shadow-sm border border-olivegray/10">
                    <div className="space-y-1">
                        <button className="w-full text-left py-4 px-4 hover:bg-beige rounded-xl transition-colors text-sm text-warmbrown/80 font-medium">
                            공지사항
                        </button>
                        <button className="w-full text-left py-4 px-4 hover:bg-beige rounded-xl transition-colors text-sm text-warmbrown/80 font-medium">
                            문의하기
                        </button>
                        <button className="w-full text-left py-4 px-4 hover:bg-beige rounded-xl transition-colors text-sm text-warmbrown/80 font-medium">
                            개인정보 처리방침
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <Button variant="ghost" fullWidth className="flex justify-center gap-2 text-warmbrown/40 hover:bg-warmbrown/5" onClick={onLogout}>
                        <LogOut size={16} /> 로그아웃
                    </Button>
                    <div className="text-center">
                        <button onClick={openDeleteModal} className="text-xs text-warmbrown/30 hover:text-softorange underline decoration-1 underline-offset-2 transition-colors py-2">
                            회원 탈퇴
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isNewSignup, setIsNewSignup] = useState(false);
  const [currentTab, setCurrentTab] = useState<ScreenName>('home');
  const [moods, setMoods] = useState<Record<string, MoodRecord>>({});
  const [weeklyReview, setWeeklyReview] = useState<string | null>(null);
  const [monthlyReview, setMonthlyReview] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState('');
  
  // --- Shared Modal State ---
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Restore User Session
  useEffect(() => {
    const savedUser = localStorage.getItem('todak_current_user');
    if (savedUser) {
        setUser(JSON.parse(savedUser));
        setShowOnboarding(false); // Skip onboarding on auto-login
        setIsNewSignup(false);
        setShowGuide(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
        if (!user) return;
        setIsLoadingData(true);
        setLoadError('');
        try {
            const fetched = await fetchMoods(user.id);
            setMoods(fetched);
        } catch (e: any) {
            setLoadError(e?.message || '기록을 불러오지 못했어요.');
        } finally {
            setIsLoadingData(false);
        }
    };
    load();
  }, [user]);

  const handleLogin = (userObj: User, isNew: boolean) => {
    setUser(userObj);
    setIsNewSignup(isNew);
    localStorage.setItem('todak_current_user', JSON.stringify(userObj));
    setShowOnboarding(isNew);
    if (isNew) {
        localStorage.removeItem('todak_guide_seen');
        setShowGuide(true);
    } else {
        localStorage.setItem('todak_guide_seen', 'true');
        setShowGuide(false);
    }
  };

  const handleFinishOnboarding = () => {
    setShowOnboarding(false);
    setShowGuide(isNewSignup);
    if (!isNewSignup) {
        localStorage.setItem('todak_guide_seen', 'true');
    }
  };

  const handleSaveMood = async (dateStr: string, emoIds: EmotionId[], text: string, aiMsg?: string, recs?: Recommendation[]) => {
    if (!user) return;
    const saved = await saveMood(user.id, dateStr, emoIds, text, aiMsg, recs);
    setMoods(prev => ({ ...prev, [dateStr]: saved }));
    if (isSameDay(new Date(dateStr), new Date())) {
        setWeeklyReview(null);
        setMonthlyReview(null);
    }
  };

  const handleSaveTodayMood = async (emoIds: EmotionId[], text: string, aiMsg?: string, recs?: Recommendation[]) => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      await handleSaveMood(todayStr, emoIds, text, aiMsg, recs);
  };

  const handleDeleteMood = async (dateStr: string) => {
      const record = moods[dateStr];
      if (record) {
          await deleteMood(record.id);
      }
      setMoods(prev => {
          const newMoods = { ...prev };
          delete newMoods[dateStr];
          return newMoods;
      });
      setWeeklyReview(null);
      setMonthlyReview(null);
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('todak_current_user');
      setCurrentTab('home'); // Reset tab
      setShowGuide(false);
      setIsNewSignup(false);
  };

  const openDeleteModal = () => setIsDeleteModalOpen(true);
  const closeDeleteModal = () => setIsDeleteModalOpen(false);

  const confirmDeleteAccount = () => {
      setUser(null);
      localStorage.removeItem('todak_current_user');
      setMoods({});
      setWeeklyReview(null);
      setMonthlyReview(null);
      setCurrentTab('home');
      setShowGuide(false);
      setIsNewSignup(false);
      setIsDeleteModalOpen(false);
      localStorage.removeItem('todak_guide_seen'); // Optional: Reset guide on account delete
  }

  // Shared modal handler
  const handleOpenModal = (dateStr: string) => {
      setModalDate(dateStr);
      setIsModalOpen(true);
  };

  // Back handler
  const handleBack = () => {
    setCurrentTab('home');
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-beige text-warmbrown">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin" />
          <p className="text-sm">기록을 불러오고 있어요...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-beige text-center px-6 text-warmbrown">
        <p className="font-bold mb-2">데이터를 불러오지 못했어요.</p>
        <p className="text-sm text-warmbrown/70 mb-4">{loadError}</p>
        <Button onClick={() => setUser(null)}>다시 로그인하기</Button>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentTab) {
      case 'home':
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return <HomeScreen user={user} todayMood={moods[todayStr]} onSaveMood={handleSaveTodayMood} onLogout={handleLogout} />;
      case 'calendar':
        return <CalendarScreen moods={moods} onDateClick={handleOpenModal} onLogout={handleLogout} onBack={handleBack} />;
      case 'report':
        return (
            <ReportScreen 
                moods={moods} 
                weeklyReview={weeklyReview} 
                monthlyReview={monthlyReview}
                onGenerateWeeklyReview={setWeeklyReview}
                onGenerateMonthlyReview={setMonthlyReview}
                onDateClick={handleOpenModal} 
                onLogout={handleLogout} 
                onBack={handleBack} 
            />
        );
      case 'notification':
        return <NotificationScreen userId={user.id} onLogout={handleLogout} onBack={handleBack} />;
      case 'profile':
        return (
            <ProfileScreen 
                user={user} 
                moods={moods} 
                onLogout={handleLogout} 
                onBack={handleBack} 
                openDeleteModal={openDeleteModal} 
            />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F4F1EC] shadow-2xl relative overflow-hidden font-sans text-warmbrown">
        {showOnboarding && <OnboardingScreen name={user.nickname} onFinish={handleFinishOnboarding} />}

        {!showOnboarding && (
          <>
            {/* Main Content Area */}
            <div className="h-full overflow-y-auto no-scrollbar bg-[#F4F1EC] pb-24">
                {renderScreen()}
            </div>
            
            {/* Bottom Nav */}
            <BottomNav current={currentTab} onNavigate={setCurrentTab} />
            
            {/* Coach Mark Overlay */}
            {showGuide && <ServiceGuideOverlay onDismiss={() => setShowGuide(false)} />}

            {/* Global Modal - Calendar/Report Details */}
            {modalDate && (
                <CalendarModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    selectedDate={modalDate}
                    moodRecord={moods[modalDate]}
                    onSave={handleSaveMood}
                    onDelete={handleDeleteMood}
                />
            )}

            {/* Delete Account Confirmation Modal */}
            <ModalWrapper isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
                <div className="p-8 text-center space-y-6">
                     <div className="w-16 h-16 bg-beige rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm">
                        🥺
                     </div>
                     <div>
                        <h3 className="text-xl font-bold text-warmbrown mb-2 leading-snug">
                            내일도 당신의<br/>감정을 듣고 싶어요
                        </h3>
                        <p className="text-sm text-warmbrown/60">
                            정말 탈퇴하시겠습니까?
                        </p>
                     </div>
                     <div className="flex gap-3 pt-2">
                        <Button variant="secondary" fullWidth onClick={closeDeleteModal}>
                            아니오
                        </Button>
                        <Button variant="danger" fullWidth onClick={confirmDeleteAccount}>
                            예
                        </Button>
                     </div>
                </div>
            </ModalWrapper>
          </>
        )}
    </div>
  );
};

export default App;
