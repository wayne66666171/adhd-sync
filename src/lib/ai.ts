import { AssessmentRecord, Responses } from '@/types';
import { questions } from '@/data/questions';

export async function callAIStream(
  prompt: string,
  systemPrompt: string,
  onChunk: (text: string) => void
): Promise<{ error?: string }> {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error || '请求失败' };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return { error: '无法读取响应流' };
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            if (json.content) {
              onChunk(json.content);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    return {};
  } catch (e) {
    return { error: '网络错误: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

export function buildAIPrompt(record: AssessmentRecord, responses: Responses, isDoctorMode: boolean): string {
  const positiveAnswers: string[] = [];
  let noneCount = 0;

  questions.forEach((q) => {
    const r = responses[q.id];
    if (!r) return;
    if (r === 'left') {
      noneCount++;
      return;
    }
    const status = r === 'up' ? '极严重' : r === 'right' ? '有' : '不确定';
    positiveAnswers.push(`[${q.category}] ${q.question} → ${status}`);
  });

  const answeredSummary = noneCount > 0 ? `（另有 ${noneCount} 项选了"没有"）` : '';

  const diagnosisInfo = record.diagnosis
    ? `
诊断结果: ${record.diagnosis.subtype || '正常'}
匹配度: ${record.diagnosis.confidence?.toFixed(0) || 0}%
A组(注意力不集中)得分: ${record.diagnosis.inattentiveScore}/9
B组(多动-冲动)得分: ${record.diagnosis.hyperactiveScore}/9
症状持续6个月+: ${record.diagnosis.durationMet ? '是' : '否'}
12岁前出现: ${record.diagnosis.onsetMet ? '是' : '否'}
功能损害项数: ${record.diagnosis.impairment}/4
家族史人数: ${record.diagnosis.familyHistory}`
    : '';

  if (isDoctorMode) {
    return `这是一份 ADHD 自评问卷结果，请以专业医生的视角进行分析。

${diagnosisInfo}

阳性回答详情 ${answeredSummary}:
${positiveAnswers.join('\n')}

请提供:
1. DSM-5 诊断标准符合情况分析
2. 亚型判断依据
3. 共病风险评估
4. 建议的进一步检查项目
5. 治疗方向建议

请使用专业但易懂的语言，适合给医生参考。回复控制在400字以内。`;
  } else {
    return `这是一份 ADHD 自评问卷结果，请基于用户的具体回答做针对性分析，不要输出空泛安慰。

${diagnosisInfo}

阳性回答 ${answeredSummary}:
${positiveAnswers.join('\n')}

请严格按以下结构输出（必须包含所有部分）：
1. 你的回答模式
统计各选项数量，指出”极严重”集中在哪些领域。

2. 值得注意的模式（核心部分）
包含以下两个子段落，子标题必须一字不差照用，不得修改：

可能与ADHD相关的特征：找出有诊断意义的症状组合，说明为何指向ADHD。

需要和医生讨论以区分其他原因的：指出可能与焦虑/抑郁重叠的回答。

3. 就诊建议（2句话）
科室建议 + 就诊前准备什么。

4. 这份分析的局限（1句话）

排版要求：不用**加粗、不用题号、短句换行、口语化。回复控制在350字以内。`;
  }
}

export function getSystemPrompt(isDoctorMode: boolean): string {
  return isDoctorMode
    ? '你是一位专业的精神科医生，擅长ADHD诊断和治疗。请用专业但易懂的语言分析患者的自评结果。'
    : '你是专注于ADHD筛查的数据分析师，擅长从自评问卷中识别有意义的症状模式。请基于用户具体回答做结构化、专业且易懂的分析，避免空泛安慰，明确区分ADHD线索与可能的重叠因素。';
}
