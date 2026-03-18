import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY не задан в .env");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}
const openai = { chat: { completions: { create: (...args: any[]) => getOpenAI().chat.completions.create(...args) } } };

export interface SalesAnalyticsData {
  monthlySales: Array<{ month: string; sales: number; name: string }>;
  combinedData: Array<{ month: string; [key: string]: any }>;
  drugSales?: Array<{ name: string; sales: number }>;
  regionSales?: Array<{ name: string; sales: number }>;
  contragentSales?: Array<{ name: string; sales: number }>;
}

export async function generateAnalyticsComment(data: SalesAnalyticsData): Promise<string> {
  const salesSummary = prepareSalesSummary(data);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: `Ты — аналитик продаж фармацевтической компании. Анализируй данные о продажах лекарственных препаратов и давай краткие, полезные комментарии на русском языке.
        
Твои комментарии должны быть:
- Краткими (3-5 предложений)
- Конкретными, с указанием цифр и трендов
- Практичными, с рекомендациями
- Профессиональными

Формат ответа: простой текст без markdown-разметки.`
      },
      {
        role: "user",
        content: `Проанализируй следующие данные о продажах и дай краткий аналитический комментарий с прогнозом:

${salesSummary}`
      }
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "Не удалось сгенерировать комментарий.";
}

function prepareSalesSummary(data: SalesAnalyticsData): string {
  const parts: string[] = [];
  
  if (data.combinedData?.length > 0) {
    const years = Object.keys(data.combinedData[0]).filter(k => /^\d{4}$/.test(k));
    parts.push(`Данные по годам: ${years.join(', ')}`);
    
    for (const year of years) {
      const total = data.combinedData.reduce((sum, m) => sum + (m[year] || 0), 0);
      parts.push(`Всего за ${year}: ${total.toLocaleString('ru-RU')}`);
    }
    
    const lastYear = years[years.length - 1];
    const prevYear = years[years.length - 2];
    if (lastYear && prevYear) {
      const lastTotal = data.combinedData.reduce((sum, m) => sum + (m[lastYear] || 0), 0);
      const prevTotal = data.combinedData.reduce((sum, m) => sum + (m[prevYear] || 0), 0);
      if (prevTotal > 0) {
        const growth = ((lastTotal - prevTotal) / prevTotal * 100).toFixed(1);
        parts.push(`Рост ${lastYear} к ${prevYear}: ${growth}%`);
      }
    }
  }
  
  if (data.drugSales?.length) {
    const top3 = data.drugSales.slice(0, 3);
    parts.push(`Топ препараты: ${top3.map(d => `${d.name} (${d.sales.toLocaleString('ru-RU')})`).join(', ')}`);
  }
  
  if (data.regionSales?.length) {
    const top3 = data.regionSales.slice(0, 3);
    parts.push(`Топ регионы: ${top3.map(r => `${r.name} (${r.sales.toLocaleString('ru-RU')})`).join(', ')}`);
  }
  
  if (data.monthlySales?.length) {
    const maxMonth = data.monthlySales.reduce((a, b) => a.sales > b.sales ? a : b);
    const minMonth = data.monthlySales.reduce((a, b) => a.sales < b.sales ? a : b);
    parts.push(`Лучший месяц: ${maxMonth.name} (${maxMonth.sales.toLocaleString('ru-RU')})`);
    parts.push(`Слабый месяц: ${minMonth.name} (${minMonth.sales.toLocaleString('ru-RU')})`);
  }
  
  return parts.join('\n');
}

export { openai };
