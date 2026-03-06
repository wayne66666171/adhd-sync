'use client';

interface SnakeProgressProps {
  currentIndex: number;
  total: number;
}

export default function SnakeProgress({ currentIndex, total }: SnakeProgressProps) {
  // 蛇头位置（百分比），从5%开始，最大到95%
  const headPosition = 5 + (currentIndex / total) * 90;

  // 果实位置和状态
  const fruits = [
    { question: 15, position: 5 + (15 / total) * 90, size: 6, eaten: currentIndex >= 15 },
    { question: 30, position: 5 + (30 / total) * 90, size: 8, eaten: currentIndex >= 30 },
    { question: 45, position: 5 + (45 / total) * 90, size: 10, eaten: currentIndex >= 45 },
  ];

  // 蛇身长度：基础4节，每吃一个果实+2节
  const eatenCount = fruits.filter(f => f.eaten).length;
  const bodyLength = 4 + eatenCount * 2;

  // 每节身体的间距
  const segmentGap = 2.5;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '20px',
      marginBottom: '2px',
    }}>
      {/* 果实 */}
      {fruits.map((fruit, index) => !fruit.eaten && (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${fruit.position}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${fruit.size}px`,
            height: `${fruit.size}px`,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4), inset 0 -2px 4px rgba(0,0,0,0.1)',
            animation: 'pulse 1.5s ease-in-out infinite',
            zIndex: 5,
          }}
        >
          {/* 果实高光 */}
          <div style={{
            position: 'absolute',
            top: '15%',
            left: '20%',
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
          }} />
        </div>
      ))}

      {/* 蛇身体 */}
      {Array.from({ length: bodyLength }).map((_, i) => {
        const segmentPos = headPosition - (i + 1) * segmentGap;
        if (segmentPos < 0) return null;

        // 身体从头到尾逐渐变小变淡
        const scale = 1 - i * 0.06;
        const opacity = 1 - i * 0.08;
        const size = Math.max(4, 8 * scale);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${segmentPos}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              background: i % 2 === 0 ? '#0f766e' : '#14b8a6',
              opacity: opacity,
              transition: 'left 0.25s ease-out',
              zIndex: 10 - i,
            }}
          />
        );
      })}

      {/* 蛇头 */}
      <div
        style={{
          position: 'absolute',
          left: `${headPosition}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '14px',
          height: '10px',
          borderRadius: '60% 80% 80% 60%',
          background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
          boxShadow: '0 2px 4px rgba(15, 118, 110, 0.3)',
          transition: 'left 0.25s ease-out',
          zIndex: 20,
        }}
      >
        {/* 眼睛 */}
        <div style={{
          position: 'absolute',
          top: '2px',
          right: '3px',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: 'white',
        }}>
          <div style={{
            position: 'absolute',
            top: '1px',
            right: '0.5px',
            width: '2px',
            height: '2px',
            borderRadius: '50%',
            background: '#1e293b',
          }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}
