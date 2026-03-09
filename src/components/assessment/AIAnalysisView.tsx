'use client';

import { useMemo } from 'react';

const SECTION_TITLES = ['你的回答模式', '值得注意的模式', '就诊建议', '这份分析的局限'] as const;
type SectionTitle = (typeof SECTION_TITLES)[number];
type NotableTitle = '可能与ADHD相关的特征' | '需要和医生讨论以区分其他原因的';

interface AIAnalysisViewProps {
  aiContent: string;
}

interface ParsedAnalysis {
  fullContent: string;
  sections: Record<SectionTitle, string> | null;
  notableSections: Record<NotableTitle, string> | null;
  stats: Array<{
    key: 'extreme' | 'present' | 'uncertain' | 'none';
    label: string;
    count: number;
    color: string;
    lightColor: string;
  }>;
  focusChips: string[];
}

const focusKeywordMap = [
  { label: '注意力', pattern: /注意力|分心|走神|专注/ },
  { label: '冲动性', pattern: /冲动|打断|抢话|忍不住/ },
  { label: '多动', pattern: /多动|坐不住|小动作/ },
  { label: '执行功能', pattern: /执行功能|拖延|计划|组织|时间管理/ },
  { label: '情绪', pattern: /情绪|烦躁|挫败|波动/ },
  { label: '记忆', pattern: /记忆|忘事|丢三落四/ },
  { label: '睡眠', pattern: /睡眠|作息|熬夜/ },
  { label: '学习工作', pattern: /学习|工作|任务|截止/ },
] as const;

