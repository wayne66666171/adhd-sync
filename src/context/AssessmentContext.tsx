'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Responses, ImpactLevel, AssessmentRecord, CatGesture, impactLevels } from '@/types';
import { questions } from '@/data/questions';
import { diagnoseADHD, calculateSymptoms, calculateSeverity, generateSummary } from '@/lib/diagnosis';
import { addRecord, loadRecords } from '@/lib/storage';

const CAT_GESTURE_RESET_MS = 120;

interface AssessmentContextType {
  // 鐘舵€?
  currentIndex: number;
  responses: Responses;
  impactLevel: ImpactLevel | null;
  catGesture: CatGesture;
  view: 'start' | 'card' | 'impact' | 'completion';
  hasNewAssessment: boolean;
  viewingHistoryIndex: number | undefined;
  isDoctorMode: boolean;

  // 鏂规硶
  startAssessment: () => void;
  resetAssessment: () => void;
  handleSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void;
  selectImpact: (level: ImpactLevel) => void;
  setCatGesture: (gesture: CatGesture) => void;
  setViewingHistoryIndex: (index: number | undefined) => void;
  setIsDoctorMode: (mode: boolean) => void;
  setHasNewAssessment: (value: boolean) => void;
  getRecords: () => AssessmentRecord[];
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Responses>({});
  const [impactLevel, setImpactLevel] = useState<ImpactLevel | null>(null);
  const [catGesture, setCatGesture] = useState<CatGesture>('');
  const [view, setView] = useState<'start' | 'card' | 'impact' | 'completion'>('start');
  const [hasNewAssessment, setHasNewAssessment] = useState(false);
  const [viewingHistoryIndex, setViewingHistoryIndex] = useState<number | undefined>(undefined);
  const [isDoctorMode, setIsDoctorMode] = useState(false);

  const startAssessment = useCallback(() => {
    setCurrentIndex(0);
    setResponses({});
    setImpactLevel(null);
    setView('card');
  }, []);

  const resetAssessment = useCallback(() => {
    setView('start');
    setCurrentIndex(0);
    setResponses({});
    setImpactLevel(null);
  }, []);

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    // 杈圭晫妫€鏌ワ細纭繚 currentIndex 鍦ㄦ湁鏁堣寖鍥村唴
    if (currentIndex >= questions.length) return;

    const q = questions[currentIndex];
    setResponses(prev => ({ ...prev, [q.id]: direction }));

    // 鏇存柊鐚姩鐢?
    if (direction === 'left') setCatGesture('tilt-left');
    else if (direction === 'right') setCatGesture('tilt-right');
    else if (direction === 'up') setCatGesture('gesture-up');
    else if (direction === 'down') setCatGesture('gesture-down');

    if (currentIndex >= questions.length - 1) {
      setView('impact');
    } else {
      setCurrentIndex(prev => prev + 1);
    }
    // Keep cat feedback, but do not block next-card render.
    window.setTimeout(() => {
      setCatGesture('');
    }, CAT_GESTURE_RESET_MS);
  }, [currentIndex]);

  const selectImpact = useCallback((level: ImpactLevel) => {
    setImpactLevel(level);
    setView('completion');

    // 璁＄畻缁撴灉骞朵繚瀛?
    const symptoms = calculateSymptoms(responses);
    const severity = calculateSeverity(responses, impactLevels[level].value);
    const summary = generateSummary(symptoms);
    const diagnosis = diagnoseADHD(responses);

    const record: AssessmentRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      symptoms,
      severity,
      summary,
      duration: 'threeMonths',
      diagnosis,
      responses: { ...responses },
    };

    addRecord(record);
    setHasNewAssessment(true);
  }, [responses]);

  const getRecords = useCallback(() => {
    return loadRecords();
  }, []);

  return (
    <AssessmentContext.Provider
      value={{
        currentIndex,
        responses,
        impactLevel,
        catGesture,
        view,
        hasNewAssessment,
        viewingHistoryIndex,
        isDoctorMode,
        startAssessment,
        resetAssessment,
        handleSwipe,
        selectImpact,
        setCatGesture,
        setViewingHistoryIndex,
        setIsDoctorMode,
        setHasNewAssessment,
        getRecords,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error('useAssessment must be used within AssessmentProvider');
  }
  return context;
}

