import type { Lang } from '@/api/types'
import type { CaseDefinition, Pattern } from '@/domain/cases/CaseDefinition'
import { int, rng, shuffledUnits } from '../shared/synthetic'

/**
 * Кейс 22 (специалисты). Стадия ВИЧ-инфекции и вирусная супрессия: регрессия Пуассона с робастными (HC0)
 * ошибками → отношение распространённостей (PR). Вымышленный кейс (Claude, 17.11.2026; пакет v0.2 не
 * использовался) — нужна экспертиза. Таблица stage × vl_suppressed: 1 — 72/80, 2 — 72/90, 3 — 56/80, 4 — 25/50; n = 300.
 * Эталон (statsmodels GLM Poisson, cov_type=HC0): PR 0,889 (0,783–1,009; p = 0,068), 0,778 (0,662–0,914; p = 0,0022),
 * 0,556 (0,417–0,740; p = 5,8e-05).
 */
const SEX: Record<Lang, { m: string; f: string; bad: string }> = {
  ru: { m: 'М', f: 'Ж', bad: 'M (лат.)' }, kk: { m: 'Е', f: 'Ә', bad: 'E (лат.)' }, en: { m: 'M', f: 'F', bad: 'male' },
}

export function generateCase22Rows(lang: Lang = 'ru') {
  const R = rng(2222)
  const units = shuffledUnits<[number, number]>(R, [
    [[1, 1], 72], [[1, 0], 8], [[2, 1], 72], [[2, 0], 18], [[3, 1], 56], [[3, 0], 24], [[4, 1], 25], [[4, 0], 25],
  ])
  const rows = units.map(([stage, sup], i) => ({
    id: i + 1,
    age: int(R, 20, 66),
    sex: R() < 0.6 ? SEX[lang].m : SEX[lang].f,
    stage,
    viral_load: sup ? Math.round(R() * 39) : Math.round(Math.exp(4 + R() * 7)),
    vl_suppressed: sup,
  }))
  // «грязь» для шага 2 (строка 9: нагрузка противоречит отметке о супрессии)
  rows[1].stage = 5
  rows[8].viral_load = rows[8].vl_suppressed ? 15000 : 12
  rows[12].sex = SEX[lang].bad
  return rows
}

const PATTERNS = {
  shares: { source: '(\\d{2}[,.]?\\d?\\s?%)|доля|доли|процент|үлес|пайыз|proportion|percent', flags: 'i' },
  pr: { source: '(\\bPR\\b|отношени[ея] распростран|prevalence ratio|таралу|0[,.]\\d{2,3}|доверит|сенім|confidence)', flags: 'i' },
  stage2: { source: '(включает 1|1-ді қамтиды|includes 1|незначим|не значим|не доказ|маңызды емес|дәлелденбе|not significant|0[,.]068|1[,.]0[01])', flags: 'i' },
  limitation: { source: '(причин|огранич|наблюдат|одномомент|поперечн|cross-?sectional|смешив|confound|себеп|шектеу|бақылау|көлденең|caus|limit|observational|associat|ассоци)', flags: 'i' },
  aiTrap: { source: '(44|0[,.]56.{0,40}(раз|times|есе)|1\\s?[-−–]\\s?0[,.]56|\\bPR\\b|отношени[ея] (распростран|долей)|prevalence ratio|ratio|таралу қатынасы|не на 56|not 56)', flags: 'i' },
} satisfies Record<string, Pattern>

interface Text {
  title: string
  shortTitle: string
  situation: CaseDefinition['situation']
  dataErrors: Record<number, string>
  retryHint: string
  allFoundNote: string
  variables: Record<'id' | 'age' | 'sex' | 'stage' | 'vl' | 'sup', string>
  method: Omit<CaseDefinition['method'], 'correct'>
  errors: CaseDefinition['code']['errors']
  chartTitle: string
  stageLabel: (n: number) => string
  checklist: [string, string, string, string]
  fragments: string[]
  debrief: CaseDefinition['debrief']
  tutor: CaseDefinition['tutor']['quick']
}

