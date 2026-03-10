import { NextRequest, NextResponse } from 'next/server';

type VerifyCodeBody = {
  code?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyCodeBody;
    const code = body.code?.trim();

    if (!code) {
      return NextResponse.json(
        { valid: false, message: '请输入 ADHD密钥' },
        { status: 400 }
      );
    }

    const rawCodes = process.env.ADHD_ACCESS_CODES;
    if (!rawCodes) {
      return NextResponse.json(
        { valid: false, message: '服务端未配置 ADHD_ACCESS_CODES' },
        { status: 500 }
      );
    }

    const validCodes = rawCodes
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const valid = validCodes.includes(code);
    if (!valid) {
      return NextResponse.json(
        { valid: false, message: 'ADHD密钥错误，请重试' },
        { status: 401 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json(
      { valid: false, message: '密钥验证失败，请稍后再试' },
      { status: 500 }
    );
  }
}
