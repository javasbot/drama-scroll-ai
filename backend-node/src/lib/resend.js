/**
 * Resend 邮件服务
 * @see https://resend.com/docs/send-with-nodejs
 */
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@dramascroll.app';

export const isResendEnabled = !!RESEND_API_KEY;

let resend = null;

if (isResendEnabled) {
  resend = new Resend(RESEND_API_KEY);
  console.log('[Resend] 邮件客户端初始化完成');
} else {
  console.log('[Resend] 未配置 API Key，邮件功能不可用');
}

// --- 邮件模板 ---

export async function sendWelcomeEmail(to, username) {
  if (!resend) {
    console.log(`[Resend] 模拟发送欢迎邮件到 ${to}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `吃瓜日报 <${FROM_EMAIL}>`,
      to,
      subject: `欢迎加入吃瓜日报！`,
      html: `
        <div style="font-family: 'PingFang SC', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
          <h1 style="font-size: 24px; color: #1a1a1a;">📖 欢迎你，${username || '吃瓜人'}！</h1>
          <p style="color: #4a4a4a; line-height: 1.8;">
            恭喜你加入了吃瓜日报——一个 AI 驱动的无限故事流平台。
            无论是职场八卦还是家庭狗血，这里应有尽有。
          </p>
          <p style="color: #8a8a8a; font-size: 12px; margin-top: 24px;">
            — 吃瓜日报团队
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend] 发送欢迎邮件失败:', error);
    } else {
      console.log('[Resend] 欢迎邮件已发送:', data?.id);
    }
  } catch (error) {
    console.error('[Resend] 发送邮件异常:', error.message);
  }
}

export async function sendDigestEmail(to, stories) {
  if (!resend) return;

  const storyList = stories
    .slice(0, 5)
    .map((s) => `<li style="margin-bottom: 8px;"><strong>${s.title}</strong> 🔥${s.hookScore.toFixed(1)}</li>`)
    .join('');

  try {
    await resend.emails.send({
      from: `吃瓜日报 <${FROM_EMAIL}>`,
      to,
      subject: `📖 今日热瓜精选`,
      html: `
        <div style="font-family: 'PingFang SC', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
          <h1 style="font-size: 20px; color: #1a1a1a;">🔥 今日热瓜</h1>
          <ul style="color: #4a4a4a; line-height: 2;">${storyList}</ul>
          <a href="https://dramascroll.app" style="display: inline-block; margin-top: 16px; padding: 8px 20px; background: #e8590c; color: #fff; text-decoration: none; border-radius: 20px; font-size: 14px;">去看完整版</a>
        </div>
      `,
    });
    console.log('[Resend] 日报邮件已发送');
  } catch (error) {
    console.error('[Resend] 日报邮件发送失败:', error.message);
  }
}

export { resend };
