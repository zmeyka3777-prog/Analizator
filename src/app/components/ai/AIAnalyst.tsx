// ==================== AI АНАЛИТИК ====================
// Компонент для реального AI-анализа данных с использованием Claude API

import React, { useState } from 'react';
import { Zap, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface AIAnalystProps {
  salesTrendData: any[];
  salesTrendUnitsData: any[];
  productsData: any[];
  stats2024: any;
  stats2025: any;
  stats2026: any;
  fallbackAnalysis?: {
    emoji: string;
    confidence: string;
    recommendation: string;
  };
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({
  salesTrendData,
  salesTrendUnitsData,
  productsData,
  stats2024,
  stats2025,
  stats2026,
  fallbackAnalysis,
}) => {
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaceholder, setIsPlaceholder] = useState(false);

  const generateAIAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Подготовка данных для анализа
      const analysisPrompt = `
Ты - опытный бизнес-аналитик фармацевтической компании World Medicine. Проанализируй данные продаж и дай развёрнутый комментарий с конкретными рекомендациями.

**ДАННЫЕ ЗА 2024-2026 ГОДЫ:**

📊 **Общие показатели:**
- 2024: ${stats2024.totalRevenue.toFixed(0)} руб. (${stats2024.totalUnits} упак.)
- 2025: ${stats2025.totalRevenue.toFixed(0)} руб. (${stats2025.totalUnits} упак.)
- 2026 (январь - факт): ${stats2026.totalRevenue.toFixed(0)} руб. (${stats2026.totalUnits} упак.)

📈 **Динамика по месяцам (руб.):**
${salesTrendData.map(m => `${m.month}: 2024=${m.year2024}, 2025=${m.year2025}, 2026=${m.year2026}`).join('\n')}

📦 **Динамика по месяцам (упаковки):**
${salesTrendUnitsData.map(m => `${m.month}: 2024=${m.year2024}, 2025=${m.year2025}, 2026=${m.year2026}`).join('\n')}

🎯 **Топ-5 препаратов по продажам 2026:**
${productsData.slice(0, 5).map((p, i) => `${i + 1}. ${p.shortName}: ${p.sales2026} руб.`).join('\n')}

**ЗАДАНИЕ:**
Дай развёрнутый анализ (2-3 абзаца) с акцентом на:
1. Оценка старта 2026 года (январь - факт, остальное прогноз)
2. Сравнение динамики продаж в рублях и упаковках - что это говорит о ценовой политике
3. Какие препараты драйвят рост, какие требуют внимания
4. Конкретные рекомендации для директора на Q1 2026

Ответь на русском языке, профессионально но понятно. Используй эмодзи для акцентов.
`;

      // Вызов серверного эндпоинта
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: analysisPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при обращении к AI API');
      }

      const data = await response.json();
      setAiResponse(data.analysis);
      setIsPlaceholder(data.isPlaceholder || false);
    } catch (err) {
      console.error('AI Analysis Error:', err);
      setError('Не удалось получить AI-анализ. Используется базовый анализ.');
      // Используем fallback
      if (fallbackAnalysis) {
        setAiResponse(fallbackAnalysis.recommendation);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Если есть fallback - показываем его по умолчанию
  const displayText = aiResponse || fallbackAnalysis?.recommendation || '';
  const displayEmoji = fallbackAnalysis?.emoji || '🤖';
  const displayConfidence = aiResponse ? 'AI-powered' : fallbackAnalysis?.confidence || 'базовая';

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Zap className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-bold text-slate-800 text-sm">
              {aiResponse ? 'AI-анализ (Claude)' : 'Базовый анализ'}
            </h4>
            <span className="text-2xl">{displayEmoji}</span>
            <span
              className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                aiResponse
                  ? 'bg-purple-100 text-purple-700'
                  : displayConfidence === 'высокая'
                  ? 'bg-green-100 text-green-700'
                  : displayConfidence === 'средняя'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {aiResponse ? '🧠 AI-powered' : `Достоверность: ${displayConfidence}`}
            </span>
            {!aiResponse && !isLoading && (
              <Button
                onClick={generateAIAnalysis}
                size="sm"
                className="ml-auto text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Zap className="w-3 h-3 mr-1" />
                Получить AI-анализ
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">{error}</p>
            </div>
          )}

          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {displayText}
          </p>

          {isLoading && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Claude анализирует данные...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
