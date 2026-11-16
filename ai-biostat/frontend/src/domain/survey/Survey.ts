import type { Localized } from '@/core/localized'

/**
 * Опросник обратной связи в конце пилота (решение автора 17.11.2026).
 * SUS — System Usability Scale (Brooke, 1996): 10 утверждений, 1–5; балл 0–100 считает сервер (app/main.py sus_score).
 * Студенты/специалисты: SUS + оценка частей курса + ретроспективная самооценка «до/сейчас» + 3 открытых вопроса.
 * Преподаватели: SUS (о панели) + оценка разделов панели + 3 открытых вопроса.
 * Ключи ответов — столбцы выгрузки survey.csv. KZ — перевод Claude, нужна вычитка.
 */
type Tri = [ru: string, kk: string, en: string]
const L = ([ru, kk, en]: Tri): Localized => ({ ru, kk, en })

export type ItemKind = 'scale' | 'part' | 'prepost' | 'open'
export interface SurveyItem { id: string; kind: ItemKind; text: Localized }
export interface SurveySection { id: 'sus' | 'parts' | 'self' | 'open'; items: SurveyItem[] }

const item = (id: string, kind: ItemKind, t: Tri): SurveyItem => ({ id, kind, text: L(t) })

const SUS: Tri[] = [
  ['Думаю, что я хотел(а) бы часто пользоваться этой системой.', 'Менің ойымша, мен бұл жүйені жиі пайдаланғым келеді.', 'I think that I would like to use this system frequently.'],
  ['Система показалась мне излишне сложной.', 'Жүйе маған қажетсіз күрделі болып көрінді.', 'I found the system unnecessarily complex.'],
  ['Система была простой в использовании.', 'Жүйені пайдалану оңай болды.', 'I thought the system was easy to use.'],
  ['Думаю, мне понадобилась бы помощь технического специалиста, чтобы пользоваться этой системой.', 'Бұл жүйені пайдалану үшін маған техникалық маманның көмегі қажет болар еді деп ойлаймын.', 'I think that I would need the support of a technical person to be able to use this system.'],
  ['Разные функции системы хорошо согласованы между собой.', 'Жүйенің әртүрлі функциялары бір-бірімен жақсы үйлескен.', 'I found the various functions in this system were well integrated.'],
  ['В системе слишком много несогласованности.', 'Жүйеде сәйкессіздіктер тым көп.', 'I thought there was too much inconsistency in this system.'],
  ['Думаю, большинство людей очень быстро научатся пользоваться этой системой.', 'Менің ойымша, көпшілік бұл жүйені пайдалануды өте тез үйренеді.', 'I would imagine that most people would learn to use this system very quickly.'],
  ['Пользоваться системой было очень неудобно.', 'Жүйені пайдалану өте ыңғайсыз болды.', 'I found the system very cumbersome to use.'],
  ['Я чувствовал(а) себя уверенно, работая с системой.', 'Жүйемен жұмыс істегенде өзімді сенімді сездім.', 'I felt very confident using the system.'],
  ['Мне пришлось многому научиться, прежде чем начать работать с системой.', 'Жүйемен жұмыс істеуді бастамас бұрын көп нәрсені үйренуге тура келді.', 'I needed to learn a lot of things before I could get going with this system.'],
]
const susSection: SurveySection = { id: 'sus', items: SUS.map((t, i) => item(`sus${i + 1}`, 'scale', t)) }

const OPEN: SurveySection = {
  id: 'open',
  items: [
    item('open_liked', 'open', ['Что понравилось больше всего?', 'Сізге не бәрінен көп ұнады?', 'What did you like most?']),
    item('open_hindered', 'open', ['Что мешало или было трудным?', 'Не кедергі болды немесе қиын болды?', 'What got in the way or was difficult?']),
    item('open_improve', 'open', ['Что улучшить в первую очередь?', 'Ең алдымен нені жақсарту керек?', 'What should be improved first?']),
  ],
}

export const LEARNER_SURVEY: SurveySection[] = [
  susSection,
  {
    id: 'parts',
    items: [
      item('part_cases', 'part', ['Практические кейсы (10 шагов)', 'Практикалық кейстер (10 қадам)', 'Practice cases (10 steps)']),
      item('part_code', 'part', ['Запуск кода R / Python', 'R / Python кодын іске қосу', 'Running R / Python code']),
      item('part_tutor', 'part', ['ИИ-репетитор', 'ЖИ-репетитор', 'AI tutor']),
      item('part_aicheck', 'part', ['Тренажёр «Проверка ИИ» и ловушки ИИ в кейсах', '«ЖИ-ді тексеру» жаттықтырғышы және кейстердегі ЖИ қақпандары', 'The “AI check” trainer and AI traps in cases']),
      item('part_debrief', 'part', ['Дебрифинг и обратная связь после кейса', 'Кейстен кейінгі дебрифинг және кері байланыс', 'Debriefing and feedback after a case']),
      item('part_diag', 'part', ['Входная и итоговая диагностика', 'Кіріс және қорытынды диагностика', 'Entry and final diagnostic']),
    ],
  },
  {
    id: 'self',
    items: [
      item('self_method', 'prepost', ['Я умею выбрать статистический метод под тип данных и вопрос', 'Деректер түрі мен сұраққа сай статистикалық әдісті таңдай аламын', 'I can choose a statistical method that fits the data type and the question']),
      item('self_interp', 'prepost', ['Я умею правильно интерпретировать p-значение, ДИ и размер эффекта', 'p-мәнін, СА мен әсер мөлшерін дұрыс түсіндіре аламын', 'I can correctly interpret a p-value, a CI and an effect size']),
      item('self_ai', 'prepost', ['Я умею находить ошибки в ответах ИИ по статистике', 'Статистика бойынша ЖИ жауаптарындағы қателерді таба аламын', 'I can find errors in AI answers about statistics']),
      item('self_code', 'prepost', ['Я умею выполнить анализ в R или Python', 'R немесе Python-да талдау жасай аламын', 'I can run an analysis in R or Python']),
    ],
  },
  OPEN,
]

export const TEACHER_SURVEY: SurveySection[] = [
  susSection,
  {
    id: 'parts',
    items: [
      item('tpart_review', 'part', ['Проверка работ и оспаривания', 'Жұмыстарды тексеру және даулау', 'Reviewing work and disputes']),
      item('tpart_analytics', 'part', ['Аналитика группы', 'Топ аналитикасы', 'Group analytics']),
      item('tpart_participants', 'part', ['Участники, пароли и выгрузка', 'Қатысушылар, құпиясөздер және жүктеу', 'Participants, passwords and export']),
      item('tpart_editor', 'part', ['Редактор кейсов', 'Кейс редакторы', 'Case editor']),
      item('tpart_diag', 'part', ['Управление диагностикой и опросником', 'Диагностика мен сауалнаманы басқару', 'Managing the diagnostic and the survey']),
    ],
  },
  OPEN,
]

export type SurveyAnswers = Record<string, number | string>

/** Ключи, которые надо заполнить: все SUS, все части (0 — «не пользовался»), обе оценки «до/сейчас». Открытые — по желанию. */
export function requiredKeys(sections: SurveySection[]): string[] {
  return sections.flatMap(s => s.items.flatMap(i =>
    i.kind === 'prepost' ? [`${i.id}_before`, `${i.id}_now`] : i.kind === 'open' ? [] : [i.id]))
}

export function missingKeys(sections: SurveySection[], a: SurveyAnswers): string[] {
  return requiredKeys(sections).filter(k => typeof a[k] !== 'number')
}
