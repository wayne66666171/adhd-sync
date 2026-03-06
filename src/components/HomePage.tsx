'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessment } from '@/context/AssessmentContext';
import Cat from '@/components/Cat';
import StartView from '@/components/assessment/StartView';
import CardStack from '@/components/assessment/CardStack';
import ImpactPicker from '@/components/assessment/ImpactPicker';
import CompletionView from '@/components/assessment/CompletionView';
import { SwipeDirection, CatGesture } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const {
    currentIndex,
    view,
    catGesture,
    startAssessment,
    handleSwipe,
    selectImpact,
    setCatGesture,
  } = useAssessment();

  const [localCatGesture, setLocalCatGesture] = useState<CatGesture>('');

  const onDragging = (direction: SwipeDirection | null) => {
    if (direction === 'left') setLocalCatGesture('tilt-left');
    else if (direction === 'right') setLocalCatGesture('tilt-right');
    else if (direction === 'up') setLocalCatGesture('gesture-up');
    else if (direction === 'down') setLocalCatGesture('gesture-down');
    else setLocalCatGesture('');
  };

  // 完成后跳转到摘要页
  useEffect(() => {
    if (view === 'completion') {
      const timer = setTimeout(() => {
        router.push('/summary');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [view, router]);

  const effectiveGesture = localCatGesture || catGesture;

  return (
    <>
      <Cat gesture={effectiveGesture} position="left" />
      <Cat gesture={effectiveGesture} position="right" />

      <div className="container">
        {view === 'start' && <StartView onStart={startAssessment} />}

        {view === 'card' && (
          <CardStack
            currentIndex={currentIndex}
            onSwipe={handleSwipe}
            onDragging={onDragging}
          />
        )}

        {view === 'impact' && <ImpactPicker onSelect={selectImpact} />}

        {view === 'completion' && <CompletionView />}
      </div>
    </>
  );
}
