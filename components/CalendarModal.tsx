import React, { useState, useEffect } from 'react';
import { Emotion, MoodRecord, EmotionId } from '../types';
import { EMOTIONS } from '../constants';
import { Button, ModalWrapper } from './Components';
import { Edit2, Trash2, X, Lock } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  moodRecord?: MoodRecord;
  onSave: (date: string, emotionIds: EmotionId[], content: string) => Promise<void>;
  onDelete: (date: string) => Promise<void>;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ 
  isOpen, onClose, selectedDate, moodRecord, onSave, onDelete 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<EmotionId[]>([]);
  const [contentText, setContentText] = useState('');

  // Determine if the record is editable (only today)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isEditable = selectedDate === todayStr;

  // Reset state when modal opens/closes or date changes
  useEffect(() => {
    if (isOpen) {
      if (moodRecord) {
        // View mode initially
        setIsEditing(false);
        setSelectedEmotionIds(moodRecord.emotionIds);
        setContentText(moodRecord.content);
      } else {
        // Create mode ONLY if editable
        if (isEditable) {
            setIsEditing(true);
            setSelectedEmotionIds([]);
            setContentText('');
        } else {
            setIsEditing(false); // Read-only empty state
        }
      }
    }
  }, [isOpen, moodRecord, selectedDate, isEditable]);

  const toggleEmotion = (id: EmotionId) => {
    if (selectedEmotionIds.includes(id)) {
      setSelectedEmotionIds(prev => prev.filter(e => e !== id));
    } else {
      if (selectedEmotionIds.length < 3) {
        setSelectedEmotionIds(prev => [...prev, id]);
      } else {
        // Optional: Alert user that max is 3
        // alert("감정은 최대 3개까지 선택할 수 있어요.");
      }
    }
  };

  const handleSave = async () => {
    if (selectedEmotionIds.length > 0) {
      await onSave(selectedDate, selectedEmotionIds, contentText);
      onClose();
    }
  };

  const handleDelete = async () => {
    if (window.confirm('정말 이 기록을 지울까요?')) {
      await onDelete(selectedDate);
      onClose();
    }
  };

  // --- RENDER LOGIC ---

  // Case 1: Past date with NO record -> Show Empty State
  if (!moodRecord && !isEditable && !isEditing) {
      return (
        <ModalWrapper isOpen={isOpen} onClose={onClose}>
            <div className="p-8 text-center space-y-6">
                <div className="flex justify-between items-center">
                    <div className="text-left">
                        <span className="text-sm text-olive font-medium block mb-1">
                            {selectedDate.split('-')[0]}년 {selectedDate.split('-')[1]}월
                        </span>
                        <h3 className="text-xl font-bold text-warmbrown">{selectedDate.split('-')[2]}일의 마음</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-beige rounded-full hover:bg-olivegray/30 text-warmbrown/60 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="py-12 flex flex-col items-center gap-4 text-warmbrown/40">
                    <div className="w-16 h-16 bg-beige rounded-full flex items-center justify-center text-2xl grayscale opacity-50">
                        📭
                    </div>
                    <div>
                        <p className="font-medium text-warmbrown/60">기록된 마음이 없어요</p>
                        <p className="text-xs mt-1">지난 날짜에는 기록을 남길 수 없어요</p>
                    </div>
                </div>
            </div>
        </ModalWrapper>
      );
  }

  // Case 2: Record exists or Today (Create/Edit/View)
  const recordEmotions = moodRecord 
    ? moodRecord.emotionIds.map(id => EMOTIONS.find(e => e.id === id)).filter(Boolean) as Emotion[]
    : [];
  
  // Primary color for background in view mode (use the first emotion's color)
  const primaryColorClass = recordEmotions.length > 0 ? recordEmotions[0].colorClass : 'bg-gray-100';

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <span className="text-sm text-olive font-medium block mb-1">
                {selectedDate.split('-')[0]}년 {selectedDate.split('-')[1]}월
            </span>
            <h3 className="text-xl font-bold text-warmbrown">{selectedDate.split('-')[2]}일의 마음</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-beige rounded-full hover:bg-olivegray/30 text-warmbrown/60 transition-colors">
            <X size={20} />
          </button>
        </div>

        {isEditing ? (
          // --- EDIT MODE ---
          <div className="space-y-8 animate-[fadeIn_0.3s]">
            <div>
              <label className="text-sm font-semibold text-warmbrown mb-4 block">
                어떤 마음들이었나요? (최대 3개)
              </label>
              <div className="grid grid-cols-4 gap-3">
                {EMOTIONS.map(emo => {
                  const isSelected = selectedEmotionIds.includes(emo.id);
                  return (
                    <button
                      key={emo.id}
                      onClick={() => toggleEmotion(emo.id)}
                      className={`aspect-square rounded-[20px] flex flex-col items-center justify-center transition-all duration-300 ${
                        isSelected 
                          ? `ring-4 ring-offset-2 ring-beige scale-110 ${emo.colorClass} shadow-md` 
                          : 'bg-white hover:bg-gray-50 border border-olivegray/20'
                      }`}
                    >
                      <span className="text-2xl mb-1 filter drop-shadow-sm">{emo.emoji}</span>
                      {isSelected && <div className="absolute top-1 right-1 w-2 h-2 bg-warmbrown rounded-full"></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-warmbrown mb-3 block">마음 기록</label>
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="오늘의 마음을 가볍게 남겨보세요."
                className="w-full h-32 p-4 bg-beige/50 rounded-2xl border-none focus:ring-2 focus:ring-olive resize-none text-warmbrown placeholder:text-warmbrown/30"
              />
            </div>

            <Button fullWidth onClick={handleSave} disabled={selectedEmotionIds.length === 0}>
              저장하기
            </Button>
          </div>
        ) : (
          // --- VIEW MODE ---
          <div className="space-y-6 animate-[fadeIn_0.3s]">
            <div className={`aspect-video rounded-[32px] flex flex-col items-center justify-center ${primaryColorClass} shadow-inner p-6`}>
              <div className="flex gap-4 mb-3">
                {recordEmotions.map((e, idx) => (
                   <span key={idx} className="text-6xl animate-float filter drop-shadow-sm" style={{animationDelay: `${idx * 0.2}s`}}>
                     {e.emoji}
                   </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                 {recordEmotions.map((e, idx) => (
                    <span key={idx} className={`text-sm font-bold ${e.textColorClass} bg-white/30 px-3 py-1 rounded-full backdrop-blur-sm`}>
                        {e.label}
                    </span>
                 ))}
              </div>
            </div>

            <div className="bg-beige p-6 rounded-[24px] min-h-[100px] border border-white">
              <p className="text-warmbrown leading-relaxed whitespace-pre-wrap">
                {moodRecord?.content || "기록된 내용이 없어요."}
              </p>
            </div>

            {/* Action Buttons (Only for Editable Dates) */}
            {isEditable ? (
                <div className="flex gap-3 pt-2">
                    <Button variant="secondary" className="flex-1 flex items-center justify-center gap-2" onClick={() => setIsEditing(true)}>
                        <Edit2 size={16} /> 수정
                    </Button>
                    <Button variant="danger" className="flex-1 flex items-center justify-center gap-2" onClick={handleDelete}>
                        <Trash2 size={16} /> 삭제
                    </Button>
                </div>
            ) : (
                <div className="pt-2 text-center">
                    <p className="text-xs text-warmbrown/40 flex items-center justify-center gap-1.5 bg-beige/50 py-2 rounded-full">
                        <Lock size={12} /> 지난 기록은 수정할 수 없어요
                    </p>
                </div>
            )}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};