const TEXT: Record<Lang, Text> = {
  ru: {
    title: 'Стадия ВИЧ-инфекции и вирусная супрессия',
    shortTitle: 'Стадия ВИЧ и супрессия',
    situation: {
      paragraphs: [
        'Вы — эпидемиолог-аналитик центра по профилактике ВИЧ-инфекции Учебной территории. Для отчёта о качестве помощи нужно оценить, как клиническая стадия ВИЧ-инфекции связана с вирусной супрессией у пациентов на АРТ.',
        'Одномоментное исследование: **300** пациентов, клинические стадии 1–4 по классификации ВОЗ. Вирусная супрессия (≤40 копий/мл) достигнута примерно у трёх четвертей пациентов — исход частый, поэтому отношение шансов будет плохо отражать отношение долей.',
      ],
      goal: 'Что вы будете уметь после кейса: оценивать отношение распространённостей (PR) регрессией Пуассона с робастными стандартными ошибками, интерпретировать ДИ, включающий 1, и объяснять, почему при частом исходе ОШ ≠ PR.',
    },
    dataErrors: {
      2: 'Стадия 5 — в классификации ВОЗ только стадии 1–4',
      9: 'Вирусная нагрузка противоречит отметке о супрессии (порог ≤40 копий/мл)',
      13: 'Пол закодирован латинской буквой — несогласованное кодирование',
    },
    retryHint: 'Проверьте допустимые значения стадии, согласованность вирусной нагрузки с отметкой о супрессии и кодирование пола.',
    allFoundNote: 'Все три проблемы найдены. В анализе значения исправлены по медицинской карте; на итог по стадиям они не влияют.',
    variables: {
      id: 'Номер пациента', age: 'Возраст, лет', sex: 'Пол', stage: 'Клиническая стадия ВИЧ-инфекции (1–4)',
      vl: 'Вирусная нагрузка, копий/мл', sup: 'Вирусная супрессия (1 — да, 0 — нет)',
    },
    method: {
      question: 'Нужно оценить, во сколько раз доля пациентов с супрессией на стадиях 2–4 отличается от стадии 1 (отношение распространённостей, PR), с 95% ДИ. Исход частый (около 75%). Какой метод подходит?',
      options: ['Логистическая регрессия (отношение шансов)', 'Регрессия Пуассона с робастными ошибками (отношение распространённостей)', 'χ²-критерий для таблицы 4×2 без оценки эффекта', 'Линейная регрессия вирусной нагрузки', 'Регрессия Кокса'],
      retryHint: 'Подумайте: при частом исходе ОШ заметно отличается от отношения долей. Какая модель даёт отношение долей напрямую и что тогда нужно сделать со стандартными ошибками?',
      failNote: 'Обе попытки использованы. Направление: при частом бинарном исходе отношение распространённостей оценивают регрессией Пуассона с робастными (сэндвич) стандартными ошибками. Метод отмечен в дебрифинге как зона роста.',
    },
    errors: {
      R: 'Error in eval(predvars, data, env): объект не найден — проверьте названия столбцов.',
      Python: 'PatsyError: название столбца не найдено в данных.',
    },
    chartTitle: 'Доля пациентов с вирусной супрессией по стадиям',
    stageLabel: n => `Стадия ${n}`,
    checklist: ['Доли супрессии по стадиям', 'PR с 95% ДИ относительно стадии 1', 'Стадия 2: ДИ включает 1 — различие не доказано', 'Ограничения: одномоментный дизайн, нет поправки на другие факторы'],
    fragments: [
      'Доля пациентов с супрессией снижается от 90% на стадии 1 до 50% на стадии 4.',
      'Регрессия Пуассона с робастными ошибками: PR = 0,89 (0,78–1,01), 0,78 (0,66–0,91) и 0,56 (0,42–0,74) для стадий 2, 3 и 4.',
      'Следовательно, на стадии 4 вероятность супрессии на 56% ниже, чем на стадии 1.',
      'Различие между стадиями 1 и 2 статистически не доказано.',
    ],
    debrief: {
      referenceConclusion: 'Эталонный вывод: доля пациентов с вирусной супрессией снижается со стадией: 90% (стадия 1), 80%, 70% и 50% (стадия 4). По сравнению со стадией 1: стадия 2 — PR = 0,89 (95% ДИ 0,78–1,01; p = 0,068), различие не доказано, ДИ включает 1; стадия 3 — PR = 0,78 (0,66–0,91); стадия 4 — PR = 0,56 (0,42–0,74), то есть доля супрессии примерно на 44% ниже. Исследование одномоментное и без поправки на другие факторы (длительность АРТ, приверженность) — это связь, а не причинный эффект.',
      typesRepeat: 'Типы переменных: порядковая стадия и бинарный исход',
      methodSecondTryRepeat: 'Почему при частом исходе — регрессия Пуассона, а не логистическая',
      methodFailedRepeat: 'Регрессия Пуассона с робастными ошибками',
      aiFound: 'Найдена ошибка ИИ: PR = 0,56 прочитано как «на 56% ниже»',
      aiMissed: 'Ошибка ИИ не найдена (фрагмент 3: PR 0,56 = снижение примерно на 44%)',
      aiRepeat: 'Интерпретация отношений PR, RR, OR',
      disputeSteps: ['Шаг 7. Интерпретация', 'Шаг 8. Проверка ИИ', 'Шаг 5. Выбор метода'],
    },
    tutor: {
      1: ['Что такое клинические стадии ВИЧ-инфекции по ВОЗ?', 'Что такое одномоментное исследование?'],
      2: ['Как проверить согласованность двух связанных столбцов?', 'Какие значения стадии допустимы?'],
      3: ['Стадия 1–4 — номинальная или порядковая переменная?', 'Как ввести порядковую переменную в регрессию?'],
      5: ['Почему при частом исходе ОШ преувеличивает эффект?', 'Зачем в регрессии Пуассона робастные (сэндвич) ошибки?'],
      6: ['Как получить робастные ошибки в R (sandwich, lmtest)?', 'Как в statsmodels задать cov_type="HC0"?'],
      9: ['Как читать PR = 0,56?'],
      10: ['Как подготовиться к следующему кейсу?'],
    },
  },

  kk: {
    title: 'АИТВ-инфекциясының сатысы және вирустық супрессия',
    shortTitle: 'АИТВ сатысы және супрессия',
    situation: {
      paragraphs: [
        'Сіз — Оқу аумағындағы АИТВ-инфекциясының алдын алу орталығының эпидемиолог-аналитигісіз. Көмек сапасы туралы есеп үшін АРТ қабылдайтын пациенттерде АИТВ-инфекциясының клиникалық сатысы вирустық супрессиямен қалай байланысты екенін бағалау керек.',
        'Көлденең (бір мезеттік) зерттеу: **300** пациент, ДДСҰ жіктемесі бойынша 1–4 клиникалық сатылар. Вирустық супрессияға (≤40 көшірме/мл) пациенттердің шамамен төрттен үші қол жеткізді — нәтиже жиі кездеседі, сондықтан мүмкіндіктер қатынасы үлестер қатынасын нашар көрсетеді.',
      ],
      goal: 'Кейстен кейін не істей аласыз: таралу қатынасын (PR) робаст стандартты қателері бар Пуассон регрессиясымен бағалау, 1-ді қамтитын СА-ны түсіндіру және жиі нәтижеде неге МҚ ≠ PR екенін түсіндіру.',
    },
    dataErrors: {
      2: '5-саты — ДДСҰ жіктемесінде тек 1–4 сатылар бар',
      9: 'Вирустық жүктеме супрессия белгісіне қайшы келеді (шегі ≤40 көшірме/мл)',
      13: 'Жынысы латын әрпімен кодталған — кодтау біркелкі емес',
    },
    retryHint: 'Сатының рұқсат етілген мәндерін, вирустық жүктеменің супрессия белгісімен сәйкестігін және жыныстың кодталуын тексеріңіз.',
    allFoundNote: 'Үш мәселенің бәрі табылды. Талдауда мәндер медициналық карта бойынша түзетілді; олар сатылар бойынша қорытындыға әсер етпейді.',
    variables: {
      id: 'Пациент нөмірі', age: 'Жасы, жыл', sex: 'Жынысы', stage: 'АИТВ-инфекциясының клиникалық сатысы (1–4)',
      vl: 'Вирустық жүктеме, көшірме/мл', sup: 'Вирустық супрессия (1 — иә, 0 — жоқ)',
    },
    method: {
      question: '2–4 сатылардағы супрессиясы бар пациенттер үлесі 1-сатыдан неше есе ерекшеленетінін (таралу қатынасы, PR) 95% СА-мен бағалау керек. Нәтиже жиі (шамамен 75%). Қай әдіс сәйкес келеді?',
      options: ['Логистикалық регрессия (мүмкіндіктер қатынасы)', 'Робаст қателері бар Пуассон регрессиясы (таралу қатынасы)', 'Әсерді бағаламайтын 4×2 кестесіне χ²-критерий', 'Вирустық жүктеменің сызықтық регрессиясы', 'Кокс регрессиясы'],
      retryHint: 'Ойланыңыз: нәтиже жиі болғанда МҚ үлестер қатынасынан айтарлықтай ерекшеленеді. Қай модель үлестер қатынасын тікелей береді және сонда стандартты қателермен не істеу керек?',
      failNote: 'Екі әрекет те пайдаланылды. Бағыт: бинарлы нәтиже жиі болғанда таралу қатынасы робаст (сэндвич) стандартты қателері бар Пуассон регрессиясымен бағаланады. Әдіс дебрифингте даму аймағы ретінде белгіленді.',
    },
    errors: {
      R: 'Error in eval(predvars, data, env): нысан табылмады — баған атауларын тексеріңіз.',
      Python: 'PatsyError: деректерде мұндай баған атауы жоқ.',
    },
    chartTitle: 'Сатылар бойынша вирустық супрессиясы бар пациенттер үлесі',
    stageLabel: n => `${n}-саты`,
    checklist: ['Сатылар бойынша супрессия үлестері', '1-сатыға қатысты 95% СА-мен PR', '2-саты: СА 1-ді қамтиды — айырма дәлелденбеген', 'Шектеулер: көлденең дизайн, басқа факторларға түзету жоқ'],
    fragments: [
      'Супрессиясы бар пациенттер үлесі 1-сатыдағы 90%-дан 4-сатыдағы 50%-ға дейін төмендейді.',
      'Робаст қателері бар Пуассон регрессиясы: 2, 3 және 4-сатылар үшін PR = 0,89 (0,78–1,01), 0,78 (0,66–0,91) және 0,56 (0,42–0,74).',
      'Демек, 4-сатыда супрессия ықтималдығы 1-сатыға қарағанда 56%-ға төмен.',
      '1 және 2-сатылар арасындағы айырма статистикалық тұрғыдан дәлелденбеген.',
    ],
    debrief: {
      referenceConclusion: 'Эталон қорытынды: вирустық супрессиясы бар пациенттер үлесі сатыға қарай төмендейді: 90% (1-саты), 80%, 70% және 50% (4-саты). 1-сатымен салыстырғанда: 2-саты — PR = 0,89 (95% СА 0,78–1,01; p = 0,068), айырма дәлелденбеген, СА 1-ді қамтиды; 3-саты — PR = 0,78 (0,66–0,91); 4-саты — PR = 0,56 (0,42–0,74), яғни супрессия үлесі шамамен 44%-ға төмен. Зерттеу көлденең және басқа факторларға (АРТ ұзақтығы, бейімділік) түзетусіз — бұл себепті әсер емес, байланыс.',
      typesRepeat: 'Айнымалылар түрлері: реттік саты және бинарлы нәтиже',
      methodSecondTryRepeat: 'Нәтиже жиі болғанда неге логистикалық емес, Пуассон регрессиясы',
      methodFailedRepeat: 'Робаст қателері бар Пуассон регрессиясы',
      aiFound: 'ЖИ қатесі табылды: PR = 0,56 «56%-ға төмен» деп оқылды',
      aiMissed: 'ЖИ қатесі табылмады (3-фрагмент: PR 0,56 = шамамен 44%-ға төмендеу)',
      aiRepeat: 'PR, RR, OR қатынастарын түсіндіру',
      disputeSteps: ['7-қадам. Интерпретация', '8-қадам. ЖИ-ді тексеру', '5-қадам. Әдісті таңдау'],
    },
    tutor: {
      1: ['ДДСҰ бойынша АИТВ-инфекциясының клиникалық сатылары қандай?', 'Көлденең (бір мезеттік) зерттеу деген не?'],
      2: ['Өзара байланысты екі бағанның сәйкестігін қалай тексеруге болады?', 'Сатының қандай мәндері рұқсат етілген?'],
      3: ['1–4 саты — номиналды ма, әлде реттік айнымалы ма?', 'Реттік айнымалыны регрессияға қалай енгізуге болады?'],
      5: ['Неге нәтиже жиі болғанда МҚ әсерді асыра көрсетеді?', 'Пуассон регрессиясында робаст (сэндвич) қателер не үшін керек?'],
      6: ['R-де робаст қателерді қалай алуға болады (sandwich, lmtest)?', 'statsmodels-те cov_type="HC0" қалай беріледі?'],
      9: ['PR = 0,56 қалай оқылады?'],
      10: ['Келесі кейске қалай дайындалуға болады?'],
    },
  },

  en: {
    title: 'HIV stage and viral suppression',
    shortTitle: 'HIV stage and suppression',
    situation: {
      paragraphs: [
        'You are an analytical epidemiologist at the HIV prevention centre of the Training Territory. For a quality-of-care report, you need to assess how the clinical stage of HIV infection is associated with viral suppression in patients on ART.',
        'Cross-sectional study: **300** patients, WHO clinical stages 1–4. About three quarters of patients achieved viral suppression (≤40 copies/mL) — the outcome is common, so the odds ratio will poorly reflect the ratio of proportions.',
      ],
      goal: 'After this case you will be able to estimate the prevalence ratio (PR) with Poisson regression and robust standard errors, interpret a CI that includes 1, and explain why OR ≠ PR when the outcome is common.',
    },
    dataErrors: {
      2: 'Stage 5 — the WHO classification has stages 1–4 only',
      9: 'Viral load contradicts the suppression flag (threshold ≤40 copies/mL)',
      13: 'Sex coded as «male» instead of «M» — inconsistent coding',
    },
    retryHint: 'Check the allowed values of stage, whether viral load agrees with the suppression flag, and how sex is coded.',
    allFoundNote: 'All three problems found. The values are corrected from the medical records in the analysis; they do not affect the result by stage.',
    variables: {
      id: 'Patient number', age: 'Age, years', sex: 'Sex', stage: 'Clinical stage of HIV infection (1–4)',
      vl: 'Viral load, copies/mL', sup: 'Viral suppression (1 — yes, 0 — no)',
    },
    method: {
      question: 'You need to estimate how many times the proportion of patients with suppression at stages 2–4 differs from stage 1 (prevalence ratio, PR), with 95% CIs. The outcome is common (about 75%). Which method fits?',
      options: ['Logistic regression (odds ratio)', 'Poisson regression with robust errors (prevalence ratio)', 'χ² test for a 4×2 table without an effect estimate', 'Linear regression of viral load', 'Cox regression'],
      retryHint: 'Think: with a common outcome, the OR differs noticeably from the ratio of proportions. Which model gives the ratio of proportions directly, and what must then be done with the standard errors?',
      failNote: 'Both attempts used. Direction: with a common binary outcome, the prevalence ratio is estimated with Poisson regression and robust (sandwich) standard errors. The method is marked as an area for growth in the debriefing.',
    },
    errors: {
      R: 'Error in eval(predvars, data, env): object not found — check the column names.',
      Python: 'PatsyError: column name not found in the data.',
    },
    chartTitle: 'Proportion of patients with viral suppression by stage',
    stageLabel: n => `Stage ${n}`,
    checklist: ['Suppression proportions by stage', 'PR with 95% CI relative to stage 1', 'Stage 2: the CI includes 1 — difference not shown', 'Limitations: cross-sectional design, no adjustment for other factors'],
    fragments: [
      'The proportion of patients with suppression falls from 90% at stage 1 to 50% at stage 4.',
      'Poisson regression with robust errors: PR = 0.89 (0.78–1.01), 0.78 (0.66–0.91) and 0.56 (0.42–0.74) for stages 2, 3 and 4.',
      'Therefore, at stage 4 the probability of suppression is 56% lower than at stage 1.',
      'The difference between stages 1 and 2 is not statistically shown.',
    ],
    debrief: {
      referenceConclusion: 'Reference conclusion: the proportion of patients with viral suppression falls with stage: 90% (stage 1), 80%, 70% and 50% (stage 4). Compared with stage 1: stage 2 — PR = 0.89 (95% CI 0.78–1.01; p = 0.068), the difference is not shown, the CI includes 1; stage 3 — PR = 0.78 (0.66–0.91); stage 4 — PR = 0.56 (0.42–0.74), i.e. the proportion with suppression is about 44% lower. The study is cross-sectional and not adjusted for other factors (ART duration, adherence) — this is an association, not a causal effect.',
      typesRepeat: 'Variable types: ordinal stage and binary outcome',
      methodSecondTryRepeat: 'Why Poisson rather than logistic regression for a common outcome',
      methodFailedRepeat: 'Poisson regression with robust errors',
      aiFound: 'AI error found: PR = 0.56 was read as “56% lower”',
      aiMissed: 'AI error not found (fragment 3: PR 0.56 = about 44% lower)',
      aiRepeat: 'Interpreting ratios: PR, RR, OR',
      disputeSteps: ['Step 7. Interpretation', 'Step 8. AI check', 'Step 5. Choosing the method'],
    },
    tutor: {
      1: ['What are the WHO clinical stages of HIV infection?', 'What is a cross-sectional study?'],
      2: ['How do I check that two related columns agree?', 'Which stage values are allowed?'],
      3: ['Is stage 1–4 a nominal or an ordinal variable?', 'How do I enter an ordinal variable into a regression?'],
      5: ['Why does the OR exaggerate the effect when the outcome is common?', 'Why does Poisson regression need robust (sandwich) errors?'],
      6: ['How do I get robust errors in R (sandwich, lmtest)?', 'How do I set cov_type="HC0" in statsmodels?'],
      9: ['How do I read PR = 0.56?'],
      10: ['How do I prepare for the next case?'],
    },
  },
}

