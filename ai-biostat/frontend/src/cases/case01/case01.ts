import type { Lang } from '@/api/types'
import type { CaseDefinition, Pattern } from '@/domain/cases/CaseDefinition'
import { int, rng, shuffledUnits } from '../shared/synthetic'

/**
 * Кейс 1. Вспышка кори: оценка 7-1-7. Доли, 95% ДИ (точный, Клоппер–Пирсон), критерий Мак-Немара.
 * Вымышленный кейс (Claude, 17.11.2026; материалы пакета v0.2 не использовались) — нужна экспертиза.
 * Таблица: notify_ok × respond_ok = (1,1) 30, (1,0) 18, (0,1) 6, (0,0) 10; n = 64.
 * Эталон (scipy/statsmodels): 48/64 = 75,0% (62,6–85,0); 36/64 = 56,3% (43,3–68,6);
 * Мак-Немар с поправкой χ² = 5,0417, p = 0,02474.
 */
const REGION: Record<Lang, (x: string) => string> = {
  ru: x => `Регион ${x}`, kk: x => `${x} өңірі`, en: x => `Region ${x}`,
}

export function generateCase01Rows(lang: Lang = 'ru') {
  const R = rng(101)
  const units = shuffledUnits<[number, number]>(R, [[[1, 1], 30], [[1, 0], 18], [[0, 1], 6], [[0, 0], 10]])
  const rows = units.map(([n, r], i) => ({
    id: i + 1,
    region: REGION[lang]('ABCD'[int(R, 0, 3)]),
    detect_days: int(R, 1, 12),
    notify_days: n ? int(R, 0, 1) : int(R, 2, 5),
    respond_days: r ? int(R, 1, 7) : int(R, 8, 17),
    notify_ok: n,
    respond_ok: r,
  }))
  // «грязь» для шага 2
  rows[2].detect_days = 700
  rows[6].notify_days = -1
  rows[10].region = REGION[lang]('E')
  return rows
}

const PATTERNS = {
  shares: { source: '(\\d{2}[,.]?\\d?\\s?%)|доля|доли|процент|үлес|пайыз|proportion|percent', flags: 'i' },
  ci: { source: '(доверит|интервал|сенім|confidence|interval|95\\s?%)', flags: 'i' },
  test: { source: '(мак-?немар|mcnemar|макнемар|5[,.]04|p\\s*[=<])', flags: 'i' },
  conclusion: { source: '(реагир|жауап|response|respond|улучш|жақсар|improv|ниже|хуже|төмен|lower|weak|слаб|әлсіз)', flags: 'i' },
  aiTrap: { source: '(\\bp\\b.{0,30}(не |емес|not )|не (размер|величин|разниц)|18[,.]?[78]|19|размер|величин|effect|difference|size|айырма|мөлшер|шама|пункт|тармақ|point)', flags: 'i' },
} satisfies Record<string, Pattern>

interface Text {
  situation: CaseDefinition['situation']
  dataErrors: Record<number, string>
  retryHint: string
  allFoundNote: string
  variables: Record<'id' | 'region' | 'detect' | 'notify' | 'respond' | 'notifyOk' | 'respondOk', string>
  method: Omit<CaseDefinition['method'], 'correct'>
  outputsPython: string
  errors: CaseDefinition['code']['errors']
  chartTitle: string
  bars: [string, string]
  checklist: [string, string, string, string]
  fragments: string[]
  debrief: CaseDefinition['debrief']
  tutor: CaseDefinition['tutor']['quick']
}

