import { Diagnosis, Responses, Question } from '@/types';
import { questions } from '@/data/questions';

export function diagnoseADHD(responses: Responses): Diagnosis {
  const diagnosis: Diagnosis = {
    inattentiveScore: 0,
    hyperactiveScore: 0,
    durationMet: false,
    onsetMet: false,
    impairment: 0,
    familyHistory: 0,
    comorbidities: [],
    exclusionsMet: true,
    subtype: null,
    confidence: 0,
    report: '',
  };

  questions.forEach((q) => {
    const response = responses[q.id];
    if (response === 'right' || response === 'up') {
      const weight = response === 'up' ? 2 : 1;

      // DSM-5 注意力不集中
      if (q.category === '注意力不集中') {
        diagnosis.inattentiveScore += response === 'up' ? 2 : 1;
      }

      // DSM-5 多动-冲动
      if (q.category === '多动-冲动') {
        diagnosis.hyperactiveScore += response === 'up' ? 2 : 1;
      }

      // 病程要求
      if (q.category === '病程要求') {
        if (q.id === 19) diagnosis.durationMet = true;
        if (q.id === 20) diagnosis.onsetMet = true;
      }

      // 功能损害
      if (q.category === '功能损害') {
        diagnosis.impairment++;
      }

      // 家族史
      if (q.category === '家族史') {
        diagnosis.familyHistory++;
      }

      // 共病筛查
      if (q.category === '共病筛查') {
        diagnosis.comorbidities.push(q.question.substring(0, 10) + '...');
      }

      // 排除标准
      if (q.category === '排除标准') {
        diagnosis.exclusionsMet = false;
      }
    }
  });

  // 确定亚型
  const inattentiveMet = diagnosis.inattentiveScore >= 5;
  const hyperactiveMet = diagnosis.hyperactiveScore >= 5;

  if (inattentiveMet && hyperactiveMet) {
    diagnosis.subtype = '混合型ADHD';
    diagnosis.confidence = Math.min(100, ((diagnosis.inattentiveScore + diagnosis.hyperactiveScore) / 18) * 100);
  } else if (inattentiveMet) {
    diagnosis.subtype = '注意力缺陷型ADHD';
    diagnosis.confidence = Math.min(100, (diagnosis.inattentiveScore / 9) * 100);
  } else if (hyperactiveMet) {
    diagnosis.subtype = '多动-冲动型ADHD';
    diagnosis.confidence = Math.min(100, (diagnosis.hyperactiveScore / 9) * 100);
  }

  diagnosis.report = generateDiagnosisReport(diagnosis);
  return diagnosis;
}

function generateDiagnosisReport(diagnosis: Diagnosis): string {
  const report: string[] = [];

  if (diagnosis.subtype) {
    report.push(`诊断：${diagnosis.subtype}`);
    report.push(`匹配度：${diagnosis.confidence.toFixed(0)}%`);
  } else {
    report.push('诊断：不符合ADHD诊断标准');
    report.push(`匹配度：${diagnosis.confidence.toFixed(0)}%`);
  }

  report.push('');
  report.push('DSM-5 症状评估：');
  report.push(`  • 注意力不集中：${diagnosis.inattentiveScore}/9项 ${diagnosis.inattentiveScore >= 5 ? '✓' : '✗'}`);
  report.push(`  • 多动-冲动：${diagnosis.hyperactiveScore}/9项 ${diagnosis.hyperactiveScore >= 5 ? '✓' : '✗'}`);

  report.push('');
  report.push('病程要求：');
  report.push(`  • 症状持续6个月以上：${diagnosis.durationMet ? '✓' : '✗'}`);
  report.push(`  • 12岁前出现：${diagnosis.onsetMet ? '✓' : '✗'}`);

  report.push('');
  report.push('功能损害（≥1项满足）：');
  report.push(`  • 影响程度：${diagnosis.impairment}/4项 ${diagnosis.impairment >= 1 ? '✓' : '✗'}`);

  report.push('');
  report.push('排除标准：');
  report.push(`  • 排除其他原因：${diagnosis.exclusionsMet ? '✓' : '✗'}`);

  if (diagnosis.familyHistory > 0) {
    report.push('');
    report.push(`家族史：${diagnosis.familyHistory}位亲属有ADHD症状`);
  }

  if (diagnosis.comorbidities.length > 0) {
    report.push('');
    report.push(`可能共病：${diagnosis.comorbidities.length}项需关注`);
  }

  return report.join('\n');
}

export function calculateSymptoms(responses: Responses): { name: string; category: string }[] {
  const symptomCategories: Record<string, { category: string; count: number }> = {};

  questions.forEach((q) => {
    if (q.category === '影响程度') return;

    const response = responses[q.id];
    if (response === 'right' || response === 'up') {
      if (!symptomCategories[q.category]) {
        symptomCategories[q.category] = { category: q.category, count: 0 };
      }
      symptomCategories[q.category].count += response === 'up' ? 2 : 1;
    }
  });

  return Object.values(symptomCategories)
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((s) => ({
      name: s.category,
      category: s.category,
    }));
}

export function calculateSeverity(responses: Responses, impactValue: number): number {
  const yesCount = Object.values(responses).filter((r) => r === 'right').length;
  const verySevereCount = Object.values(responses).filter((r) => r === 'up').length;
  const weightedYes = yesCount + verySevereCount * 2;

  if (weightedYes === 0 && impactValue === 1) return 0;

  const yesRatio = weightedYes / 50;
  return Math.min(10, Math.round(yesRatio * 8 + impactValue));
}

export function generateSummary(symptoms: { name: string; category: string }[]): string {
  if (symptoms.length === 0) {
    return '未发现明显ADHD症状';
  }

  const topSymptoms = symptoms.slice(0, 3);
  const names = topSymptoms.map((s) => s.name).join('和');
  return `患者主要表现为${names}`;
}
