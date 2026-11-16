import type { Lang } from '@/api/types'
import type { CaseDefinition, Pattern } from '@/domain/cases/CaseDefinition'
import { int, rng, shuffledUnits } from '../shared/synthetic'

/**
 * Кейс 23. Пропуск приёма АРТ и вирусная супрессия: сравнение двух независимых долей, разность долей с 95% ДИ.
 * Вымышленный кейс (Claude, 17.11.2026; пакет v0.2 не использовался) — нужна экспертиза.
 * Таблица missed_doses × vl_suppressed = (0,1) 150, (0,0) 20, (1,1) 46, (1,0) 24; n = 240.
 * Эталон (statsmodels): 88,24% vs 65,71%; z = 4,0984 (χ² = 16,797), p = 4,16e-05;
 * разность 22,5 п.п. (Wald 95% ДИ 10,4–34,6); относительное снижение 25,5%.
 */
const SEX: Record<Lang, { m: string; f: string }> = { ru: { m: 'М', f: 'Ж' }, kk: { m: 'Е', f: 'Ә' }, en: { m: 'M', f: 'F' } }

export function generateCase23Rows(lang: Lang = 'ru') {
  const R = rng(2323)
  const units = shuffledUnits<[number, number]>(R, [[[0, 1], 150], [[0, 0], 20], [[1, 1], 46], [[1, 0], 24]])
  const rows = units.map(([missed, sup], i) => ({
    id: i + 1,
    age: int(R, 19, 64),
    sex: R() < 0.55 ? SEX[lang].m : SEX[lang].f,
    missed_doses: missed,
    viral_load: sup ? Math.round(R() * 39) : Math.round(Math.exp(4 + R() * 6)),
    vl_suppressed: sup,
  }))
  // «грязь» для шага 2
  rows[4].age = 340
  rows[7].missed_doses = 2
  rows[13].viral_load = -12
  return rows
}

const PATTERNS = {
  shares: { source: '(\\d{2}[,.]?\\d?\\s?%)|доля|доли|процент|үлес|пайыз|proportion|percent', flags: 'i' },
  difference: { source: '(разност|разниц|айырма|difference|22[,.]5|доверит|интервал|сенім|confidence|95\\s?%)', flags: 'i' },
  test: { source: '(χ|хи|chi|z\\s*=|16[,.]8|4[,.]1|p\\s*[=<])', flags: 'i' },
  limitation: { source: '(причин|огранич|не доказ|наблюдат|ассоци|связ|смешив|себеп|шектеу|дәлелде|бақылау|байланыс|caus|limit|not prove|observational|associat|confound)', flags: 'i' },
  aiTrap: { source: '(процентн|пункт|п\\.\\s?п|percentage point|\\bpp\\b|пайыздық тармақ|тармақ|абсолют|относит|relative|absolute|салыстырмалы|25[,.]5|25\\s?%)', flags: 'i' },
} satisfies Record<string, Pattern>

interface Text {
  title: string
  shortTitle: string
  situation: CaseDefinition['situation']
  dataErrors: Record<number, string>
  retryHint: string
  allFoundNote: string
  variables: Record<'id' | 'age' | 'sex' | 'missed' | 'vl' | 'sup', string>
  method: Omit<CaseDefinition['method'], 'correct'>
  errors: CaseDefinition['code']['errors']
  chartTitle: string
  bars: [string, string]
  checklist: [string, string, string, string]
  fragments: string[]
  debrief: CaseDefinition['debrief']
  tutor: CaseDefinition['tutor']['quick']
}