const OUTPUTS: CaseDefinition['code']['outputs'] = {
  R: "\nz test of coefficients:\n\n             Estimate Std. Error z value  Pr(>|z|)    \n(Intercept) -0.105361   0.037268 -2.8271  0.004697 ** \nstage2      -0.117783   0.064550 -1.8247  0.068048 .  \nstage3      -0.251314   0.082134 -3.0598  0.002215 ** \nstage4      -0.587787   0.146249 -4.0191 5.843e-05 ***\n---\nSignif. codes:  0 '***' 0.001 '**' 0.01 '*' 0.05 '.' 0.1 ' ' 1\n\n                   PR     2.5 %    97.5 %\n(Intercept) 0.9000000 0.8366043 0.9681996\nstage2      0.8888889 0.7832541 1.0087703\nstage3      0.7777778 0.6621292 0.9136257\nstage4      0.5555556 0.4170996 0.7399719",
  Python: 'Intercept        0.900000\nC(stage)[T.2]    0.888889\nC(stage)[T.3]    0.777778\nC(stage)[T.4]    0.555556\ndtype: float64\n                      0         1\nIntercept      0.836604  0.968200\nC(stage)[T.2]  0.783254  1.008770\nC(stage)[T.3]  0.662129  0.913626\nC(stage)[T.4]  0.417100  0.739972',
}