const adviceKeywords = [
  '精神科',
  '心理科',
  '心理咨询',
  '近半年',
  '具体困扰场景',
  '学习',
  '工作',
  '作息',
  '睡眠',
  '例子',
  '准备',
  '就诊前',
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(content: string) {
  return content.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim();
}

function cleanSectionContent(content: string) {
  return content.replace(/^[\s：:\-•*]+/, '').trim();
}

// ──── 主标题精确解析 ────

function splitIntoSections<T extends readonly string[]>(content: string, titles: T) {
  const titlePattern = titles.map(escapeRegExp).join('|');
  const regex = new RegExp(
    `(^|\\n)\\s*(?:[#>*-]+\\s*)?(?:[0-9一二三四]+[.、）)]\\s*)?(${titlePattern})\\s*(?:[：:]\\s*)?`,
    'g',
  );

  const matches = Array.from(content.matchAll(regex)).map((match) => ({
    title: match[2] as T[number],
    rawIndex: match.index ?? 0,
    contentStart: (match.index ?? 0) + match[0].length,
  }));

  if (matches.length !== titles.length) {
    return null;
  }

  const titleSet = new Set(matches.map((match) => match.title));
  if (titleSet.size !== titles.length) {
    return null;
  }

  const sections = {} as Record<T[number], string>;

  matches.forEach((match, index) => {
    const nextRawIndex = matches[index + 1]?.rawIndex ?? content.length;
    sections[match.title] = cleanSectionContent(content.slice(match.contentStart, nextRawIndex));
  });

  if (titles.some((title) => !sections[title as T[number]])) {
    return null;
  }

  return sections;
}

// ──── 模糊匹配通用函数 ────

function findFuzzySection(content: string, patterns: RegExp[]): { start: number; headerEnd: number } | null {
  for (const pattern of patterns) {
    const fullRegex = new RegExp(
      `(^|\\n)\\s*(?:[-•*]+\\s*)?(?:[#]+\\s*)?(?:[0-9一二三四]+[.、）)]\\s*)?(${pattern.source})\\s*(?:[（(][^）)]*[）)])?\\s*(?:[：:]\\s*)?`,
      'g',
    );
    const match = fullRegex.exec(content);
    if (match) {
      return { start: match.index ?? 0, headerEnd: (match.index ?? 0) + match[0].length };
    }
  }
  return null;
}

// ──── 主标题模糊解析（精确失败时的兜底） ────

const MAIN_FUZZY_PATTERNS: Array<{ title: SectionTitle; patterns: RegExp[] }> = [
  { title: '你的回答模式', patterns: [/你的回答模式/, /回答模式/, /回答分布/] },
  { title: '值得注意的模式', patterns: [/值得注意的模式/, /值得注意/, /注意的模式/] },
  { title: '就诊建议', patterns: [/就诊建议/] },
  { title: '这份分析的局限', patterns: [/这份分析的局限/, /分析的局限/, /局限性?/] },
];

function splitIntoMainSections(content: string): Record<SectionTitle, string> | null {
  // 先试精确匹配
  const exact = splitIntoSections(content, SECTION_TITLES);
  if (exact) return exact;

  // 精确失败 → 逐个模糊查找
  const found: Array<{ title: SectionTitle; start: number; headerEnd: number }> = [];
  for (const { title, patterns } of MAIN_FUZZY_PATTERNS) {
    const match = findFuzzySection(content, patterns);
    if (match) {
      found.push({ title, ...match });
    }
  }

  if (found.length < 2) return null;

  found.sort((a, b) => a.start - b.start);

  const sections = {} as Record<SectionTitle, string>;
  found.forEach((match, index) => {
    const nextStart = found[index + 1]?.start ?? content.length;
    sections[match.title] = cleanSectionContent(content.slice(match.headerEnd, nextStart));
  });

  return sections;
}

// ──── 子标题模糊解析（"值得注意的模式"内部） ────

const ADHD_SECTION_PATTERNS = [
  /可能与\s*ADHD\s*相关的特征/,
  /ADHD\s*相关(?:的)?特征/,
  /可能.*?ADHD.*?(?:相关|特征)/,
  /与\s*ADHD\s*相关/,
];
const DOCTOR_SECTION_PATTERNS = [
  /需要和医生讨论以区分其他原因的/,
  /需要(?:和|与)医生(?:重点)?讨论/,
  /和医生(?:重点)?讨论/,
  /需要和医生/,
  /区分其他原因/,
];

function splitIntoNotableSections(content: string): Record<NotableTitle, string> | null {
  const adhd = findFuzzySection(content, ADHD_SECTION_PATTERNS);
  const doctor = findFuzzySection(content, DOCTOR_SECTION_PATTERNS);

  if (!adhd || !doctor) {
    return null;
  }

  const sections = {} as Record<NotableTitle, string>;

  if (adhd.start < doctor.start) {
    sections['可能与ADHD相关的特征'] = cleanSectionContent(content.slice(adhd.headerEnd, doctor.start));
    sections['需要和医生讨论以区分其他原因的'] = cleanSectionContent(content.slice(doctor.headerEnd));
  } else {
    sections['需要和医生讨论以区分其他原因的'] = cleanSectionContent(content.slice(doctor.headerEnd, adhd.start));
    sections['可能与ADHD相关的特征'] = cleanSectionContent(content.slice(adhd.headerEnd));
  }

  if (!sections['可能与ADHD相关的特征'] || !sections['需要和医生讨论以区分其他原因的']) {
    return null;
  }

  return sections;
}

// ──── 统计提取 ────

function extractCount(content: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }
  return 0;
}