const TEXT: Record<Lang, Text> = {
  ru: {
    title: 'Пропуск приёма АРТ и вирусная супрессия',
    shortTitle: 'Пропуск приёма АРТ',
    situation: {
      paragraphs: [
        'Вы — эпидемиолог центра по профилактике ВИЧ-инфекции Учебной территории. Готовится программа поддержки приверженности к лечению. Чтобы её обосновать, руководитель просит оценить, как пропуски приёма антиретровирусной терапии (АРТ) связаны с вирусной супрессией.',
        'В выборке **240** пациентов на АРТ; пропуск хотя бы одной дозы за последний месяц отмечен со слов пациента. Вирусная супрессия — вирусная нагрузка ≤40 копий/мл.',
      ],
      goal: 'Что вы будете уметь после кейса: сравнивать две независимые доли, рассчитывать разность долей с 95% ДИ и отличать процентные пункты от процентов.',
    },
    dataErrors: {
      5: 'Возраст 340 лет — опечатка (вероятно, 34)',
      8: 'missed_doses = 2 — в бинарной переменной допустимы только 0 и 1',
      14: 'Отрицательная вирусная нагрузка — ошибка знака',
    },
    retryHint: 'Проверьте возраст, коды бинарных переменных и знак чисел.',
    allFoundNote: 'Все три проблемы найдены. В анализе значения исправлены по медицинской карте; на итог по пропускам и супрессии они не влияют.',
    variables: {
      id: 'Номер пациента', age: 'Возраст, лет', sex: 'Пол', missed: 'Пропуск доз за месяц (1 — да, 0 — нет)',
      vl: 'Вирусная нагрузка, копий/мл', sup: 'Вирусная супрессия (1 — да, 0 — нет)',
    },
    method: {
      question: 'Нужно сравнить долю пациентов с вирусной супрессией среди тех, кто пропускал приём АРТ, и тех, кто не пропускал. Какой метод подходит?',
      options: ['Сравнение двух независимых долей (z-тест / χ² для таблицы 2×2)', 'Парный t-критерий', 'Критерий Мак-Немара', 'Корреляция Пирсона', 't-критерий для независимых групп по вирусной нагрузке'],
      retryHint: 'Подумайте: сколько групп, независимы ли они и что сравнивают — средние или доли?',
      failNote: 'Обе попытки использованы. Направление: доли бинарного исхода в двух независимых группах сравнивают z-тестом для двух долей (это то же, что χ² для таблицы 2×2). Метод отмечен в дебрифинге как зона роста.',
    },
    errors: {
      R: 'Error in table(...): все аргументы должны иметь одинаковую длину — столбец не найден.',
      Python: 'KeyError: столбец не найден в таблице.',
    },
    chartTitle: 'Доля пациентов с вирусной супрессией',
    bars: ['Без пропусков', 'С пропусками'],
    checklist: ['Доли супрессии в обеих группах', 'Разность долей и её 95% ДИ', 'Статистика и p-значение', 'Ограничение: наблюдательная связь, не доказательство причины'],
    fragments: [
      'Вирусная супрессия достигнута у 88,2% пациентов без пропусков приёма АРТ и у 65,7% пациентов с пропусками.',
      'χ² = 16,8; p < 0,001; разность долей 22,5 (95% ДИ 10,4–34,6).',
      'Значит, у пациентов с пропусками доля супрессии на 22,5% ниже.',
      'Для уточнения стоит учесть возраст и длительность терапии.',
    ],
    debrief: {
      referenceConclusion: 'Эталонный вывод: вирусная супрессия достигнута у 88,2% пациентов без пропусков и у 65,7% с пропусками приёма АРТ. Разность — 22,5 процентного пункта (95% ДИ 10,4–34,6; χ² = 16,8; p < 0,001); в относительном выражении это снижение примерно на 25%. Связь наблюдательная: пропуски могут отражать и другие трудности пациента, поэтому о причине нужно говорить осторожно.',
      typesRepeat: 'Типы переменных: бинарные исход и фактор',
      methodSecondTryRepeat: 'Сравнение двух независимых долей',
      methodFailedRepeat: 'z-тест для двух долей и таблица 2×2',
      aiFound: 'Найдена ошибка ИИ: процентные пункты названы процентами',
      aiMissed: 'Ошибка ИИ не найдена (фрагмент 3: 22,5 процентного пункта ≠ 22,5%)',
      aiRepeat: 'Абсолютная и относительная разница',
      disputeSteps: ['Шаг 7. Интерпретация', 'Шаг 8. Проверка ИИ', 'Шаг 3. Типы переменных'],
    },
    tutor: {
      1: ['Что такое приверженность к АРТ?', 'Что значит «вирусная супрессия»?'],
      2: ['Как найти невозможные значения возраста?', 'Почему в бинарной переменной не может быть значения 2?'],
      3: ['Пропуск доз (да/нет) — какой это тип переменной?', 'Что здесь исход, а что — фактор?'],
      5: ['Когда сравнивают доли, а когда средние?', 'Как z-тест для двух долей связан с χ²?'],
      6: ['Что делает функция prop.test() в R?', 'Как рассчитать 95% ДИ для разности долей?'],
      9: ['Чем процентный пункт отличается от процента?'],
      10: ['Как подготовиться к следующему кейсу?'],
    },
  },

  kk: {
    title: 'АРТ қабылдауды өткізіп алу және вирустық супрессия',
    shortTitle: 'АРТ қабылдауды өткізіп алу',
    situation: {
      paragraphs: [
        'Сіз — Оқу аумағындағы АИТВ-инфекциясының алдын алу орталығының эпидемиологысыз. Емге бейімділікті (adherence) қолдау бағдарламасы дайындалып жатыр. Оны негіздеу үшін басшы антиретровирустық терапияны (АРТ) қабылдауды өткізіп алудың вирустық супрессиямен қалай байланысты екенін бағалауды сұрайды.',
        'Іріктемеде АРТ қабылдайтын **240** пациент бар; соңғы айда кемінде бір дозаны өткізіп алу пациенттің сөзінен белгіленді. Вирустық супрессия — вирустық жүктеме ≤40 көшірме/мл.',
      ],
      goal: 'Кейстен кейін не істей аласыз: екі тәуелсіз үлесті салыстыру, үлестер айырмасын 95% СА-мен есептеу және пайыздық тармақты пайыздан ажырату.',
    },
    dataErrors: {
      5: 'Жасы 340 жыл — қате басылған (шамасы, 34)',
      8: 'missed_doses = 2 — бинарлы айнымалыда тек 0 және 1 болуы мүмкін',
      14: 'Теріс вирустық жүктеме — таңба қатесі',
    },
    retryHint: 'Жасты, бинарлы айнымалылардың кодтарын және сандардың таңбасын тексеріңіз.',
    allFoundNote: 'Үш мәселенің бәрі табылды. Талдауда мәндер медициналық карта бойынша түзетілді; олар өткізіп алу мен супрессия бойынша қорытындыға әсер етпейді.',
    variables: {
      id: 'Пациент нөмірі', age: 'Жасы, жыл', sex: 'Жынысы', missed: 'Бір айда дозаны өткізіп алу (1 — иә, 0 — жоқ)',
      vl: 'Вирустық жүктеме, көшірме/мл', sup: 'Вирустық супрессия (1 — иә, 0 — жоқ)',
    },
    method: {
      question: 'АРТ қабылдауды өткізіп алғандар мен өткізіп алмағандар арасында вирустық супрессиясы бар пациенттер үлесін салыстыру керек. Қай әдіс сәйкес келеді?',
      options: ['Екі тәуелсіз үлесті салыстыру (z-тест / 2×2 кестесіне χ²)', 'Жұптық t-критерий', 'Мак-Немар критерийі', 'Пирсон корреляциясы', 'Вирустық жүктеме бойынша тәуелсіз топтарға арналған t-критерий'],
      retryHint: 'Ойланыңыз: қанша топ, олар тәуелсіз бе және не салыстырылады — орташа мәндер ме, әлде үлестер ме?',
      failNote: 'Екі әрекет те пайдаланылды. Бағыт: екі тәуелсіз топтағы бинарлы нәтиженің үлестері екі үлеске арналған z-тестпен салыстырылады (бұл 2×2 кестесіне арналған χ²-пен бірдей). Әдіс дебрифингте даму аймағы ретінде белгіленді.',
    },
    errors: {
      R: 'Error in table(...): барлық аргументтердің ұзындығы бірдей болуы керек — баған табылмады.',
      Python: 'KeyError: кестеде мұндай баған жоқ.',
    },
    chartTitle: 'Вирустық супрессиясы бар пациенттер үлесі',
    bars: ['Өткізіп алмағандар', 'Өткізіп алғандар'],
    checklist: ['Екі топтағы супрессия үлестері', 'Үлестер айырмасы және оның 95% СА', 'Статистика және p-мәні', 'Шектеу: бақылаулық байланыс, себептің дәлелі емес'],
    fragments: [
      'Вирустық супрессияға АРТ қабылдауды өткізіп алмаған пациенттердің 88,2%-ы және өткізіп алғандардың 65,7%-ы қол жеткізді.',
      'χ² = 16,8; p < 0,001; үлестер айырмасы 22,5 (95% СА 10,4–34,6).',
      'Демек, өткізіп алған пациенттерде супрессия үлесі 22,5%-ға төмен.',
      'Нақтылау үшін жас пен терапия ұзақтығын ескерген жөн.',
    ],
    debrief: {
      referenceConclusion: 'Эталон қорытынды: вирустық супрессияға өткізіп алмаған пациенттердің 88,2%-ы және АРТ қабылдауды өткізіп алғандардың 65,7%-ы қол жеткізді. Айырма — 22,5 пайыздық тармақ (95% СА 10,4–34,6; χ² = 16,8; p < 0,001); салыстырмалы түрде бұл шамамен 25%-ға төмендеу. Байланыс бақылаулық: өткізіп алу пациенттің басқа қиындықтарын да көрсетуі мүмкін, сондықтан себеп туралы сақтықпен айту керек.',
      typesRepeat: 'Айнымалылар түрлері: бинарлы нәтиже және фактор',
      methodSecondTryRepeat: 'Екі тәуелсіз үлесті салыстыру',
      methodFailedRepeat: 'Екі үлеске арналған z-тест және 2×2 кестесі',
      aiFound: 'ЖИ қатесі табылды: пайыздық тармақтар пайыз деп аталды',
      aiMissed: 'ЖИ қатесі табылмады (3-фрагмент: 22,5 пайыздық тармақ ≠ 22,5%)',
      aiRepeat: 'Абсолюттік және салыстырмалы айырма',
      disputeSteps: ['7-қадам. Интерпретация', '8-қадам. ЖИ-ді тексеру', '3-қадам. Айнымалылар түрлері'],
    },
    tutor: {
      1: ['АРТ-ға бейімділік (adherence) деген не?', '«Вирустық супрессия» деген не?'],
      2: ['Жастың мүмкін емес мәндерін қалай табуға болады?', 'Неге бинарлы айнымалыда 2 мәні болмауы керек?'],
      3: ['Дозаны өткізіп алу (иә/жоқ) — айнымалының қай түрі?', 'Мұнда нәтиже (outcome) не, ал фактор не?'],
      5: ['Үлестер қашан, ал орташа мәндер қашан салыстырылады?', 'Екі үлеске арналған z-тест χ²-пен қалай байланысты?'],
      6: ['R-дегі prop.test() функциясы не істейді?', 'Үлестер айырмасына 95% СА қалай есептеледі?'],
      9: ['Пайыздық тармақ пайыздан немен ерекшеленеді?'],
      10: ['Келесі кейске қалай дайындалуға болады?'],
    },
  },

  en: {
    title: 'Missed ART doses and viral suppression',
    shortTitle: 'Missed ART doses',
    situation: {
      paragraphs: [
        'You are an epidemiologist at the HIV prevention centre of the Training Territory. A programme to support treatment adherence is being prepared. To justify it, your manager asks you to assess how missed doses of antiretroviral therapy (ART) are associated with viral suppression.',
        'The sample includes **240** patients on ART; missing at least one dose in the past month was recorded from the patient’s report. Viral suppression means a viral load of ≤40 copies/mL.',
      ],
      goal: 'After this case you will be able to compare two independent proportions, calculate the difference in proportions with a 95% CI, and tell percentage points from percent.',
    },
    dataErrors: {
      5: 'Age of 340 years — a typo (probably 34)',
      8: 'missed_doses = 2 — only 0 and 1 are allowed in a binary variable',
      14: 'Negative viral load — a sign error',
    },
    retryHint: 'Check age, the codes of the binary variables and the sign of the numbers.',
    allFoundNote: 'All three problems found. The values are corrected from the medical records in the analysis; they do not affect the result for missed doses and suppression.',
    variables: {
      id: 'Patient number', age: 'Age, years', sex: 'Sex', missed: 'Missed doses in the past month (1 — yes, 0 — no)',
      vl: 'Viral load, copies/mL', sup: 'Viral suppression (1 — yes, 0 — no)',
    },
    method: {
      question: 'You need to compare the proportion of patients with viral suppression between those who missed ART doses and those who did not. Which method fits?',
      options: ['Comparing two independent proportions (z-test / χ² for a 2×2 table)', 'Paired t-test', "McNemar's test", 'Pearson correlation', 'Independent-samples t-test on viral load'],
      retryHint: 'Think: how many groups are there, are they independent, and what is compared — means or proportions?',
      failNote: 'Both attempts used. Direction: proportions of a binary outcome in two independent groups are compared with a two-proportion z-test (equivalent to χ² for a 2×2 table). The method is marked as an area for growth in the debriefing.',
    },
    errors: {
      R: 'Error in table(...): all arguments must have the same length — column not found.',
      Python: 'KeyError: column not found in the table.',
    },
    chartTitle: 'Proportion of patients with viral suppression',
    bars: ['No missed doses', 'Missed doses'],
    checklist: ['Suppression proportions in both groups', 'Difference in proportions and its 95% CI', 'Statistic and p-value', 'Limitation: observational association, not proof of cause'],
    fragments: [
      'Viral suppression was achieved in 88.2% of patients without missed ART doses and in 65.7% of patients with missed doses.',
      'χ² = 16.8; p < 0.001; difference in proportions 22.5 (95% CI 10.4–34.6).',
      'Therefore, the proportion with suppression is 22.5% lower among patients who missed doses.',
      'To refine this, age and duration of therapy should be taken into account.',
    ],
    debrief: {
      referenceConclusion: 'Reference conclusion: viral suppression was achieved in 88.2% of patients without missed doses and in 65.7% of those who missed ART doses. The difference is 22.5 percentage points (95% CI 10.4–34.6; χ² = 16.8; p < 0.001); in relative terms this is a reduction of about 25%. The association is observational: missed doses may reflect other difficulties the patient has, so causal statements need caution.',
      typesRepeat: 'Variable types: binary outcome and binary factor',
      methodSecondTryRepeat: 'Comparing two independent proportions',
      methodFailedRepeat: 'Two-proportion z-test and the 2×2 table',
      aiFound: 'AI error found: percentage points were called percent',
      aiMissed: 'AI error not found (fragment 3: 22.5 percentage points ≠ 22.5%)',
      aiRepeat: 'Absolute and relative difference',
      disputeSteps: ['Step 7. Interpretation', 'Step 8. AI check', 'Step 3. Variable types'],
    },
    tutor: {
      1: ['What is adherence to ART?', 'What does “viral suppression” mean?'],
      2: ['How do I find impossible age values?', 'Why can’t a binary variable have the value 2?'],
      3: ['What type of variable is missed doses (yes/no)?', 'What is the outcome here, and what is the factor?'],
      5: ['When do we compare proportions and when means?', 'How is the two-proportion z-test related to χ²?'],
      6: ['What does the prop.test() function do in R?', 'How do I calculate a 95% CI for a difference in proportions?'],
      9: ['How does a percentage point differ from a percent?'],
      10: ['How do I prepare for the next case?'],
    },
  },
}

