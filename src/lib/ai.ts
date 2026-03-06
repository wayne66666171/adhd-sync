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
  } catch (e: any) {
    return { error: '网络错误: ' + e.message };
  }
}

export function buildAIPrompt(record: AssessmentRecord, responses: Responses, isDoctorMode: boolean): string {
  const answered: string[] = [];
  questions.forEach((q) => {
    const r = responses[q.id];
    if (r) {
      const status = r === 'up' ? '极严重' : r === 'right' ? '有' : r === 'left' ? '没有' : '不确定';
      answered.push(`${q.id}. [${q.category}] ${q.question} → ${status}`);
    }
  });

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
    return `这是一份ADHD自评问卷结果，请以专业医生的视角进行分析。

${diagnosisInfo}

问卷回答详情:
${answered.join('\n')}

请提供:
1. DSM-5 诊断标准符合情况分析
2. 亚型判断依据
3. 共病风险评估
4. 建议的进一步检查项目
5. 治疗方向建议

请使用专业但易懂的语言，适合给医生参考。回复控制在500字以内。`;
  } else {
    return `这是一份ADHD自评问卷结果，请以温暖、共情的方式与用户对话。

${diagnosisInfo}

问卷回答详情:
${answered.join('\n')}

请提供:
1. 对用户当前状态的理解和共鸣（不要用"我理解"开头，直接描述你观察到的情况）
2. 指出用户可能面临的2-3个主要挑战（用第二人称"你"）
3. 提供2-3个实用的日常应对小建议
4. 给予温暖的鼓励

语气要求：温暖、支持性、不评判，像一个理解ADHD的朋友在聊天。不要用专业术语。回复控制在400字以内。`;
  }
}

export function getSystemPrompt(isDoctorMode: boolean): string {
  return isDoctorMode
    ? '你是一位专业的精神科医生，擅长ADHD诊断和治疗。请用专业但易懂的语言分析患者的自评结果。'
    : '你是一位温暖、理解ADHD的心理咨询师。请用共情、支持的语气与用户交流，像朋友一样聊天，不要用专业术语。';
}
