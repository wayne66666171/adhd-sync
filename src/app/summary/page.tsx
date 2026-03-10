'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessment } from '@/context/AssessmentContext';
import AIAnalysisView from '@/components/assessment/AIAnalysisView';
import { loadRecords, getDoctorMode, setDoctorMode as saveDoctorMode } from '@/lib/storage';
import { callAIStream, buildAIPrompt, getSystemPrompt } from '@/lib/ai';
import { questions } from '@/data/questions';
import { getDoctorsByProvince } from '@/data/doctors';
import { AssessmentRecord, Responses } from '@/types';

export default function SummaryPage() {
  const router = useRouter();
  const { hasNewAssessment, viewingHistoryIndex, setViewingHistoryIndex, responses: contextResponses } = useAssessment();
  const [isDoctorMode, setIsDoctorMode] = useState(false);
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [aiContent, setAiContent] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const [doctorView, setDoctorView] = useState<'menu' | 'nearby' | 'memo'>('menu');
  const [hoveredDoctorCard, setHoveredDoctorCard] = useState<'nearby' | 'memo' | null>(null);
  const [pressedDoctorCard, setPressedDoctorCard] = useState<'nearby' | 'memo' | null>(null);
  const hasAutoTriggeredAIRef = useRef(false);

  // ADHD 趣味小知识
  const adhdFacts = [
    { emoji: '🧠', text: 'ADHD 不是缺乏注意力，而是注意力调节困难——对感兴趣的事可以"超级专注"' },
    { emoji: '🎸', text: '很多名人都有 ADHD：迈克尔·菲尔普斯、贾斯汀·汀布莱克、西蒙娜·拜尔斯...' },
    { emoji: '💡', text: 'ADHD 大脑的多巴胺系统不同，所以我们总在寻找"刺激"来激活自己' },
    { emoji: '🦋', text: '"对无聊过敏"可能是 ADHD 最精准的民间定义' },
    { emoji: '🚀', text: 'ADHD 的人往往更有创造力，因为大脑习惯在不同想法间跳跃' },
    { emoji: '⏰', text: 'ADHD 有"时间盲"特点：5分钟和50分钟感觉差不多' },
    { emoji: '🎮', text: '打游戏能专注≠没有ADHD，游戏提供的即时反馈正好弥补了多巴胺缺口' },
    { emoji: '🌙', text: '很多 ADHD 成年人是"夜猫子"，晚上反而更能集中注意力' },
    { emoji: '📱', text: 'ADHD 的"分心"其实是注意力被新奇事物自动吸引，不是故意的' },
    { emoji: '🏃', text: '运动是 ADHD 的"天然药物"，能显著提升多巴胺和去甲肾上腺素水平' },
    { emoji: '🎯', text: 'ADHD 的人在危机时刻反而特别冷静——肾上腺素帮我们"上线"了' },
    { emoji: '💪', text: '被确诊 ADHD 不是给自己贴标签，而是终于拿到了说明书' },
  ];

  useEffect(() => {
    setRecords(loadRecords());
    setIsDoctorMode(getDoctorMode());
  }, []);

  // 轮播小知识
  useEffect(() => {
    if (!aiLoading) return;
    const timer = setInterval(() => {
      setFactIndex(prev => (prev + 1) % adhdFacts.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [aiLoading, adhdFacts.length]);

  const historyIndex = viewingHistoryIndex !== undefined ? viewingHistoryIndex : 0;
  const record = records[historyIndex];
  const responses = record?.responses || contextResponses;
  const doctorsInSelectedProvince = useMemo(() => {
    if (!record?.selectedProvince) return [];
    return getDoctorsByProvince(record.selectedProvince);
  }, [record?.selectedProvince]);

  const handleModeChange = (mode: boolean) => {
    setIsDoctorMode(mode);
    if (mode) setDoctorView('menu');
    saveDoctorMode(mode);
  };

  const handleDoctorCardClick = (view: 'nearby' | 'memo') => {
    setPressedDoctorCard(view);
    setTimeout(() => {
      setPressedDoctorCard(null);
      setDoctorView(view);
    }, 100);
  };

  const handleBack = () => {
    setViewingHistoryIndex(undefined);
    router.push('/history');
  };

  const generateAIAnalysis = useCallback(async () => {
    if (!record) return;
    setAiLoading(true);
    setAiContent('');

    const prompt = buildAIPrompt(record, responses, isDoctorMode);
    const systemPrompt = getSystemPrompt(isDoctorMode);

    const result = await callAIStream(prompt, systemPrompt, (chunk) => {
      setAiContent(prev => prev + chunk);
    });

    if (result.error) {
      setAiContent(`⚠️ ${result.error}`);
    }
    setAiLoading(false);
  }, [record, responses, isDoctorMode]);

  useEffect(() => {
    if (isDoctorMode) return;
    if (hasAutoTriggeredAIRef.current) return;
    if (!record || !responses) return;
    if (Object.keys(responses).length === 0) return;

    hasAutoTriggeredAIRef.current = true;
    void generateAIAnalysis();
  }, [record, responses, isDoctorMode, generateAIAnalysis]);

  // 定义维度分数类型
  type DimScoresType = {
    '注意缺陷': number;
    '多动冲动': number;
    '执行功能': number;
    '发育史回溯': number;
    '功能损害': number;
  };

  type RadarScoresType = {
    attention: number;
    hyperactive: number;
    executive: number;
    development: number;
    impairment: number;
  };

  // 计算各维度数据
  const { categoryScores, dimScores, radarScores, top3Pain, suspicionPercent } = useMemo(() => {
    const defaultDimScores: DimScoresType = {
      '注意缺陷': 0,
      '多动冲动': 0,
      '执行功能': 0,
      '发育史回溯': 0,
      '功能损害': 0
    };

    const defaultRadarScores: RadarScoresType = {
      attention: 0,
      hyperactive: 0,
      executive: 0,
      development: 0,
      impairment: 0
    };

    if (!record || !responses) {
      return { categoryScores: {}, dimScores: defaultDimScores, radarScores: defaultRadarScores, top3Pain: [], suspicionPercent: 0 };
    }

    const categoryScores: Record<string, number> = {};

    // 初始化
    questions.forEach(q => {
      if (q.category !== '影响程度') {
        categoryScores[q.category] = 0;
      }
    });

    // 统计每个问题的回答
    questions.forEach(q => {
      const response = responses[q.id];
      if (response === 'right' || response === 'up') {
        const weight = response === 'up' ? 2 : 1;
        if (q.category !== '影响程度') {
          categoryScores[q.category] = (categoryScores[q.category] || 0) + weight;
        }
      }
    });

    // 计算执行功能分数
    let execFunctionScore = 0;
    [33, 35, 43, 44].forEach(qid => {
      const r = responses[qid];
      if (r === 'up') execFunctionScore += 2;
      else if (r === 'right') execFunctionScore += 1;
    });

    // 发育史回溯分数
    const devHistoryScore = (record.diagnosis?.durationMet ? 2 : 0) +
                           (record.diagnosis?.onsetMet ? 2 : 0) +
                           Math.min(record.diagnosis?.familyHistory || 0, 4);

    const dimScores = {
      '注意缺陷': categoryScores['注意力不集中'] || 0,
      '多动冲动': categoryScores['多动-冲动'] || 0,
      '执行功能': execFunctionScore,
      '发育史回溯': devHistoryScore,
      '功能损害': record.diagnosis?.impairment || 0
    };

    const radarScores = {
      attention: (dimScores['注意缺陷'] / 18) * 100,
      hyperactive: (dimScores['多动冲动'] / 18) * 100,
      executive: (dimScores['执行功能'] / 8) * 100,
      development: (dimScores['发育史回溯'] / 8) * 100,
      impairment: (dimScores['功能损害'] / 4) * 100
    };

    // 提取TOP 3 痛点
    const painPoints: { question: string; desc?: string; category: string; weight: number }[] = [];
    questions.forEach(q => {
      const response = responses[q.id];
      if (response === 'up') {
        painPoints.push({ question: q.question, desc: q.desc, category: q.category, weight: 2 });
      } else if (response === 'right') {
        if (q.category === '注意力不集中' || q.category === '多动-冲动') {
          painPoints.push({ question: q.question, desc: q.desc, category: q.category, weight: 1 });
        }
      }
    });
    const top3Pain = painPoints.sort((a, b) => b.weight - a.weight).slice(0, 3);

    // 计算 ADHD 疑似度百分比（基于 DSM-5 诊断逻辑）
    // 1. 核心症状基础分：取两个维度中较高者为主，较低者为辅
    const inattentivePercent = (dimScores['注意缺陷'] / 18) * 100;
    const hyperactivePercent = (dimScores['多动冲动'] / 18) * 100;
    const baseScore = Math.max(inattentivePercent, hyperactivePercent) * 0.7
                    + Math.min(inattentivePercent, hyperactivePercent) * 0.3;

    // 2. DSM-5 硬性门槛：未满足则降低疑似度
    let modifier = 1.0;
    if (!record.diagnosis?.durationMet) modifier *= 0.6;   // 症状未持续6个月
    if (!record.diagnosis?.onsetMet) modifier *= 0.75;     // 非12岁前出现
    if (dimScores['功能损害'] === 0) modifier *= 0.65;     // 无功能损害

    // 3. 支撑证据加成（最多+15%）
    const execBoost = (dimScores['执行功能'] / 8) * 8;     // 执行功能，最多+8%
    const familyBoost = ((record.diagnosis?.familyHistory || 0) / 4) * 7; // 家族史，最多+7%

    const suspicionPercent = Math.min(100, Math.round(baseScore * modifier + execBoost + familyBoost));

    return { categoryScores, dimScores, radarScores, top3Pain, suspicionPercent };
  }, [record, responses]);

  // 生成雷达图
  const renderRadarChart = () => {
    const radarWidth = 280;
    const radarHeight = 280;
    const centerX = radarWidth / 2;
    const centerY = radarHeight / 2;
    const radius = 100;

    const dimensions = [
      { label: '注意缺陷', value: dimScores['注意缺陷'] || 0, max: 18 },
      { label: '多动冲动', value: dimScores['多动冲动'] || 0, max: 18 },
      { label: '执行功能', value: dimScores['执行功能'] || 0, max: 8 },
      { label: '发育史', value: dimScores['发育史回溯'] || 0, max: 8 },
      { label: '功能损害', value: dimScores['功能损害'] || 0, max: 4 }
    ];

    const maxValue = 10;
    const angleStep = (2 * Math.PI) / dimensions.length;

    const points = dimensions.map((dim, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const normalizedValue = (dim.value / dim.max) * 10;
      const value = Math.min(normalizedValue, maxValue);
      const x = centerX + Math.cos(angle) * (radius * value / maxValue);
      const y = centerY + Math.sin(angle) * (radius * value / maxValue);
      return `${x},${y}`;
    }).join(' ');

    const gridLines = [0.25, 0.5, 0.75, 1].map(r =>
      dimensions.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return `${centerX + Math.cos(angle) * (radius * r)},${centerY + Math.sin(angle) * (radius * r)}`;
      }).join(' ')
    );

    const axisLines = dimensions.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return {
        x2: centerX + Math.cos(angle) * radius,
        y2: centerY + Math.sin(angle) * radius
      };
    });

    const labels = dimensions.map((dim, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const labelX = centerX + Math.cos(angle) * (radius + 25);
      const labelY = centerY + Math.sin(angle) * (radius + 25);
      return { x: labelX, y: labelY, text: dim.label };
    });

    return (
      <svg width={radarWidth} height={radarHeight} viewBox={`0 0 ${radarWidth} ${radarHeight}`}>
        {gridLines.map((line, i) => (
          <polygon key={i} points={line} fill="none" stroke="#e2e8f0" strokeWidth="1"/>
        ))}
        {axisLines.map((line, i) => (
          <line key={i} x1={centerX} y1={centerY} x2={line.x2} y2={line.y2} stroke="#e2e8f0" strokeWidth="1"/>
        ))}
        <polygon points={points} fill="rgba(15, 118, 110, 0.24)" stroke="#0f766e" strokeWidth="2"/>
        {labels.map((label, i) => (
          <text key={i} x={label.x} y={label.y} textAnchor="middle" fill="#64748B" fontSize="12">{label.text}</text>
        ))}
      </svg>
    );
  };

  // 获取大脑画像
  const getBrainProfile = () => {
    const dims = [
      { name: '注意缺陷', score: radarScores.attention || 0, labels: ['神游天外的白日梦想家', '思绪漫游者', '走神艺术家'], emoji: '☁️' },
      { name: '多动冲动', score: radarScores.hyperactive || 0, labels: ['闪电般的多动者', '永动机本机', '坐不住星人'], emoji: '⚡' },
      { name: '执行功能', score: radarScores.executive || 0, labels: ['拖延症晚期战友', '截止日期冲刺选手', '计划永远赶不上变化'], emoji: '🐢' },
      { name: '发育史', score: radarScores.development || 0, labels: ['从小就与众不同', '童年回忆杀', '原来一直都是这样'], emoji: '👶' },
      { name: '功能损害', score: radarScores.impairment || 0, labels: ['生活被按下困难模式', '隐形的努力者', '每天都在打怪升级'], emoji: '🎮' }
    ];
    const maxDim = dims.reduce((a, b) => a.score > b.score ? a : b);
    const labelIndex = Math.floor(Math.random() * maxDim.labels.length);
    return {
      emoji: maxDim.emoji,
      label: maxDim.labels[labelIndex],
      dimName: maxDim.name,
      score: maxDim.score
    };
  };

  const brainProfile = useMemo(() => getBrainProfile(), [radarScores]);

  // 转换疑问句为陈述句
  const toStatement = (q: string) => q.replace('？', '').replace(/^你(是否|经常|的|曾经|在)/g, '').replace(/^(是否|经常)/g, '');

  // 生成就诊备忘录文本
  const generateMemoText = () => {
    if (!record || !responses) return '';

    const lines: string[] = [];
    lines.push('📋 就诊备忘录');
    lines.push('');

    // 主要症状
    lines.push('【主要症状】');
    const symptoms: string[] = [];
    questions.filter(q => q.category === '注意力不集中' || q.category === '多动-冲动').forEach(q => {
      const r = responses[q.id];
      if (r === 'up') symptoms.push(`• ${toStatement(q.question)}（严重）`);
      else if (r === 'right') symptoms.push(`• ${toStatement(q.question)}`);
    });
    lines.push(symptoms.length > 0 ? symptoms.join('\n') : '无明显症状');
    lines.push('');

    // 核心痛点
    lines.push('【核心痛点】');
    if (top3Pain.length > 0) {
      top3Pain.forEach(p => {
        lines.push(`• ${toStatement(p.question)}${p.weight === 2 ? '（严重）' : ''}`);
      });
    } else {
      lines.push('无显著痛点');
    }
    lines.push('');

    // 时间线
    lines.push('【时间线】');
    lines.push(`• 症状持续6个月以上：${record.diagnosis?.durationMet ? '是' : '否'}`);
    lines.push(`• 12岁之前出现症状：${record.diagnosis?.onsetMet ? '是' : '否'}`);
    lines.push('');

    // 功能损害
    lines.push('【功能损害】');
    const impacts: string[] = [];
    questions.filter(q => q.category === '功能损害').forEach(q => {
      const r = responses[q.id];
      if (r === 'up' || r === 'right') impacts.push(`• ${toStatement(q.question)}`);
    });
    lines.push(impacts.length > 0 ? impacts.join('\n') : '无明显功能损害');
    lines.push('');

    // 家族史
    lines.push('【家族史】');
    const family: string[] = [];
    questions.filter(q => q.category === '家族史').forEach(q => {
      const r = responses[q.id];
      let text = q.question.replace('？', '').replace(/^你的/g, '').replace('有无', '有');
      if (r === 'up' || r === 'right') family.push(`• ${text}`);
      else if (r === 'down') family.push(`• ${text}（可能）`);
    });
    lines.push(family.length > 0 ? family.join('\n') : '无相关家族史');
    lines.push('');

    // 其他情况
    lines.push('【其他相关情况】');
    const other: string[] = [];
    questions.filter(q => q.category === '排除标准' || q.category === '共病筛查').forEach(q => {
      const r = responses[q.id];
      let text = toStatement(q.question).replace('有无', '有').replace('有过', '有');
      if (r === 'up' || r === 'right') other.push(`• ${text}`);
      else if (r === 'down') other.push(`• ${text}（可能）`);
    });
    lines.push(other.length > 0 ? other.join('\n') : '无');

    if (record.extraNotes?.trim()) {
      lines.push('');
      lines.push('【患者自述补充】');
      lines.push(record.extraNotes.trim());
    }

    return lines.join('\n');
  };

  // 复制备忘录到剪贴板
  const copyMemoToClipboard = async () => {
    const text = generateMemoText();
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 没有记录时的空状态
  if (viewingHistoryIndex === undefined && !hasNewAssessment) {
    return (
      <div className="container">
        <div className="header">
          <h1>评估报告</h1>
        </div>
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 12h6M12 9v6"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <h3>完成评估后生成摘要</h3>
          <p>开始一次新的评估，完成后这里将显示详细的分析报告</p>
          <button className="empty-action" onClick={() => router.push('/')}>开始评估</button>
        </div>
      </div>
    );
  }

  if (!record || !record.diagnosis) {
    return (
      <div className="container">
        <div className="header">
          <h1>评估报告</h1>
        </div>
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 4h8l2 2v14H6V6l2-2z"/>
              <path d="M9 10h6M9 14h6"/>
            </svg>
          </div>
          <h3>暂无记录</h3>
          <p>完成评估后，您的记录将显示在这里</p>
          <button className="empty-action" onClick={() => router.push('/')}>开始首次评估</button>
        </div>
      </div>
    );
  }

  const date = new Date(record.date);
  const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="container">
      <div className="header">
        <h1>评估报告</h1>
      </div>

      <div id="a4-report" style={{ background: 'white', padding: '32px', minHeight: 'calc(100vh - 180px)', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
        {/* 头部 */}
        <div style={{ borderBottom: '3px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
          {viewingHistoryIndex !== undefined && (
            <a onClick={handleBack} style={{ display: 'inline-block', padding: '6px 14px', background: '#0f766e', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', borderRadius: '6px', marginBottom: '12px' }}>← 返回</a>
          )}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '2px' }}>ADHD 评估助手</h1>
            <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>{dateStr}</p>
          </div>
        </div>

        {/* 模式切换 */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '8px' }}>
          <div
            className="mode-switch-btn"
            onClick={() => handleModeChange(false)}
            style={{ flex: 1, padding: '12px 16px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', transition: 'all .2s', background: !isDoctorMode ? 'white' : 'transparent', boxShadow: !isDoctorMode ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
          >
            <div style={{ fontWeight: 600, color: !isDoctorMode ? '#8b5cf6' : '#64748b', fontSize: '14px' }}>💬 个人模式</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>雷达图 + AI 分析</div>
          </div>
          <div
            className="mode-switch-btn"
            onClick={() => handleModeChange(true)}
            style={{ flex: 1, padding: '12px 16px', textAlign: 'center', borderRadius: '10px', cursor: 'pointer', transition: 'all .2s', background: isDoctorMode ? 'white' : 'transparent', boxShadow: isDoctorMode ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
          >
            <div style={{ fontWeight: 600, color: isDoctorMode ? '#0f766e' : '#64748b', fontSize: '14px' }}>🩺 医生查看模式</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>就诊备忘录</div>
          </div>
        </div>

        {/* 医生模式提示 */}
        {!isDoctorMode && (
          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>👆 你的诊室嘴替</span>
          </div>
        )}

        {/* ========== 个人模式内容 ========== */}
        {!isDoctorMode && (
          <>
            {/* ADHD 疑似度 */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '2px', borderLeft: '3px solid #f59e0b', paddingLeft: '12px' }}>ADHD 疑似度</h3>
              <div style={{ padding: '24px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 16px' }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke={suspicionPercent >= 70 ? '#ef4444' : suspicionPercent >= 40 ? '#f59e0b' : '#10b981'}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${suspicionPercent * 3.14} 314`}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: suspicionPercent >= 70 ? '#ef4444' : suspicionPercent >= 40 ? '#f59e0b' : '#10b981' }}>{suspicionPercent}%</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  {suspicionPercent >= 70 ? '建议尽快就医评估' : suspicionPercent >= 40 ? '存在一定可能，建议关注' : '疑似度较低'}
                </div>
                {record?.diagnosis?.subtype && (
                  <div style={{ display: 'inline-block', marginTop: '8px', padding: '4px 12px', borderRadius: '999px', background: suspicionPercent >= 70 ? '#fee2e2' : suspicionPercent >= 40 ? '#fef3c7' : '#d1fae5', color: suspicionPercent >= 70 ? '#dc2626' : suspicionPercent >= 40 ? '#d97706' : '#059669', fontSize: '12px', fontWeight: 700 }}>
                    {record.diagnosis.subtype}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>基于五十道题的综合评估，仅供参考</div>
              </div>
            </div>

            {/* AI 分析区域 */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '2px', borderLeft: '3px solid #8b5cf6', paddingLeft: '12px' }}>🤖 AI 分析</h3>
              <div id="ai-analysis-content" style={{ padding: '20px', background: 'linear-gradient(135deg, #faf5ff 0%, #f0f9ff 100%)', borderRadius: '12px', fontSize: '14px', color: '#374151' }}>
                {aiLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '12px', color: '#64748B', fontSize: '14px' }}>AI 正在分析中...</p>
                    <p style={{ marginTop: '4px', color: '#94a3b8', fontSize: '12px' }}>只需要十秒左右，马上出炉！</p>

                    {/* 趣味小知识卡片 */}
                    <div style={{
                      marginTop: '20px',
                      padding: '16px 20px',
                      background: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      textAlign: 'left',
                      animation: 'fadeIn 0.5s ease'
                    }}>
                      <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 600, marginBottom: '8px' }}>💡 你知道吗</div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span style={{ fontSize: '28px', lineHeight: 1 }}>{adhdFacts[factIndex].emoji}</span>
                        <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>{adhdFacts[factIndex].text}</p>
                      </div>
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        {adhdFacts.map((_, i) => (
                          <span key={i} style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: i === factIndex ? '#8b5cf6' : '#e2e8f0',
                            transition: 'background 0.3s'
                          }}></span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : aiContent ? (
                  <>
                    <AIAnalysisView aiContent={aiContent} />
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                      <button onClick={generateAIAnalysis} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#64748B' }}>🔄 重新生成</button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ marginTop: '4px', fontSize: '14px', color: '#64748B' }}>AI 将在数据准备完成后自动开始分析...</p>
                    <p style={{ marginTop: '12px', fontSize: '13px', color: '#64748B' }}>AI 将根据你的回答生成个性化分析与建议</p>
                  </div>
                )}
              </div>
            </div>

            {/* 维度评估 - 雷达图 */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '2px', borderLeft: '3px solid #0f766e', paddingLeft: '12px' }}>维度评估</h3>
              <div className="radar-container" style={{ display: 'flex', justifyContent: 'center' }}>
                {renderRadarChart()}
              </div>
            </div>

            {/* 大脑画像 - 灵魂标签 */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '2px', borderLeft: '3px solid #8b5cf6', paddingLeft: '12px' }}>🧠 大脑画像</h3>
              <div className="soul-label-box" style={{ padding: '24px', background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)', borderRadius: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>{brainProfile.emoji}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#7c3aed', marginBottom: '8px' }}>{brainProfile.label}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>基于「{brainProfile.dimName}」维度 · 得分 {brainProfile.score.toFixed(0)}%</div>
              </div>
            </div>

            {/* 扎心榜单 */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '2px', borderLeft: '3px solid #ef4444', paddingLeft: '12px' }}>💔 扎心榜单</h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', paddingLeft: '15px' }}>这些瞬间，你一定感同身受</p>
              {top3Pain.length > 0 ? top3Pain.map((p, i) => (
                <div key={i} className="pain-item" style={{ padding: '14px 16px', background: p.weight === 2 ? '#fef2f2' : '#fff7ed', borderLeft: `4px solid ${p.weight === 2 ? '#ef4444' : '#f59e0b'}`, borderRadius: '0 8px 8px 0', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{i + 1}. {toStatement(p.question)}</div>
                  {p.desc && <div style={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}>{p.desc}</div>}
                </div>
              )) : (
                <p style={{ color: '#64748B', fontSize: '14px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>无显著痛点记录</p>
              )}
            </div>
          </>
        )}

        {/* ========== 医生模式内容 ========== */}
        {isDoctorMode && (
          <>
            {doctorView === 'menu' && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredDoctorCard('nearby')}
                  onMouseLeave={() => setHoveredDoctorCard(null)}
                  onMouseDown={() => setPressedDoctorCard('nearby')}
                  onMouseUp={() => setPressedDoctorCard(null)}
                  onTouchStart={() => setPressedDoctorCard('nearby')}
                  onTouchEnd={() => setPressedDoctorCard(null)}
                  onClick={() => handleDoctorCardClick('nearby')}
                  style={{
                    width: '50%',
                    aspectRatio: '1 / 1',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    padding: '20px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%)',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    boxShadow: hoveredDoctorCard === 'nearby' ? '0 14px 28px rgba(139, 92, 246, 0.32)' : '0 8px 20px rgba(139, 92, 246, 0.2)',
                    transform: pressedDoctorCard === 'nearby' ? 'scale(0.97)' : (hoveredDoctorCard === 'nearby' ? 'scale(1.04)' : 'scale(1)'),
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '40px', lineHeight: 1 }}>🗺️</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>附近ADHD医生</div>
                </button>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredDoctorCard('memo')}
                  onMouseLeave={() => setHoveredDoctorCard(null)}
                  onMouseDown={() => setPressedDoctorCard('memo')}
                  onMouseUp={() => setPressedDoctorCard(null)}
                  onTouchStart={() => setPressedDoctorCard('memo')}
                  onTouchEnd={() => setPressedDoctorCard(null)}
                  onClick={() => handleDoctorCardClick('memo')}
                  style={{
                    width: '50%',
                    aspectRatio: '1 / 1',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    padding: '20px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #38bdf8 100%)',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    boxShadow: hoveredDoctorCard === 'memo' ? '0 14px 28px rgba(59, 130, 246, 0.32)' : '0 8px 20px rgba(59, 130, 246, 0.2)',
                    transform: pressedDoctorCard === 'memo' ? 'scale(0.97)' : (hoveredDoctorCard === 'memo' ? 'scale(1.04)' : 'scale(1)'),
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '40px', lineHeight: 1 }}>📋</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>就诊备忘录</div>
                </button>
              </div>
            )}

            {doctorView === 'nearby' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                <button
                  type="button"
                  onClick={() => setDoctorView('menu')}
                  style={{ border: 'none', background: 'transparent', color: '#334155', cursor: 'pointer', padding: 0, fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}
                >
                  ← 返回
                </button>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '14px' }}>附近ADHD医生</h3>
                {record.selectedProvince ? (
                  doctorsInSelectedProvince.length > 0 ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {doctorsInSelectedProvince.map((doctor, index) => (
                        <div
                          key={`${doctor.hospital}-${doctor.department}-${index}`}
                          style={{ padding: '14px 16px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0' }}
                        >
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{doctor.hospital}</div>
                          <div style={{ marginTop: '6px', fontSize: '13px', color: '#475569' }}>{doctor.city} · {doctor.department}</div>
                          {doctor.notes && <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>{doctor.notes}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '16px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>暂无该地区社群数据</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        <a
                          href="https://www.haodf.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #0f766e', color: '#0f766e', textDecoration: 'none', fontSize: '13px', fontWeight: 600, background: '#fff' }}
                        >
                          好大夫在线
                        </a>
                        <a
                          href="https://jk.jd.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #0f766e', color: '#0f766e', textDecoration: 'none', fontSize: '13px', fontWeight: 600, background: '#fff' }}
                        >
                          京东健康
                        </a>
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px' }}>
                    完成评估时未选择省份
                  </div>
                )}
              </div>
            )}

            {doctorView === 'memo' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', fontSize: '14px', lineHeight: 1.8 }}>
                <button
                  type="button"
                  onClick={() => setDoctorView('menu')}
                  style={{ border: 'none', background: 'transparent', color: '#334155', cursor: 'pointer', padding: 0, fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}
                >
                  ← 返回
                </button>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #0f766e' }}>📋 就诊备忘录</h3>

                {/* 核心痛点 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>【核心痛点】</div>
                  <div style={{ color: '#4b5563' }}>
                    {top3Pain.length > 0 ? top3Pain.map((p, i) => (
                      <div key={i}>• {toStatement(p.question)}{p.weight === 2 ? '（严重）' : ''}</div>
                    )) : '无显著痛点'}
                  </div>
                </div>

                {/* 主要症状 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: '8px' }}>【主要症状】</div>
                  <div style={{ color: '#4b5563' }}>
                    {(() => {
                      const symptoms: string[] = [];
                      questions.filter(q => q.category === '注意力不集中' || q.category === '多动-冲动').forEach(q => {
                        const r = responses[q.id];
                        if (r === 'up') symptoms.push(`• ${toStatement(q.question)}（严重）`);
                        else if (r === 'right') symptoms.push(`• ${toStatement(q.question)}`);
                      });
                      return symptoms.length > 0 ? symptoms.map((s, i) => <div key={i}>{s}</div>) : '无明显症状';
                    })()}
                  </div>
                </div>

                {/* 时间线 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: '8px' }}>【时间线】</div>
                  <div style={{ color: '#4b5563' }}>
                    <div>• 症状持续6个月以上：{record.diagnosis.durationMet ? '是' : '否'}</div>
                    <div>• 12岁之前出现症状：{record.diagnosis.onsetMet ? '是' : '否'}</div>
                  </div>
                </div>

                {/* 功能损害 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: '8px' }}>【功能损害】</div>
                  <div style={{ color: '#4b5563' }}>
                    {(() => {
                      const impacts: string[] = [];
                      questions.filter(q => q.category === '功能损害').forEach(q => {
                        const r = responses[q.id];
                        if (r === 'up' || r === 'right') impacts.push(`• ${toStatement(q.question)}`);
                      });
                      return impacts.length > 0 ? impacts.map((s, i) => <div key={i}>{s}</div>) : '无明显功能损害';
                    })()}
                  </div>
                </div>

                {/* 家族史 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: '8px' }}>【家族史】</div>
                  <div style={{ color: '#4b5563' }}>
                    {(() => {
                      const family: string[] = [];
                      questions.filter(q => q.category === '家族史').forEach(q => {
                        const r = responses[q.id];
                        let text = q.question.replace('？', '').replace(/^你的/g, '').replace('有无', '有');
                        if (r === 'up' || r === 'right') family.push(`• ${text}`);
                        else if (r === 'down') family.push(`• ${text}（可能）`);
                      });
                      return family.length > 0 ? family.map((s, i) => <div key={i}>{s}</div>) : '无相关家族史';
                    })()}
                  </div>
                </div>

                {/* 其他情况 */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, color: '#374151', marginBottom: '8px' }}>【其他相关情况】</div>
                  <div style={{ color: '#4b5563' }}>
                    {(() => {
                      const other: string[] = [];
                      questions.filter(q => q.category === '排除标准' || q.category === '共病筛查').forEach(q => {
                        const r = responses[q.id];
                        let text = toStatement(q.question).replace('有无', '有').replace('有过', '有');
                        if (r === 'up' || r === 'right') other.push(`• ${text}`);
                        else if (r === 'down') other.push(`• ${text}（可能）`);
                      });
                      return other.length > 0 ? other.map((s, i) => <div key={i}>{s}</div>) : '无';
                    })()}
                  </div>
                </div>

                {record.extraNotes?.trim() && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#374151', marginBottom: '8px' }}>【患者自述补充】</div>
                    <div style={{ color: '#4b5563', whiteSpace: 'pre-wrap' }}>{record.extraNotes.trim()}</div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="action-buttons" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={copyMemoToClipboard} style={{ padding: '8px 16px', background: copySuccess ? '#10b981' : '#0f766e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s' }}>
                    {copySuccess ? '✓ 已复制' : '📋 复制文本'}
                  </button>
                  <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>🖨️ 打印 PDF</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* 底部提示 */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '24px' }}>
          <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>本报告仅供临床参考，非最终诊断。需专业医师综合评估后确诊。</p>
        </div>
      </div>
    </div>
  );
}