const TEXT: Record<Lang, Text & { title: string; shortTitle: string }> = {
  ru: {
    title: 'Вспышка кори на учебной территории: оценка 7-1-7',
    shortTitle: 'Вспышка кори',
    situation: {
      paragraphs: [
        'Вы — эпидемиолог центра санитарно-эпидемиологического контроля Учебной территории. Зимой в четырёх регионах (A–D) зарегистрирована вспышка кори. Своевременность реагирования оценивают по метрике **7-1-7**: событие выявлено не позже 7 дней от появления, о нём оповещены не позже 1 дня после выявления, меры реагирования начаты не позже 7 дней после оповещения.',
        'В наборе данных — **64** сигнала о случаях кори. Руководитель спрашивает: какая доля событий уложилась в цель «1 день на оповещение» и в цель «7 дней на реагирование» и различается ли выполнение этих двух целей?',
      ],
      goal: 'Что вы будете уметь после кейса: рассчитывать долю и её 95% доверительный интервал, отличать связанные (парные) выборки от независимых и применять критерий Мак-Немара.',
    },
    dataErrors: {
      3: 'Срок выявления 700 дней — опечатка (вероятно, 7)',
      7: 'Отрицательный срок оповещения — ошибка ввода',
      11: 'Региона E нет — в исследовании только регионы A–D',
    },
    retryHint: 'Проверьте, могут ли сроки быть такими, и сверьте список регионов с условием.',
    allFoundNote: 'Все три проблемы найдены. В анализе значения исправлены по первичным документам; на доли выполнения целей они не влияют.',
    variables: {
      id: 'Номер события', region: 'Регион', detect: 'Срок выявления, дней', notify: 'Срок оповещения, дней',
      respond: 'Срок реагирования, дней', notifyOk: 'Оповещение ≤1 дня (1 — да, 0 — нет)', respondOk: 'Реагирование ≤7 дней (1 — да, 0 — нет)',
    },
    method: {
      question: 'Нужно сравнить долю событий, уложившихся в цель «1 день на оповещение», и долю уложившихся в цель «7 дней на реагирование». Обе цели оценены на одних и тех же 64 событиях. Какой метод подходит?',
      options: ['χ²-критерий Пирсона для независимых групп', 'Критерий Мак-Немара для связанных долей', 'Парный t-критерий', 'Корреляция Спирмена', 'Критерий Манна–Уитни'],
      retryHint: 'Подумайте: это две разные группы событий или одни и те же события, оценённые дважды? Для связанных бинарных данных нужен особый критерий.',
      failNote: 'Обе попытки использованы. Направление: если одни и те же объекты оценены дважды по бинарному признаку, доли сравнивают критерием Мак-Немара. Метод отмечен в дебрифинге как зона роста.',
    },
    outputsPython: 'notify_ok 0.75 (0.6260095431181809, 0.8498444259147272)\nrespond_ok 0.5625 (0.43275890006645973, 0.686265246451504)\npvalue      0.024744672046398908\nstatistic   5.041666666666667',
    errors: {
      R: 'Error in table(...): все аргументы должны иметь одинаковую длину — столбец не найден.',
      Python: 'KeyError: столбец не найден в таблице.',
    },
    chartTitle: 'Доля событий, уложившихся в цели 7-1-7',
    bars: ['Оповещение ≤1 дня', 'Реагирование ≤7 дней'],
    checklist: ['Доли выполнения обеих целей', '95% доверительные интервалы', 'Критерий Мак-Немара: статистика и p-значение', 'Какая цель выполняется хуже и что улучшать'],
    fragments: [
      'Цель «1 день на оповещение» выполнена в 75% событий (95% ДИ 63–85%), цель «7 дней на реагирование» — в 56% (95% ДИ 43–69%).',
      'Критерий Мак-Немара: χ² = 5,04; p = 0,025.',
      'Значит, разница между выполнением двух целей составляет 2,5%.',
      'Приоритет для улучшения — этап реагирования.',
    ],
    debrief: {
      referenceConclusion: 'Эталонный вывод: цель «1 день на оповещение» выполнена в 75,0% событий (95% ДИ 62,6–85,0%), цель «7 дней на реагирование» — в 56,3% (95% ДИ 43,3–68,6%). Различие значимо (критерий Мак-Немара, χ² = 5,04; p = 0,025) и составляет около 19 процентных пунктов: слабое звено — реагирование. p-значение говорит о надёжности различия, а не о его величине.',
      typesRepeat: 'Типы переменных: количественные сроки и бинарные индикаторы 0/1',
      methodSecondTryRepeat: 'Связанные и независимые выборки',
      methodFailedRepeat: 'Критерий Мак-Немара для парных долей',
      aiFound: 'Найдена ошибка ИИ: p-значение принято за величину различия',
      aiMissed: 'Ошибка ИИ не найдена (фрагмент 3: p-значение ≠ размер различия)',
      aiRepeat: 'p-значение и размер эффекта',
      disputeSteps: ['Шаг 7. Интерпретация', 'Шаг 8. Проверка ИИ', 'Шаг 3. Типы переменных'],
    },
    tutor: {
      1: ['Что означают цели 7-1-7?', 'Зачем оценивать своевременность реагирования на вспышку?'],
      2: ['Какие ошибки бывают в сроках и датах?', 'Как проверить список категорий на опечатки?'],
      3: ['Переменная 0/1 — количественная или категориальная?', 'Что такое исход в исследовании?'],
      5: ['Чем связанные выборки отличаются от независимых?', 'Когда применяют критерий Мак-Немара?'],
      6: ['Как рассчитать 95% ДИ для доли в R?', 'Какие клетки таблицы 2×2 использует критерий Мак-Немара?'],
      9: ['Чем p-значение отличается от размера эффекта?'],
      10: ['Как подготовиться к следующему кейсу?'],
    },
  },

  kk: {
    title: 'Оқу аумағындағы қызылша өршуі: 7-1-7 бағалауы',
    shortTitle: 'Қызылша өршуі',
    situation: {
      paragraphs: [
        'Сіз — Оқу аумағындағы санитариялық-эпидемиологиялық бақылау орталығының эпидемиологысыз. Қыста төрт өңірде (A–D) қызылша өршуі тіркелді. Ден қоюдың уақтылылығы **7-1-7** көрсеткішімен бағаланады: оқиға пайда болғаннан кейін 7 күннен кешіктірмей анықталады, анықталғаннан кейін 1 күннен кешіктірмей хабарланады, хабарланғаннан кейін 7 күннен кешіктірмей ден қою шаралары басталады.',
        'Деректер жинағында қызылша жағдайлары туралы **64** сигнал бар. Басшы сұрайды: оқиғалардың қандай үлесі «хабарлауға 1 күн» және «ден қоюға 7 күн» мақсаттарына сыйды және осы екі мақсаттың орындалуы ерекшелене ме?',
      ],
      goal: 'Кейстен кейін не істей аласыз: үлесті және оның 95% сенім аралығын (СА, CI) есептеу, байланысқан (жұптық) іріктемелерді тәуелсіз іріктемелерден ажырату және Мак-Немар критерийін қолдану.',
    },
    dataErrors: {
      3: 'Анықтау мерзімі 700 күн — қате басылған (шамасы, 7)',
      7: 'Хабарлаудың теріс мерзімі — енгізу қатесі',
      11: 'E өңірі жоқ — зерттеуде тек A–D өңірлері бар',
    },
    retryHint: 'Мерзімдер осындай болуы мүмкін бе, тексеріңіз және өңірлер тізімін шартпен салыстырыңыз.',
    allFoundNote: 'Үш мәселенің бәрі табылды. Талдауда мәндер бастапқы құжаттар бойынша түзетілді; олар мақсаттардың орындалу үлестеріне әсер етпейді.',
    variables: {
      id: 'Оқиға нөмірі', region: 'Өңір', detect: 'Анықтау мерзімі, күн', notify: 'Хабарлау мерзімі, күн',
      respond: 'Ден қою мерзімі, күн', notifyOk: 'Хабарлау ≤1 күн (1 — иә, 0 — жоқ)', respondOk: 'Ден қою ≤7 күн (1 — иә, 0 — жоқ)',
    },
    method: {
      question: '«Хабарлауға 1 күн» мақсатына сыйған оқиғалар үлесін және «ден қоюға 7 күн» мақсатына сыйғандар үлесін салыстыру керек. Екі мақсат та сол бір 64 оқиғада бағаланды. Қай әдіс сәйкес келеді?',
      options: ['Тәуелсіз топтарға арналған Пирсонның χ²-критерийі', 'Байланысқан үлестерге арналған Мак-Немар критерийі', 'Жұптық t-критерий', 'Спирмен корреляциясы', 'Манн–Уитни критерийі'],
      retryHint: 'Ойланыңыз: бұл оқиғалардың екі түрлі тобы ма, әлде сол бір оқиғалар екі рет бағаланды ма? Байланысқан бинарлы деректерге арнайы критерий керек.',
      failNote: 'Екі әрекет те пайдаланылды. Бағыт: егер сол бір нысандар бинарлы белгі бойынша екі рет бағаланса, үлестер Мак-Немар критерийімен салыстырылады. Әдіс дебрифингте даму аймағы ретінде белгіленді.',
    },
    outputsPython: 'notify_ok 0.75 (0.6260095431181809, 0.8498444259147272)\nrespond_ok 0.5625 (0.43275890006645973, 0.686265246451504)\npvalue      0.024744672046398908\nstatistic   5.041666666666667',
    errors: {
      R: 'Error in table(...): барлық аргументтердің ұзындығы бірдей болуы керек — баған табылмады.',
      Python: 'KeyError: кестеде мұндай баған жоқ.',
    },
    chartTitle: '7-1-7 мақсаттарына сыйған оқиғалар үлесі',
    bars: ['Хабарлау ≤1 күн', 'Ден қою ≤7 күн'],
    checklist: ['Екі мақсаттың орындалу үлестері', '95% сенім аралықтары', 'Мак-Немар критерийі: статистика және p-мәні', 'Қай мақсат нашар орындалады және нені жақсарту керек'],
    fragments: [
      '«Хабарлауға 1 күн» мақсаты оқиғалардың 75%-ында орындалды (95% СА 63–85%), «ден қоюға 7 күн» мақсаты — 56%-ында (95% СА 43–69%).',
      'Мак-Немар критерийі: χ² = 5,04; p = 0,025.',
      'Демек, екі мақсаттың орындалуы арасындағы айырма 2,5% құрайды.',
      'Жақсарту үшін басымдық — ден қою кезеңі.',
    ],
    debrief: {
      referenceConclusion: 'Эталон қорытынды: «хабарлауға 1 күн» мақсаты оқиғалардың 75,0%-ында орындалды (95% СА 62,6–85,0%), «ден қоюға 7 күн» мақсаты — 56,3%-ында (95% СА 43,3–68,6%). Айырма маңызды (Мак-Немар критерийі, χ² = 5,04; p = 0,025) және шамамен 19 пайыздық тармақ құрайды: әлсіз буын — ден қою. p-мәні айырманың сенімділігін көрсетеді, оның шамасын емес.',
      typesRepeat: 'Айнымалылар түрлері: сандық мерзімдер және 0/1 бинарлы индикаторлар',
      methodSecondTryRepeat: 'Байланысқан және тәуелсіз іріктемелер',
      methodFailedRepeat: 'Жұптық үлестерге арналған Мак-Немар критерийі',
      aiFound: 'ЖИ қатесі табылды: p-мәні айырманың шамасы деп қабылданды',
      aiMissed: 'ЖИ қатесі табылмады (3-фрагмент: p-мәні ≠ айырманың шамасы)',
      aiRepeat: 'p-мәні және әсер мөлшері (effect size)',
      disputeSteps: ['7-қадам. Интерпретация', '8-қадам. ЖИ-ді тексеру', '3-қадам. Айнымалылар түрлері'],
    },
    tutor: {
      1: ['7-1-7 мақсаттары нені білдіреді?', 'Өршуге ден қоюдың уақтылылығын неге бағалайды?'],
      2: ['Мерзімдер мен күндерде қандай қателер болады?', 'Санаттар тізімін қателерге қалай тексеруге болады?'],
      3: ['0/1 айнымалысы — сандық па, әлде категориялық па?', 'Зерттеудегі нәтиже (outcome) деген не?'],
      5: ['Байланысқан іріктемелер тәуелсіздерден немен ерекшеленеді?', 'Мак-Немар критерийі қашан қолданылады?'],
      6: ['R-де үлес үшін 95% СА қалай есептеледі?', 'Мак-Немар критерийі 2×2 кестесінің қай ұяшықтарын пайдаланады?'],
      9: ['p-мәні әсер мөлшерінен немен ерекшеленеді?'],
      10: ['Келесі кейске қалай дайындалуға болады?'],
    },
  },

  en: {
    title: 'Measles outbreak in a training territory: 7-1-7 assessment',
    shortTitle: 'Measles outbreak',
    situation: {
      paragraphs: [
        'You are an epidemiologist at the sanitary and epidemiological control centre of the Training Territory. In winter, a measles outbreak was recorded in four regions (A–D). Timeliness of response is assessed with the **7-1-7** metric: an event is detected within 7 days of emergence, notified within 1 day of detection, and early response actions start within 7 days of notification.',
        'The dataset contains **64** measles event signals. Your manager asks: what proportion of events met the “1 day to notify” target and the “7 days to respond” target, and does performance differ between these two targets?',
      ],
      goal: 'After this case you will be able to calculate a proportion with its 95% confidence interval, tell paired (related) samples from independent ones, and apply McNemar’s test.',
    },
    dataErrors: {
      3: 'Detection time of 700 days — a typo (probably 7)',
      7: 'Negative notification time — a data entry error',
      11: 'Region E does not exist — the study covers only regions A–D',
    },
    retryHint: 'Check whether the time intervals are plausible and compare the list of regions with the case description.',
    allFoundNote: 'All three problems found. The values are corrected from source documents in the analysis; they do not affect the proportions meeting the targets.',
    variables: {
      id: 'Event number', region: 'Region', detect: 'Time to detection, days', notify: 'Time to notification, days',
      respond: 'Time to response, days', notifyOk: 'Notified ≤1 day (1 — yes, 0 — no)', respondOk: 'Responded ≤7 days (1 — yes, 0 — no)',
    },
    method: {
      question: 'You need to compare the proportion of events that met the “1 day to notify” target with the proportion that met the “7 days to respond” target. Both targets were assessed on the same 64 events. Which method fits?',
      options: ["Pearson's χ² test for independent groups", "McNemar's test for paired proportions", 'Paired t-test', 'Spearman correlation', 'Mann–Whitney test'],
      retryHint: 'Think: are these two different groups of events, or the same events assessed twice? Paired binary data need a special test.',
      failNote: "Both attempts used. Direction: when the same units are assessed twice on a binary characteristic, proportions are compared with McNemar's test. The method is marked as an area for growth in the debriefing.",
    },
    outputsPython: 'notify_ok 0.75 (0.6260095431181809, 0.8498444259147272)\nrespond_ok 0.5625 (0.43275890006645973, 0.686265246451504)\npvalue      0.024744672046398908\nstatistic   5.041666666666667',
    errors: {
      R: 'Error in table(...): all arguments must have the same length — column not found.',
      Python: 'KeyError: column not found in the table.',
    },
    chartTitle: 'Proportion of events meeting the 7-1-7 targets',
    bars: ['Notified ≤1 day', 'Responded ≤7 days'],
    checklist: ['Proportions meeting both targets', '95% confidence intervals', "McNemar's test: statistic and p-value", 'Which target performs worse and what to improve'],
    fragments: [
      'The “1 day to notify” target was met in 75% of events (95% CI 63–85%), the “7 days to respond” target in 56% (95% CI 43–69%).',
      "McNemar's test: χ² = 5.04; p = 0.025.",
      'Therefore, the difference between meeting the two targets is 2.5%.',
      'The priority for improvement is the response stage.',
    ],
    debrief: {
      referenceConclusion: "Reference conclusion: the “1 day to notify” target was met in 75.0% of events (95% CI 62.6–85.0%), the “7 days to respond” target in 56.3% (95% CI 43.3–68.6%). The difference is significant (McNemar's test, χ² = 5.04; p = 0.025) and is about 19 percentage points: the weak link is the response. The p-value shows how reliable the difference is, not how large it is.",
      typesRepeat: 'Variable types: quantitative time intervals and 0/1 binary indicators',
      methodSecondTryRepeat: 'Paired and independent samples',
      methodFailedRepeat: "McNemar's test for paired proportions",
      aiFound: 'AI error found: the p-value was taken as the size of the difference',
      aiMissed: 'AI error not found (fragment 3: p-value ≠ size of the difference)',
      aiRepeat: 'p-value and effect size',
      disputeSteps: ['Step 7. Interpretation', 'Step 8. AI check', 'Step 3. Variable types'],
    },
    tutor: {
      1: ['What do the 7-1-7 targets mean?', 'Why assess the timeliness of outbreak response?'],
      2: ['What errors occur in time intervals and dates?', 'How do I check a list of categories for typos?'],
      3: ['Is a 0/1 variable quantitative or categorical?', 'What is an outcome in a study?'],
      5: ['How do paired samples differ from independent ones?', "When is McNemar's test used?"],
      6: ['How do I calculate a 95% CI for a proportion in R?', "Which cells of the 2×2 table does McNemar's test use?"],
      9: ['How does a p-value differ from an effect size?'],
      10: ['How do I prepare for the next case?'],
    },
  },
}

