import { Diagnosis, Responses } from '@/types';
import { questions } from '@/data/questions';

export const QUICK_SCREENING_QUESTION_COUNT = 15;

const INATTENTIVE_QUESTION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const HYPERACTIVE_QUESTION_IDS = [10, 11, 12, 13, 14, 15, 16, 17, 18];
const CORE_QUESTION_IDS = [...INATTENTIVE_QUESTION_IDS, ...HYPERACTIVE_QUESTION_IDS];
const DURATION_QUESTION_IDS = [19, 20];
const IMPAIRMENT_QUESTION_IDS = [21, 22, 23, 24];
const FAMILY_HISTORY_QUESTION_IDS = [25, 26, 27, 28];
const COMORBIDITY_QUESTION_IDS = [37, 38, 39, 40, 41, 42, 43, 44];
const EXCLUSION_QUESTION_IDS = [45, 46, 47, 48, 49];

const inattentiveSet = new Set(INATTENTIVE_QUESTION_IDS);
const hyperactiveSet = new Set(HYPERACTIVE_QUESTION_IDS);
const impairmentSet = new Set(IMPAIRMENT_QUESTION_IDS);
const familyHistorySet = new Set(FAMILY_HISTORY_QUESTION_IDS);
const comorbiditySet = new Set(COMORBIDITY_QUESTION_IDS);
const exclusionSet = new Set(EXCLUSION_QUESTION_IDS);

function isPositiveResponse(response: Responses[number] | undefined): boolean {
  return response === 'right' || response === 'up';
}

function responseWeight(response: Responses[number] | undefined): number {
  if (response === 'up') return 2;
  if (response === 'right') return 1;
  return 0;
}

function countAnswered(responses: Responses, ids: number[]): number {
  return ids.filter((id) => responses[id] !== undefined).length;
}

function maxWeightedScore(responses: Responses, ids: number[], fallbackMax: number): number {
  const answeredCount = countAnswered(responses, ids);
  return answeredCount > 0 ? answeredCount * 2 : fallbackMax;
}

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

  questions.forEach((question) => {
    const response = responses[question.id];
    if (!isPositiveResponse(response)) return;

    const weight = responseWeight(response);

    if (inattentiveSet.has(question.id)) {
      diagnosis.inattentiveScore += weight;
    }

    if (hyperactiveSet.has(question.id)) {
      diagnosis.hyperactiveScore += weight;
    }

    if (question.id === 19) {
      diagnosis.durationMet = true;
    }

    if (question.id === 20) {
      diagnosis.onsetMet = true;
    }

    if (impairmentSet.has(question.id)) {
      diagnosis.impairment += 1;
    }

    if (familyHistorySet.has(question.id)) {
      diagnosis.familyHistory += 1;
    }

    if (comorbiditySet.has(question.id)) {
      diagnosis.comorbidities.push(`${question.question.slice(0, 10)}...`);
    }

    if (exclusionSet.has(question.id)) {
      diagnosis.exclusionsMet = false;
    }
  });

  const inattentiveMet = diagnosis.inattentiveScore >= 5;
  const hyperactiveMet = diagnosis.hyperactiveScore >= 5;

  const inattentiveMax = maxWeightedScore(responses, INATTENTIVE_QUESTION_IDS, 18);
  const hyperactiveMax = maxWeightedScore(responses, HYPERACTIVE_QUESTION_IDS, 18);
  const coreAnsweredCount = countAnswered(responses, CORE_QUESTION_IDS);
  const coreMax = coreAnsweredCount > 0 ? coreAnsweredCount * 2 : 36;

  if (inattentiveMet && hyperactiveMet) {
    diagnosis.subtype = '混合型 ADHD';
    diagnosis.confidence = Math.min(
      100,
      Math.round(((diagnosis.inattentiveScore + diagnosis.hyperactiveScore) / (inattentiveMax + hyperactiveMax)) * 100),
    );
  } else if (inattentiveMet) {
    diagnosis.subtype = '注意力缺陷型 ADHD';
    diagnosis.confidence = Math.min(100, Math.round((diagnosis.inattentiveScore / inattentiveMax) * 100));
  } else if (hyperactiveMet) {
    diagnosis.subtype = '多动-冲动型 ADHD';
    diagnosis.confidence = Math.min(100, Math.round((diagnosis.hyperactiveScore / hyperactiveMax) * 100));
  } else {
    const coreScore = diagnosis.inattentiveScore + diagnosis.hyperactiveScore;
    diagnosis.confidence = Math.min(100, Math.round((coreScore / coreMax) * 100));
  }

  diagnosis.report = generateDiagnosisReport(diagnosis);
  return diagnosis;
}

