'use client';

import { CatGesture } from '@/types';

interface CatProps {
  gesture: CatGesture;
  position: 'left' | 'right';
}

export default function Cat({ gesture, position }: CatProps) {
  return (
    <div className={`cat-container ${position}`}>
      <div className={`cat ${gesture}`}>
        <div className="cat-head">
          <div className="cat-ear left"></div>
          <div className="cat-ear right"></div>
          <div className="cat-eyes">
            <div className="cat-eye"></div>
            <div className="cat-eye"></div>
          </div>
          <div className="cat-cheeks">
            <div className="cat-cheek"></div>
            <div className="cat-cheek"></div>
          </div>
          <div className="cat-mouth"></div>
        </div>
        <div className="cat-body"></div>
        <div className="cat-paw left"></div>
        <div className="cat-paw right"></div>
      </div>
    </div>
  );
}