function buildStats(content: string) {
  return [
    {
      key: 'extreme' as const,
      label: '极严重',
      count: extractCount(content, [
        /(?:"极严重"|「极严重」|极严重)[^\d\n]{0,8}(\d+)\s*[项题]/,
        /(\d+)\s*[项题][^\n，。；]{0,12}(?:"极严重"|「极严重」|极严重)/,
      ]),
      color: '#f97316',
      lightColor: '#ffedd5',
    },
    {
      key: 'present' as const,
      label: '有',
      count: extractCount(content, [
        /(?:选了\s*)?(?:"有"|「有」|有)[^\d\n]{0,8}(\d+)\s*[项题]/,
        /(\d+)\s*[项题][^\n，。；]{0,12}(?:"有"|「有」|有)/,
      ]),
      color: '#3b82f6',
      lightColor: '#dbeafe',
    },
    {
      key: 'uncertain' as const,
      label: '不确定',
      count: extractCount(content, [
        /(?:"不确定"|「不确定」|不确定)[^\d\n]{0,8}(\d+)\s*[项题]/,
        /(\d+)\s*[项题][^\n，。；]{0,12}(?:"不确定"|「不确定」|不确定)/,
      ]),
      color: '#94a3b8',
      lightColor: '#e2e8f0',
    },
    {
      key: 'none' as const,
      label: '没有',
      count: extractCount(content, [
        /(?:"没有"|「没有」|没有)[^\d\n]{0,8}(\d+)\s*[项题]/,
        /(\d+)\s*[项题][^\n，。；]{0,12}(?:"没有"|「没有」|没有)/,
      ]),
      color: '#22c55e',
      lightColor: '#dcfce7',
    },
  ];
}

function extractFocusChips(content: string) {
  return focusKeywordMap.filter((item) => item.pattern.test(content)).map((item) => item.label);
}

// ──── 渲染工具函数 ────

function splitParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function highlightText(content: string, keywords: string[]) {
  const uniqueKeywords = Array.from(new Set(keywords.filter(Boolean))).sort((left, right) => right.length - left.length);

  if (uniqueKeywords.length === 0) {
    return [content];
  }

  const pattern = new RegExp(`(${uniqueKeywords.map(escapeRegExp).join('|')})`, 'g');
  const parts = content.split(pattern).filter((part) => part.length > 0);
  const keywordSet = new Set(uniqueKeywords);

  return parts.map((part, index) =>
    keywordSet.has(part) ? (
      <strong key={`${part}-${index}`} style={{ fontWeight: 700, color: '#0f172a' }}>
        {part}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function renderParagraphText(content: string, keywords: string[] = []) {
  const colonIndex = content.search(/[：:]/);

  if (colonIndex > 0 && colonIndex < 18) {
    const prefix = content.slice(0, colonIndex).trim();
    const suffix = content.slice(colonIndex + 1).trim();

    return (
      <>
        <strong style={{ fontWeight: 700, color: '#0f172a' }}>{prefix}：</strong>
        {highlightText(suffix, keywords)}
      </>
    );
  }

  return highlightText(content, keywords);
}

function renderParagraphs(content: string, options?: { keywords?: string[]; fontSize?: number; color?: string; lineHeight?: number }) {
  const paragraphs = splitParagraphs(content);

  return paragraphs.map((paragraph, index) => (
    <p
      key={`${paragraph.slice(0, 12)}-${index}`}
      style={{
        margin: index === paragraphs.length - 1 ? 0 : '0 0 10px 0',
        fontSize: options?.fontSize ?? 14,
        color: options?.color ?? '#334155',
        lineHeight: options?.lineHeight ?? 1.8,
        whiteSpace: 'pre-wrap',
      }}
    >
      {renderParagraphText(paragraph, options?.keywords ?? [])}
    </p>
  ));
}

// ──── 核心解析：永远不返回 null ────

function parseAIContent(content: string): ParsedAnalysis {
  const fullContent = normalizeText(content);

  if (!fullContent) {
    return { fullContent: '', sections: null, notableSections: null, stats: [], focusChips: [] };
  }

  const sections = splitIntoMainSections(fullContent);

  const statsSource = sections?.['你的回答模式'] ?? fullContent;
  const stats = buildStats(statsSource);
  const focusChips = extractFocusChips(fullContent);

  let notableSections: Record<NotableTitle, string> | null = null;
  if (sections?.['值得注意的模式']) {
    notableSections = splitIntoNotableSections(sections['值得注意的模式']);
  }

  return { fullContent, sections, notableSections, stats, focusChips };
}

// ──── 组件 ────

export default function AIAnalysisView({ aiContent }: AIAnalysisViewProps) {
  const parsed = useMemo(() => parseAIContent(aiContent), [aiContent]);
  const total = parsed.stats.reduce((sum, item) => sum + item.count, 0);

  const mainText = parsed.sections?.['你的回答模式'] ?? parsed.fullContent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── 第一块：你的回答模式（始终渲染） ── */}
      <div style={{ background: 'rgba(255,255,255,0.76)', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>你的回答模式</h4>
          <span style={{ fontSize: '12px', color: '#64748b' }}>基于 AI 对回答分布的归纳</span>
        </div>

        {total > 0 && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '14px', padding: '4px 0 0' }}>
            {parsed.stats.map((item) => {
              const maxCount = Math.max(...parsed.stats.map((s) => s.count));
              const BAR_MAX_HEIGHT = 72;
              const BAR_MIN_HEIGHT = item.count > 0 ? 8 : 0;
              const barHeight = maxCount > 0 ? Math.max(BAR_MIN_HEIGHT, Math.round((item.count / maxCount) * BAR_MAX_HEIGHT)) : 0;

              return (
                <div
                  key={item.key}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: item.count > 0 ? item.color : '#cbd5e1' }}>
                    {item.count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: `${barHeight}px`,
                      background: item.count > 0 ? item.color : '#e2e8f0',
                      borderRadius: '6px 6px 2px 2px',
                      transition: 'height 0.4s ease',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {parsed.focusChips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {parsed.focusChips.map((chip) => (
              <span key={chip} style={{ padding: '6px 10px', borderRadius: '999px', background: '#ede9fe', color: '#6d28d9', fontSize: '12px', fontWeight: 700 }}>
                {chip}
              </span>
            ))}
          </div>
        )}

        {mainText && <div>{renderParagraphs(mainText)}</div>}
      </div>

      {/* ── 第二块：值得注意的模式 ── */}
      {parsed.sections?.['值得注意的模式'] && (
        <div style={{ background: 'rgba(255,255,255,0.76)', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' }}>
          <h4 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>值得注意的模式</h4>
          {parsed.notableSections ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div style={{ borderLeft: '4px solid #22d3ee', background: '#f8fafc', borderRadius: '12px', padding: '14px 14px 14px 16px' }}>
                <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>可能与ADHD相关的特征</div>
                <div>{renderParagraphs(parsed.notableSections['可能与ADHD相关的特征'])}</div>
              </div>

              <div style={{ borderLeft: '4px solid #f59e0b', background: '#fffaf0', borderRadius: '12px', padding: '14px 14px 14px 16px' }}>
                <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>需要和医生讨论以区分其他原因的</div>
                <div>{renderParagraphs(parsed.notableSections['需要和医生讨论以区分其他原因的'])}</div>
              </div>
            </div>
          ) : (
            <div style={{ borderLeft: '4px solid #22d3ee', background: '#f8fafc', borderRadius: '12px', padding: '14px 14px 14px 16px' }}>
              <div>{renderParagraphs(parsed.sections['值得注意的模式'])}</div>
            </div>
          )}
        </div>
      )}

      {/* ── 第三块：就诊建议 ── */}
      {parsed.sections?.['就诊建议'] && (
        <div style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>就诊建议</h4>
          <div>{renderParagraphs(parsed.sections['就诊建议'], { keywords: adviceKeywords })}</div>
        </div>
      )}

      {/* ── 第四块：这份分析的局限 ── */}
      {parsed.sections?.['这份分析的局限'] && (
        <div style={{ padding: '0 4px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>这份分析的局限</h4>
          <div>{renderParagraphs(parsed.sections['这份分析的局限'], { fontSize: 12, color: '#94a3b8', lineHeight: 1.7 })}</div>
        </div>
      )}
    </div>
  );
}
