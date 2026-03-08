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
      answered.push(`${q.id}. [${q.category}] ${q.question} -> ${status}`);
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
    return `这是一份 ADHD 自评问卷结果，请以专业医生的视角进行分析。

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
    return `这是一份 ADHD 自评问卷结果，请基于“用户的具体回答数据”做针对性分析，不要输出空泛安慰。

${diagnosisInfo}

问卷回答详情:
${answered.join('\n')}

请严格按以下结构输出（必须包含所有部分）：
1. 你的回答模式
- 先给具体统计：多少项选了“有”、多少项选了“极严重”、多少项选了“不确定”、多少项选了“没有”。
- 指出“极严重”症状主要集中在哪些领域（如执行功能、注意力、冲动性），并引用对应题目。

2. 值得注意的模式（核心部分）
- 可能与 ADHD 相关的特征：从回答中找出有诊断意义的症状组合，解释为什么这个模式更指向 ADHD 而非懒惰、单纯抑郁等；必须引用具体题目与回答状态。
- 需要和医生讨论以区分其他原因的：指出哪些回答可能与焦虑、抑郁或其他问题重叠，并建议用户就诊时可如何向医生描述。

3. 就诊建议（2-3句实用建议）
- 建议看什么科室。
- 就诊前可准备什么（如近半年具体困扰场景、学习/工作受影响例子、作息与睡眠情况）。

4. 这份分析的局限（1-2句话，必须包含）
- 类似症状可能由焦虑、抑郁、睡眠障碍、甲状腺问题等引起。
- 这份分析用于帮助你整理信息，不能替代医生诊断。

语气和排版要求：
- 保留上面4个部分的输出结构与顺序，不要遗漏任何部分。
- 不要使用 markdown 加粗语法（不要出现 **）。
- 不要频繁用括号引用题号；可以自然提到题目内容，不必标注题号。
- 每个段落用短句表达，一句话只说一个观点。
- 用换行和空行分隔段落，不要使用复杂的列表嵌套。
- 标题用简短文字即可，不要再额外使用编号标题或多级编号。
- 语气像在和朋友聊天解释报告结果，口语化但保持专业。
- 让用户读完有“原来如此”的收获感，重点给出洞察，不堆砌信息。
- 使用第二人称“你”。
- 不要泛泛而谈，必须基于用户的具体回答来分析。
- 回复控制在600字以内。`;
  }
}

export function getSystemPrompt(isDoctorMode: boolean): string {
  return isDoctorMode
    ? '你是一位专业的精神科医生，擅长ADHD诊断和治疗。请用专业但易懂的语言分析患者的自评结果。'
    : '你是专注于ADHD筛查的数据分析师，擅长从自评问卷中识别有意义的症状模式。请基于用户具体回答做结构化、专业且易懂的分析，避免空泛安慰，明确区分ADHD线索与可能的重叠因素。';
}