export function buildCase22(lang: Lang): CaseDefinition {
  const T = TEXT[lang]
  return {
    id: '22',
    title: T.title,
    shortTitle: T.shortTitle,
    situation: T.situation,
    data: {
      fileName: 'case22_hiv_stage.csv',
      totalRows: 300,
      columns: ['id', 'age', 'sex', 'stage', 'viral_load', 'vl_suppressed'],
      preview: generateCase22Rows(lang).slice(0, 15),
      errors: T.dataErrors,
      retryHint: T.retryHint,
      allFoundNote: T.allFoundNote,
    },
    variables: [
      { key: 'id', label: T.variables.id, expected: 'id' },
      { key: 'age', label: T.variables.age, expected: 'q' },
      { key: 'sex', label: T.variables.sex, expected: 'n', accepted: ['b'] },
      { key: 'stage', label: T.variables.stage, expected: 'o' },
      { key: 'vl', label: T.variables.vl, expected: 'q' },
      { key: 'sup', label: T.variables.sup, expected: 'b', accepted: ['n'] },
    ],
    outcome: 'sup',
    method: { ...T.method, correct: 1 },
    code: {
      templates: {
        R: [
          'library(sandwich); library(lmtest)',
          'd <- read.csv("case22_hiv_stage.csv")',
          'd$stage <- factor(d$stage)',
          'm <- glm([1] ~ [0], data = d, family = poisson)',
          'V <- vcovHC(m, type = "HC0")',
          'coeftest(m, vcov = V)',
          'exp(cbind(PR = coef(m), coefci(m, vcov = V)))',
        ],
        Python: [
          'import numpy as np',
          'import pandas as pd',
          'import statsmodels.api as sm',
          'import statsmodels.formula.api as smf',
          'd = pd.read_csv("case22_hiv_stage.csv")',
          'm = smf.glm("[1] ~ C([0])", data=d, family=sm.families.Poisson()).fit(cov_type="HC0")',
          'print(np.exp(m.params))',
          'print(np.exp(m.conf_int()))',
        ],
      },
      blankAnswers: ['stage', 'vl_suppressed'],
      freeRequired: [
        { source: '(glm|GLM)' }, { source: 'poisson', flags: 'i' }, { source: 'stage' }, { source: 'vl_suppressed' },
        { source: '(vcovHC|sandwich|HC0|HC1|HC3|cov_type|robust)' },
      ],
      outputs: OUTPUTS,
      errors: T.errors,
      chart: { title: T.chartTitle, bars: [1, 2, 3, 4].map((s, i) => [T.stageLabel(s), [90.0, 80.0, 70.0, 50.0][i]] as [string, number]) },
    },
    interpretation: {
      checklist: [
        { label: T.checklist[0], pattern: PATTERNS.shares },
        { label: T.checklist[1], pattern: PATTERNS.pr },
        { label: T.checklist[2], pattern: PATTERNS.stage2 },
        { label: T.checklist[3], pattern: PATTERNS.limitation },
      ],
    },
    aiTrap: { fragments: T.fragments, wrongIndex: 2, explanation: PATTERNS.aiTrap },
    debrief: T.debrief,
    tutor: { quick: T.tutor },
  }
}