const OUTPUTS: CaseDefinition['code']['outputs'] = {
  R: '\t2-sample test for equality of proportions without continuity correction\n\ndata:  tab[, c("1", "0")]\nX-squared = 16.797, df = 1, p-value = 4.16e-05\nalternative hypothesis: two.sided\n95 percent confidence interval:\n 0.1039251 0.3464950\nsample estimates:\n   prop 1    prop 2 \n0.8823529 0.6571429 ',
  Python: 'missed_doses\n0    0.882353\n1    0.657143\nName: vl_suppressed, dtype: float64\n(4.098383177778126, 4.160461297259688e-05)\n(0.10392514722910896, 0.3464950208381179)',
}

export function buildCase23(lang: Lang): CaseDefinition {
  const T = TEXT[lang]
  return {
    id: '23',
    title: T.title,
    shortTitle: T.shortTitle,
    situation: T.situation,
    data: {
      fileName: 'case23_art_adherence.csv',
      totalRows: 240,
      columns: ['id', 'age', 'sex', 'missed_doses', 'viral_load', 'vl_suppressed'],
      preview: generateCase23Rows(lang).slice(0, 15),
      errors: T.dataErrors,
      retryHint: T.retryHint,
      allFoundNote: T.allFoundNote,
    },
    variables: [
      { key: 'id', label: T.variables.id, expected: 'id' },
      { key: 'age', label: T.variables.age, expected: 'q' },
      { key: 'sex', label: T.variables.sex, expected: 'n', accepted: ['b'] },
      { key: 'missed', label: T.variables.missed, expected: 'b', accepted: ['n'] },
      { key: 'vl', label: T.variables.vl, expected: 'q' },
      { key: 'sup', label: T.variables.sup, expected: 'b', accepted: ['n'] },
    ],
    outcome: 'sup',
    method: { ...T.method, correct: 0 },
    code: {
      templates: {
        R: [
          'd <- read.csv("case23_art_adherence.csv")',
          'tab <- table(d$[0], d$[1])',
          'prop.test(tab[, c("1", "0")], correct = FALSE)',
        ],
        Python: [
          'import pandas as pd',
          'from statsmodels.stats.proportion import proportions_ztest, confint_proportions_2indep',
          'd = pd.read_csv("case23_art_adherence.csv")',
          'g = d.groupby("[0]")["[1]"]',
          'k, n = g.sum(), g.count()',
          'print(k / n)',
          'print(proportions_ztest(k, n))',
          'print(confint_proportions_2indep(k[0], n[0], k[1], n[1], method="wald"))',
        ],
      },
      blankAnswers: ['missed_doses', 'vl_suppressed'],
      freeRequired: [
        { source: '(prop\\.test|proportions_ztest|chisq\\.test|chi2_contingency)' }, { source: 'missed_doses' }, { source: 'vl_suppressed' },
      ],
      outputs: OUTPUTS,
      errors: T.errors,
      chart: { title: T.chartTitle, bars: [[T.bars[0], 88.2], [T.bars[1], 65.7]] },
    },
    interpretation: {
      checklist: [
        { label: T.checklist[0], pattern: PATTERNS.shares },
        { label: T.checklist[1], pattern: PATTERNS.difference },
        { label: T.checklist[2], pattern: PATTERNS.test },
        { label: T.checklist[3], pattern: PATTERNS.limitation },
      ],
    },
    aiTrap: { fragments: T.fragments, wrongIndex: 2, explanation: PATTERNS.aiTrap },
    debrief: T.debrief,
    tutor: { quick: T.tutor },
  }
}
