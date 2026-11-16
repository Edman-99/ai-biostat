import type { Localized } from '@/core/localized'
import { wordCount } from '@/core/text'
import { toRegExp, type Pattern } from '@/domain/cases/CaseDefinition'

/**
 * Тренажёр «Проверка ИИ» вне кейса: утверждение ИИ → оценка (неверно / верно / недостаточно данных)
 * → обоснование. Задания — данные; новое задание = новый элемент массива.
 */
export type Verdict = 'wrong' | 'right' | 'unknown'
export const VERDICTS: Verdict[] = ['wrong', 'right', 'unknown']

export interface AiCheckTask {
  id: string
  statement: Localized
  correct: Verdict
  /** что должно прозвучать в обосновании (RU / KZ / EN основы слов) */
  reasonPattern: Pattern
  explanation: Localized
}

export interface AiCheckAnswer {
  verdict: Verdict
  reason: string
  ok: boolean
  tries: number
}

export type CheckOutcome = 'ok' | 'wrongVerdict' | 'weakReason' | 'tooShort'

export const MIN_REASON_WORDS = 8

export const AI_CHECK_TASKS: AiCheckTask[] = [
  {
    id: 't1',
    statement: {
      ru: 'Для сравнения доли осложнений в двух независимых группах следует использовать t-критерий Стьюдента.',
      kk: 'Екі тәуелсіз топтағы асқынулар үлесін салыстыру үшін Стьюденттің t-критерийін қолдану керек.',
      en: "To compare the proportion of complications in two independent groups, Student's t-test should be used.",
    },
    correct: 'wrong',
    reasonPattern: { source: '(χ|хи|chi|фишер|fisher|категор|санат|дол[яиеюй]|үлес|proportion|частот|жиілік|бинар|binary|таблиц|кесте)', flags: 'i' },
    explanation: {
      ru: 'Доля осложнений — категориальный (бинарный) исход. Для двух независимых групп применяют χ²-критерий Пирсона, а при малых ожидаемых частотах — точный критерий Фишера. t-критерий сравнивает средние количественного признака.',
      kk: 'Асқынулар үлесі — категориялық (бинарлы) нәтиже. Екі тәуелсіз топ үшін Пирсонның χ²-критерийі, ал күтілетін жиіліктер аз болса — Фишердің дәл критерийі қолданылады. t-критерий сандық белгінің орташа мәндерін салыстырады.',
      en: "The proportion of complications is a categorical (binary) outcome. For two independent groups use Pearson's χ² test, or Fisher's exact test when expected counts are small. The t-test compares means of a quantitative variable.",
    },
  },
  {
    id: 't2',
    statement: {
      ru: 'Длительность госпитализации имеет сильную правостороннюю асимметрию. Поэтому её лучше описывать медианой и межквартильным размахом, а не средним и стандартным отклонением.',
      kk: 'Ауруханада болу ұзақтығы күшті оң жақты асимметрияға ие. Сондықтан оны орташа мән мен стандартты ауытқу емес, медиана мен квартильаралық ауқым арқылы сипаттаған дұрыс.',
      en: 'Length of hospital stay is strongly right-skewed. Therefore it is better described by the median and interquartile range than by the mean and standard deviation.',
    },
    correct: 'right',
    reasonPattern: { source: '(асимметр|ассиметр|скош|выброс|хвост|медиан|квартил|устойчив|skew|outlier|tail|median|robust|шеткі|тұрақты)', flags: 'i' },
    explanation: {
      ru: 'Верно. При сильной асимметрии длинный «хвост» смещает среднее, а медиана и межквартильный размах устойчивы к выбросам и лучше описывают типичного пациента.',
      kk: 'Дұрыс. Күшті асимметрияда ұзын «құйрық» орташа мәнді ығыстырады, ал медиана мен квартильаралық ауқым шеткі мәндерге тұрақты және типтік пациентті жақсырақ сипаттайды.',
      en: 'Correct. With strong skew, the long tail pulls the mean, while the median and IQR are robust to outliers and better describe a typical patient.',
    },
  },
  {
    id: 't3',
    statement: {
      ru: 'Коэффициент корреляции между потреблением кофе и систолическим давлением r = 0,45. Значит, связь статистически значимая.',
      kk: 'Кофе тұтыну мен систолалық қысым арасындағы корреляция коэффициенті r = 0,45. Демек, байланыс статистикалық тұрғыдан маңызды.',
      en: 'The correlation coefficient between coffee consumption and systolic blood pressure is r = 0.45. Therefore the association is statistically significant.',
    },
    correct: 'unknown',
    reasonPattern: { source: '(объ[её]м|выборк|числ[оа] (наблюд|пациент|участ)|\\bn\\b|p\\s*[-=<>]|p-?знач|p-?value|довер|(^|[^а-яё])ди([^а-яё]|$)|\\bci\\b|sample|іріктеме|көлем|p-?мән|сенім)', flags: 'i' },
    explanation: {
      ru: 'Недостаточно данных. Значимость r зависит от объёма выборки: r = 0,45 при n = 10 незначима (p ≈ 0,19), а при n = 100 — значима (p < 0,001). Нужны n и p-значение или 95% ДИ. И даже значимая корреляция не доказывает причинность.',
      kk: 'Деректер жеткіліксіз. r маңыздылығы іріктеме көлеміне байланысты: n = 10 болғанда r = 0,45 маңызды емес (p ≈ 0,19), ал n = 100 болғанда маңызды (p < 0,001). n және p-мәні немесе 95% СА (CI) керек. Маңызды корреляцияның өзі себептілікті дәлелдемейді.',
      en: 'Not enough information. The significance of r depends on sample size: r = 0.45 is not significant with n = 10 (p ≈ 0.19) but is with n = 100 (p < 0.001). You need n and a p-value or a 95% CI. Even a significant correlation does not prove causation.',
    },
  },
]

export class AiCheckEvaluator {
  constructor(readonly tasks: AiCheckTask[] = AI_CHECK_TASKS) {}

  task(id: string) { return this.tasks.find(t => t.id === id) }

  evaluate(task: AiCheckTask, verdict: Verdict, reason: string): CheckOutcome {
    if (verdict !== task.correct) return 'wrongVerdict'
    if (wordCount(reason) < MIN_REASON_WORDS) return 'tooShort'
    return toRegExp(task.reasonPattern).test(reason) ? 'ok' : 'weakReason'
  }

  /** Доля решённых заданий, % (решённым считается задание, где когда-либо был ответ «ok»). */
  successPct(answers: Record<string, AiCheckAnswer> | undefined): number | null {
    const done = this.tasks.filter(t => answers?.[t.id])
    if (!done.length) return null
    return Math.round(this.tasks.filter(t => answers?.[t.id]?.ok).length / this.tasks.length * 100)
  }
}
