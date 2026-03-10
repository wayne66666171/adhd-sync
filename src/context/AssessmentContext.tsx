'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Responses, ImpactLevel, AssessmentRecord, CatGesture, impactLevels } from '@/types';
import { questions } from '@/data/questions';
import {
  diagnoseADHD,
  calculateSymptoms,
  calculateSeverity,
  generateSummary,
  QUICK_SCREENING_QUESTION_COUNT,
} from '@/lib/diagnosis';
import { addRecord, loadRecords } from '@/lib/storage';

const CAT_GESTURE_RESET_MS = 120;
const quickQuestionIds = new Set(
  questions.slice(0, QUICK_SCREENING_QUESTION_COUNT).map((question) => question.id),
);

type AssessmentView = 'start' | 'card' | 'quickResult' | 'impact' | 'extraNotes' | 'selectProvince' | 'completion';

interface AssessmentContextType {
  // 鐘舵€?
  currentIndex: number;
  responses: Responses;
  impactLevel: ImpactLevel | null;
  extraNotes: string;
  selectedProvince: string | null;
  catGesture: CatGesture;
  view: AssessmentView;
  hasNewAssessment: boolean;
  viewingHistoryIndex: number | undefined;
  isDoctorMode: boolean;

  // 鏂规硶
  startAssessment: () => void;
  resetAssessment: () => void;
  handleSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void;
  enterQuickResult: () => void;
  evaluateNowWithCurrentAnswers: () => void;
  continueAssessment: () => void;
  selectImpact: (level: ImpactLevel) => void;
  updateExtraNotes: (notes: string) => void;
  goToSelectProvince: () => void;
  handleProvinceSelect: (province: string) => void;
  handleProvinceSkip: () => void;
  submitExtraNotes: () => void;
  skipExtraNotes: () => void;
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
  const [extraNotes, setExtraNotes] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [catGesture, setCatGesture] = useState<CatGesture>('');
  const [view, setView] = useState<AssessmentView>('start');
  const [hasNewAssessment, setHasNewAssessment] = useState(false);
  const [viewingHistoryIndex, setViewingHistoryIndex] = useState<number | undefined>(undefined);
  const [isDoctorMode, setIsDoctorMode] = useState(false);

  const startAssessment = useCallback(() => {
    setCurrentIndex(0);
    setResponses({});
    setImpactLevel(null);
    setExtraNotes('');
    setSelectedProvince(null);
    setView('card');
  }, []);

  const resetAssessment = useCallback(() => {
    setView('start');
    setCurrentIndex(0);
    setResponses({});
    setImpactLevel(null);
    setExtraNotes('');
    setSelectedProvince(null);
  }, []);

  const enterQuickResult = useCallback(() => {
    setView((prev) => (prev === 'card' ? 'quickResult' : prev));
  }, []);

  const evaluateNowWithCurrentAnswers = useCallback(() => {
    setResponses((prev) => {
      const quickResponses: Responses = {};
      Object.entries(prev).forEach(([questionId, answer]) => {
        if (quickQuestionIds.has(Number(questionId))) {
          quickResponses[Number(questionId)] = answer;
        }
      });
      return quickResponses;
    });
    setView('impact');
  }, []);

  const continueAssessment = useCallback(() => {
    setView('card');
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
    setView('extraNotes');
  }, []);

  const finalizeAssessment = useCallback((notes?: string, province?: string | null) => {
    if (!impactLevel) return;

    const normalizedNotes = notes?.trim();

    // 璁＄畻缁撴灉骞朵繚瀛?
    const symptoms = calculateSymptoms(responses);
    const severity = calculateSeverity(responses, impactLevels[impactLevel].value);
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
      extraNotes: normalizedNotes || undefined,
      selectedProvince: province ?? undefined,
    };

    addRecord(record);
    setHasNewAssessment(true);
    setView('completion');
  }, [impactLevel, responses]);

  const goToSelectProvince = useCallback(() => {
    setView('selectProvince');
  }, []);

  const handleProvinceSelect = useCallback((province: string) => {
    setSelectedProvince(province);
    finalizeAssessment(extraNotes, province);
  }, [extraNotes, finalizeAssessment]);

  const handleProvinceSkip = useCallback(() => {
    setSelectedProvince(null);
    finalizeAssessment(extraNotes, undefined);
  }, [extraNotes, finalizeAssessment]);

  const updateExtraNotes = useCallback((notes: string) => {
    setExtraNotes(notes);
  }, []);

  const submitExtraNotes = useCallback(() => {
    goToSelectProvince();
  }, [goToSelectProvince]);

  const skipExtraNotes = useCallback(() => {
    setExtraNotes('');
    goToSelectProvince();
  }, [goToSelectProvince]);

  const getRecords = useCallback(() => {
    return loadRecords();
  }, []);

  return (
    <AssessmentContext.Provider
      value={{
        currentIndex,
        responses,
        impactLevel,
        extraNotes,
        selectedProvince,
        catGesture,
        view,
        hasNewAssessment,
        viewingHistoryIndex,
        isDoctorMode,
        startAssessment,
        resetAssessment,
        handleSwipe,
        enterQuickResult,
        evaluateNowWithCurrentAnswers,
        continueAssessment,
        selectImpact,
        updateExtraNotes,
        goToSelectProvince,
        handleProvinceSelect,
        handleProvinceSkip,
        submitExtraNotes,
        skipExtraNotes,
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

