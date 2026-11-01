export interface DiagnosticQuestion {
  block: string
  question: string
  options: string[]
  answer: number
}

/** Демо-вариант (4 вопроса). Полные варианты А и Б по 20 вопросов — этап 3. */
export const DEMO_DIAGNOSTIC: DiagnosticQuestion[] = [
  { block: 'Работа с данными', question: 'Стадия ВИЧ-инфекции (1, 2, 3, 4) — это какая переменная?', options: ['Количественная непрерывная', 'Порядковая', 'Номинальная', 'Бинарная'], answer: 1 },
  { block: 'Биостатистика', question: 'Нужно сравнить долю пациентов с подавленной вирусной нагрузкой в трёх группах занятости. Какой метод подходит?', options: ['t-критерий Стьюдента', 'Корреляция Пирсона', 'χ²-критерий Пирсона', 'Парный t-критерий'], answer: 2 },
  { block: 'Интерпретация', question: 'ОШ = 2,1; 95% ДИ 0,8–5,4. Какой вывод корректен?', options: ['Связь доказана, шансы выше в 2,1 раза', 'Связь не доказана: ДИ включает 1', 'Риск выше на 110%', 'Нельзя ничего сказать без p-значения'], answer: 1 },
  { block: 'Работа с ИИ', question: 'ИИ пишет: «p = 0,03 означает, что гипотеза верна с вероятностью 97%». Как оценить этот ответ?', options: ['Верно', 'Есть ошибка', 'Недостаточно данных'], answer: 1 },
]

export const DEFAULT_PCT: Record<string, number> = { 'Биостатистика': 60, 'Работа с данными': 55, 'Интерпретация': 50, 'Работа с ИИ': 58 }

export class DiagnosticEvaluator {
  constructor(private questions: DiagnosticQuestion[] = DEMO_DIAGNOSTIC) {}

  get count() { return this.questions.length }
  question(i: number) { return this.questions[i] }

  /** Демо-проценты по компетенциям (как в прежней версии). */
  percentages(answers: (number | null)[]): Record<string, number> {
    const right = (block: string) => this.questions.some((q, i) => q.block === block && answers[i] === q.answer)
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
