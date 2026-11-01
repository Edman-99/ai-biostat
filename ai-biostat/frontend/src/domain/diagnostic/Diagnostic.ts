import type { Localized } from '@/core/localized'

/**
 * Компетенции. Ключи в pct — русские названия: так они уже сохранены у студентов и в выгрузке,
 * поэтому для показа на другом языке используется BLOCK_KEY → blocks.<key>.
 */
export type Block = 'Биостатистика' | 'Работа с данными' | 'Интерпретация' | 'Работа с ИИ'
export const BLOCK_KEY: Record<string, string> = {
  'Биостатистика': 'biostat', 'Работа с данными': 'data', 'Интерпретация': 'interp', 'Работа с ИИ': 'ai',
}

export interface DiagnosticQuestion {
  block: Block
  question: Localized
  options: Localized[]
  answer: number
}

/** Демо-вариант (4 вопроса). Полные варианты А и Б по 20 вопросов — этап 3. Казахский — черновик, нужна вычитка. */
export const DEMO_DIAGNOSTIC: DiagnosticQuestion[] = [
  {
    block: 'Работа с данными',
    question: {
      ru: 'Стадия ВИЧ-инфекции (1, 2, 3, 4) — это какая переменная?',
      kk: 'АИТВ-инфекциясының сатысы (1, 2, 3, 4) — бұл қандай айнымалы?',
      en: 'HIV infection stage (1, 2, 3, 4) is what kind of variable?',
    },
    options: [
      { ru: 'Количественная непрерывная', kk: 'Сандық үздіксіз', en: 'Continuous quantitative' },
      { ru: 'Порядковая', kk: 'Реттік', en: 'Ordinal' },
      { ru: 'Номинальная', kk: 'Номиналды', en: 'Nominal' },
      { ru: 'Бинарная', kk: 'Бинарлы', en: 'Binary' },
    ],
    answer: 1,
  },
  {
    block: 'Биостатистика',
    question: {
      ru: 'Нужно сравнить долю пациентов с подавленной вирусной нагрузкой в трёх группах занятости. Какой метод подходит?',
      kk: 'Жұмыспен қамтудың үш тобында вирустық жүктемесі басылған пациенттердің үлесін салыстыру керек. Қай әдіс сәйкес келеді?',
      en: 'You need to compare the proportion of patients with suppressed viral load across three employment groups. Which method fits?',
    },
    options: [
      { ru: 't-критерий Стьюдента', kk: 'Стьюдент t-критерийі', en: "Student's t-test" },
      { ru: 'Корреляция Пирсона', kk: 'Пирсон корреляциясы', en: 'Pearson correlation' },
      { ru: 'χ²-критерий Пирсона', kk: 'Пирсонның χ²-критерийі', en: "Pearson's χ² test" },
      { ru: 'Парный t-критерий', kk: 'Жұптық t-критерий', en: 'Paired t-test' },
    ],
    answer: 2,
  },
  {
    block: 'Интерпретация',
    question: {
      ru: 'ОШ = 2,1; 95% ДИ 0,8–5,4. Какой вывод корректен?',
      kk: 'МҚ (OR) = 2,1; 95% СА (CI) 0,8–5,4. Қай қорытынды дұрыс?',
      en: 'OR = 2.1; 95% CI 0.8–5.4. Which conclusion is correct?',
    },
    options: [
      { ru: 'Связь доказана, шансы выше в 2,1 раза', kk: 'Байланыс дәлелденді, мүмкіндік 2,1 есе жоғары', en: 'The association is proven, the odds are 2.1 times higher' },
      { ru: 'Связь не доказана: ДИ включает 1', kk: 'Байланыс дәлелденбеді: СА 1-ді қамтиды', en: 'The association is not shown: the CI includes 1' },
      { ru: 'Риск выше на 110%', kk: 'Тәуекел 110%-ға жоғары', en: 'The risk is 110% higher' },
      { ru: 'Нельзя ничего сказать без p-значения', kk: 'p-мәнінсіз ештеңе айту мүмкін емес', en: 'Nothing can be said without a p-value' },
    ],
    answer: 1,
  },
  {
    block: 'Работа с ИИ',
    question: {
      ru: 'ИИ пишет: «p = 0,03 означает, что гипотеза верна с вероятностью 97%». Как оценить этот ответ?',
      kk: 'ЖИ былай жазады: «p = 0,03 гипотезаның 97% ықтималдықпен дұрыс екенін білдіреді». Бұл жауапты қалай бағалайсыз?',
      en: 'An AI writes: “p = 0.03 means the hypothesis is true with 97% probability.” How do you rate this answer?',
    },
    options: [
      { ru: 'Верно', kk: 'Дұрыс', en: 'Correct' },
      { ru: 'Есть ошибка', kk: 'Қате бар', en: 'Contains an error' },
      { ru: 'Недостаточно данных', kk: 'Деректер жеткіліксіз', en: 'Not enough information' },
    ],
    answer: 1,
  },
]

export const DEFAULT_PCT: Record<string, number> = { 'Биостатистика': 60, 'Работа с данными': 55, 'Интерпретация': 50, 'Работа с ИИ': 58 }

export class DiagnosticEvaluator {
  constructor(private questions: DiagnosticQuestion[] = DEMO_DIAGNOSTIC) {}

  get count() { return this.questions.length }
  question(i: number) { return this.questions[i] }

  /** Демо-проценты по компетенциям (как в прежней версии). */
  percentages(answers: (number | null)[]): Record<string, number> {
    const right = (block: Block) => this.questions.some((q, i) => q.block === block && answers[i] === q.answer)
    return {
      'Биостатистика': right('Биостатистика') ? 72 : 41,
      'Работа с данными': right('Работа с данными') ? 68 : 38,
      'Интерпретация': right('Интерпретация') ? 64 : 35,
      'Работа с ИИ': right('Работа с ИИ') ? 70 : 40,
    }
  }

  weakest(pct: Record<string, number>): string {
    return Object.entries(pct).sort((a, b) => a[1] - b[1])[0][0]
  }
}