const R_OUTPUT = '[1] 0.6260095 0.8498444\nattr(,"conf.level")\n[1] 0.95\n[1] 0.4327589 0.6862652\nattr(,"conf.level")\n[1] 0.95\n\n\tMcNemar\'s Chi-squared test with continuity correction\n\ndata:  tab\nMcNemar\'s chi-squared = 5.0417, df = 1, p-value = 0.02474'

export function buildCase01(lang: Lang): CaseDefinition {
  const T = TEXT[lang]
  const preview = generateCase01Rows(lang).slice(0, 15)
  return {
    id: '1',
    title: T.title,
    shortTitle: T.shortTitle,
    situation: T.situation,
    data: {
      fileName: 'case01_measles_717.csv',
      totalRows: 64,
      columns: ['id', 'region', 'detect_days', 'notify_days', 'respond_days', 'notify_ok', 'respond_ok'],
      preview,
      errors: T.dataErrors,
      retryHint: T.retryHint,
      allFoundNote: T.allFoundNote,
    },
    variables: [
      { key: 'id', label: T.variables.id, expected: 'id' },
      { key: 'region', label: T.variables.region, expected: 'n' },
      { key: 'detect', label: T.variables.detect, expected: 'q' },
      { key: 'notify', label: T.variables.notify, expected: 'q' },
      { key: 'respond', label: T.variables.respond, expected: 'q' },
      { key: 'notifyOk', label: T.variables.notifyOk, expected: 'b', accepted: ['n'] },
      { key: 'respondOk', label: T.variables.respondOk, expected: 'b', accepted: ['n'] },
    ],
    outcome: 'notifyOk',
    outcomeAlso: ['respondOk'],
    method: { ...T.method, correct: 1 },
    code: {
      templates: {
        R: [
          'd <- read.csv("case01_measles_717.csv")',
          'binom.test(sum(d$notify_ok), nrow(d))$conf.int',
          'binom.test(sum(d$respond_ok), nrow(d))$conf.int',
          'tab <- table(d$[0], d$[1])',
          'mcnemar.test(tab)',
        ],
        Python: [
          'import pandas as pd',
          'from statsmodels.stats.proportion import proportion_confint',
          'from statsmodels.stats.contingency_tables import mcnemar',
          'd = pd.read_csv("case01_measles_717.csv")',
          'for col in ("notify_ok", "respond_ok"):',
          '    print(col, d[col].mean(), proportion_confint(d[col].sum(), len(d), method="beta"))',
          'tab = pd.crosstab(d["[0]"], d["[1]"])',
          'print(mcnemar(tab, exact=False, correction=True))',
        ],
      },
      blankAnswers: ['notify_ok', 'respond_ok'],
      freeRequired: [{ source: 'mcnemar', flags: 'i' }, { source: 'notify_ok' }, { source: 'respond_ok' }],
      outputs: { R: R_OUTPUT, Python: T.outputsPython },
      errors: T.errors,
      chart: { title: T.chartTitle, bars: [[T.bars[0], 75.0], [T.bars[1], 56.3]] },
    },
    interpretation: {
      checklist: [
        { label: T.checklist[0], pattern: PATTERNS.shares },
        { label: T.checklist[1], pattern: PATTERNS.ci },
        { label: T.checklist[2], pattern: PATTERNS.test },
        { label: T.checklist[3], pattern: PATTERNS.conclusion },
      ],
    },
    aiTrap: { fragments: T.fragments, wrongIndex: 2, explanation: PATTERNS.aiTrap },
    debrief: T.debrief,
    tutor: { quick: T.tutor },
  }
}