export function calculateSuspicionPercentage(responses: Responses): number {
  const diagnosis = diagnoseADHD(responses);
  const answeredCoreCount = countAnswered(responses, CORE_QUESTION_IDS);

  if (answeredCoreCount === 0) return 0;

  const coreWeightedScore = diagnosis.inattentiveScore + diagnosis.hyperactiveScore;
  let suspicionScore = (coreWeightedScore / (answeredCoreCount * 2)) * 100;

  if (responses[19] !== undefined && !isPositiveResponse(responses[19])) {
    suspicionScore *= 0.82;
  }

  if (responses[20] !== undefined && !isPositiveResponse(responses[20])) {
    suspicionScore *= 0.88;
  }

  const answeredImpairmentCount = countAnswered(responses, IMPAIRMENT_QUESTION_IDS);
  if (answeredImpairmentCount > 0) {
    suspicionScore += (diagnosis.impairment / answeredImpairmentCount) * 12;
  }

  const answeredFamilyHistoryCount = countAnswered(responses, FAMILY_HISTORY_QUESTION_IDS);
  if (answeredFamilyHistoryCount > 0) {
    suspicionScore += (diagnosis.familyHistory / answeredFamilyHistoryCount) * 8;
  }

  const answeredDurationCount = countAnswered(responses, DURATION_QUESTION_IDS);
  if (answeredDurationCount > 0) {
    const durationScore = DURATION_QUESTION_IDS.reduce((sum, id) => sum + responseWeight(responses[id]), 0);
    suspicionScore += (durationScore / (answeredDurationCount * 2)) * 8;
  }

  return Math.min(100, Math.round(suspicionScore));
}

function generateDiagnosisReport(diagnosis: Diagnosis): string {
  const report: string[] = [];

  report.push(`诊断：${diagnosis.subtype ?? '暂不满足 ADHD 诊断标准'}`);
  report.push(`匹配度：${diagnosis.confidence.toFixed(0)}%`);

  report.push('');
  report.push('DSM-5 症状评估：');
  report.push(`  - 注意力不集中：${diagnosis.inattentiveScore}/9`);
  report.push(`  - 多动-冲动：${diagnosis.hyperactiveScore}/9`);

  report.push('');
  report.push('病程要求：');
  report.push(`  - 症状持续 6 个月以上：${diagnosis.durationMet ? '是' : '否'}`);
  report.push(`  - 12 岁前出现：${diagnosis.onsetMet ? '是' : '否'}`);

  report.push('');
  report.push('功能损害：');
  report.push(`  - 受影响项目：${diagnosis.impairment}/4`);

  report.push('');
  report.push('排除标准：');
  report.push(`  - 排除其他原因：${diagnosis.exclusionsMet ? '是' : '否'}`);

  if (diagnosis.familyHistory > 0) {
    report.push('');
    report.push(`家族史线索：${diagnosis.familyHistory}`);
  }

  if (diagnosis.comorbidities.length > 0) {
    report.push('');
    report.push(`共病筛查阳性项：${diagnosis.comorbidities.length}`);
  }

  return report.join('\n');
}

export function calculateSymptoms(responses: Responses): { name: string; category: string }[] {
  const symptomCategories: Record<string, { category: string; count: number }> = {};

  questions.forEach((question) => {
    if (question.id === 50) return;

    const response = responses[question.id];
    if (!isPositiveResponse(response)) return;

    if (!symptomCategories[question.category]) {
      symptomCategories[question.category] = { category: question.category, count: 0 };
    }

    symptomCategories[question.category].count += responseWeight(response);
  });

  return Object.values(symptomCategories)
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      name: item.category,
      category: item.category,
    }));
}

export function calculateSeverity(responses: Responses, impactValue: number): number {
  const yesCount = Object.values(responses).filter((response) => response === 'right').length;
  const verySevereCount = Object.values(responses).filter((response) => response === 'up').length;
  const weightedYes = yesCount + verySevereCount * 2;

  if (weightedYes === 0 && impactValue === 1) return 0;

  const yesRatio = weightedYes / questions.length;
  return Math.min(10, Math.round(yesRatio * 8 + impactValue));
}

export function generateSummary(symptoms: { name: string; category: string }[]): string {
  if (symptoms.length === 0) {
    return '未发现明显 ADHD 症状';
  }

  const topSymptoms = symptoms.slice(0, 3);
  const names = topSymptoms.map((symptom) => symptom.name).join('、');
  return `主要表现为${names}`;
}
