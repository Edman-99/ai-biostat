import type { Lang } from '@/api/types'
import type { CaseDefinition, Pattern } from '@/domain/cases/CaseDefinition'
import { CASE21_LABELS, generateCase21Rows } from './data'
import { toCsv } from '@/domain/analysis/Dataset'

/**
 * Кейс 21 на трёх языках. Всё, что от языка не зависит (структура, ответы, ошибки в данных, шаблоны кода),
 * задано один раз; тексты — в TEXT. KZ и EN — перевод Claude (16.11.2026), нужна вычитка носителем.
 *
 * Шаблоны проверки (интерпретация, ловушка ИИ) общие для всех языков — RU + KZ + EN основы слов,
 * поэтому балл не зависит от языка интерфейса (его считает и браузер студента, и аналитика преподавателя).
 */
const PATTERNS = {
  shares: { source: '(\\d{2}[,.]?\\d?\\s?%)|доля|процент|үлес|пайыз|proportion|percent', flags: 'i' },
  statistic: { source: '(χ|хи|chi|x-squared|11[,.]1)|p\\s*[=<]', flags: 'i' },
  group: { source: '(наём|работа|домохоз|самозан|жалдама|үй шаруа|өзін-өзі|өз бетінше|wage|employ|homemaker|self-employ)', flags: 'i' },
  limitation: { source: '(причин|огранич|не доказ|наблюдат|ассоци|связ|себеп|шектеу|дәлелде|бақылау|байланыс|caus|limit|not prove|observational|associat)', flags: 'i' },
  aiTrap: { source: '(причин|не доказ|наблюдат|ассоци|связь не означ|себеп|дәлелденбе|бақылау|байланыс себеп|caus|observational|associat|not prove)', flags: 'i' },
} satisfies Record<string, Pattern>

interface Case21Text {
  title: string
  shortTitle: string
  situation: CaseDefinition['situation']
  dataErrors: Record<number, string>
  retryHint: string
  allFoundNote: string
  variables: Record<'id' | 'age' | 'sex' | 'emp' | 'vl' | 'sup', string>
  method: Omit<CaseDefinition['method'], 'correct'>
  outputs: CaseDefinition['code']['outputs']
  errors: CaseDefinition['code']['errors']
  chartTitle: string
  checklist: [string, string, string, string]
  fragments: string[]
  debrief: CaseDefinition['debrief']
  tutor: CaseDefinition['tutor']['quick']
}

const TEXT: Record<Lang, Case21Text> = {
  ru: {
    title: 'ВИЧ-инфекция и занятость: подавление вирусной нагрузки',
    shortTitle: 'ВИЧ-инфекция и занятость',
    situation: {
      paragraphs: [
        'Вы — эпидемиолог центра по профилактике ВИЧ-инфекции Учебной территории. На совещании обсуждают, почему у части пациентов на АРТ вирусная нагрузка не подавлена. Руководитель просит проверить: связана ли занятость пациента с подавлением вирусной нагрузки?',
        'В исследовании участвовали **377** пациентов на антиретровирусной терапии (АРТ). Подавленной считается вирусная нагрузка ≤40 копий/мл.',
      ],
      goal: 'Что вы будете уметь после кейса: выбирать критерий для связи двух категориальных переменных, выполнять χ²-тест в R или Python и корректно формулировать вывод без причинных утверждений.',
    },
    dataErrors: {
      4: 'Возраст 230 лет — опечатка (вероятно, 23)',
      9: 'Отрицательная вирусная нагрузка — ошибка знака',
      13: 'Пол закодирован латинской буквой — несогласованное кодирование',
    },
    retryHint: 'Посмотрите ещё раз на возраст, знак чисел и кодирование пола.',
    allFoundNote: 'Все три проблемы найдены. В анализе эти значения исправлены; на итог по занятости и подавлению ВН они не влияют.',
    variables: {
      id: 'Номер участника', age: 'Возраст, лет', sex: 'Пол', emp: 'Занятость',
      vl: 'Вирусная нагрузка, копий/мл', sup: 'ВН подавлена (≤40 копий)',
    },
    method: {
      question: 'Какой метод позволит проверить связь занятости с подавлением вирусной нагрузки?',
      options: ['t-критерий для независимых групп', 'Однофакторный дисперсионный анализ (ANOVA)', 'χ²-критерий Пирсона для таблицы 3×2', 'Корреляция Пирсона', 'Парный t-критерий'],
      retryHint: 'Подумайте: исход «ВН подавлена» — бинарная категориальная переменная, занятость — три категории. Что сравнивают у категориальных переменных — средние или частоты?',
      failNote: 'Обе попытки использованы. Направление: связь двух категориальных переменных проверяют по таблице сопряжённости. Метод отмечен в дебрифинге как зона роста.',
    },
    outputs: {
      R: "\tPearson's Chi-squared test\n\ndata:  tab\nX-squared = 11.12, df = 2, p-value = 0.003848\n\n                      Да     Нет\nДомохозяйки          0.769  0.231\nРаботающие по найму 0.940  0.060\nСамозанятые          0.839  0.161",
      Python: '11.12 0.00385 2\n\nvl_suppressed             Да     Нет\nemployment\nДомохозяйки            0.769  0.231\nРаботающие по найму   0.940  0.060\nСамозанятые            0.839  0.161',
    },
    errors: {
      R: 'Error in table(...): все аргументы должны иметь одинаковую длину — столбец не найден.',
      Python: 'KeyError: столбец не найден в таблице.',
    },
    chartTitle: 'Доля подавленной вирусной нагрузки по занятости',
    checklist: ['Доли подавления по группам', 'Статистика и p-значение', 'Какая группа отличается и в какую сторону', 'Отсутствие причинного вывода / ограничение'],
    fragments: [
      'В выборке из 377 пациентов доля подавленной вирусной нагрузки различалась по занятости: 94% у работающих по найму, 84% у самозанятых и 77% у домохозяек.',
      'χ² = 11,1; df = 2; p = 0,004.',
      'Следовательно, трудоустройство по найму повышает эффективность АРТ, и пациентов нужно направлять на работу.',
      'Для уточнения стоит учесть возраст и стадию заболевания.',
    ],
    debrief: {
      referenceConclusion: 'Эталонный вывод: доля подавленной ВН различается по занятости (χ² = 11,1; df = 2; p = 0,004): выше у работающих по найму (94%), ниже у домохозяек (77%). Это наблюдательная связь, а не доказательство причины: занятость может отражать доход, доступ к клинике и другие факторы.',
      typesRepeat: 'Типы переменных: бинарные и номинальные',
      methodSecondTryRepeat: 'Когда χ², а когда t-критерий',
      methodFailedRepeat: 'Анализ таблиц сопряжённости',
      aiFound: 'Найдена ошибка ИИ: причинный вывод из наблюдательных данных',
      aiMissed: 'Ошибка ИИ не найдена (фрагмент 3: причинный вывод)',
      aiRepeat: 'Связь ≠ причинность',
      disputeSteps: ['Шаг 7. Интерпретация', 'Шаг 8. Проверка ИИ', 'Шаг 3. Типы переменных'],
    },
    tutor: {
      1: ['Что означают цели 7-1-7?', 'Что значит «подавленная вирусная нагрузка»?'],
      2: ['Какие ошибки бывают в медицинских данных?', 'Как отличить выброс от ошибки ввода?'],
      3: ['Чем номинальная переменная отличается от порядковой?', 'Что такое исход в исследовании?'],
      5: ['Какие допущения у χ²-критерия?', 'Когда нужен точный тест Фишера?'],
      6: ['Что делает функция table() в R?', 'Что такое df в выводе χ²-теста?'],
      9: ['Почему связь не означает причинность?'],
      10: ['Как подготовиться к следующему кейсу?'],
    },
  },

  kk: {
    title: 'АИТВ-инфекциясы және жұмыспен қамту: вирустық жүктеменің басылуы',
    shortTitle: 'АИТВ-инфекциясы және жұмыспен қамту',
    situation: {
      paragraphs: [
        'Сіз — Оқу аумағындағы АИТВ-инфекциясының алдын алу орталығының эпидемиологысыз. Кеңесте АРТ қабылдайтын пациенттердің бір бөлігінде вирустық жүктеме (viral load) неге басылмағаны талқыланып жатыр. Басшы тексеруді сұрайды: пациенттің жұмыспен қамтылуы вирустық жүктеменің басылуымен байланысты ма?',
        'Зерттеуге антиретровирустық терапия (АРТ) қабылдайтын **377** пациент қатысты. Вирустық жүктеме ≤40 көшірме/мл болса, басылған деп есептеледі.',
      ],
      goal: 'Кейстен кейін не істей аласыз: екі категориялық айнымалының байланысы үшін критерий таңдау, R немесе Python-да χ²-тест орындау және қорытындыны себеп-салдарлық тұжырымсыз дұрыс жазу.',
    },
    dataErrors: {
      4: 'Жасы 230 жыл — қате басылған (шамасы, 23)',
      9: 'Теріс вирустық жүктеме — таңба қатесі',
      13: 'Жынысы латын әрпімен кодталған — кодтау біркелкі емес',
    },
    retryHint: 'Жасқа, сандардың таңбасына және жыныстың қалай кодталғанына тағы бір рет қараңыз.',
    allFoundNote: 'Үш мәселенің бәрі табылды. Талдауда бұл мәндер түзетілді; олар жұмыспен қамту мен ВЖ басылуы бойынша қорытындыға әсер етпейді.',
    variables: {
      id: 'Қатысушы нөмірі', age: 'Жасы, жыл', sex: 'Жынысы', emp: 'Жұмыспен қамту',
      vl: 'Вирустық жүктеме, көшірме/мл', sup: 'ВЖ басылған (≤40 көшірме)',
    },
    method: {
      question: 'Жұмыспен қамтудың вирустық жүктеменің басылуымен байланысын қай әдіспен тексеруге болады?',
      options: ['Тәуелсіз топтарға арналған t-критерий', 'Бірфакторлы дисперсиялық талдау (ANOVA)', '3×2 кестесіне арналған Пирсонның χ²-критерийі', 'Пирсон корреляциясы', 'Жұптық t-критерий'],
      retryHint: 'Ойланыңыз: «ВЖ басылған» нәтижесі (исход) — бинарлы категориялық айнымалы, ал жұмыспен қамтуда үш санат бар. Категориялық айнымалыларда нені салыстырады — орташа мәндерді ме, әлде жиіліктерді ме?',
      failNote: 'Екі әрекет те пайдаланылды. Бағыт: екі категориялық айнымалының байланысын қиылыс кестесі (contingency table) бойынша тексереді. Әдіс дебрифингте даму аймағы ретінде белгіленді.',
    },
    outputs: {
      R: "\tPearson's Chi-squared test\n\ndata:  tab\nX-squared = 11.12, df = 2, p-value = 0.003848\n\n                                Жоқ    Иә\nЖалдамалы жұмыскерлер          0.060  0.940\nӨзін-өзі жұмыспен қамтығандар  0.161  0.839\nҮй шаруасындағы әйелдер        0.231  0.769",
      Python: '11.12 0.00385 2\n\nvl_suppressed                    Жоқ     Иә\nemployment\nЖалдамалы жұмыскерлер          0.060  0.940\nӨзін-өзі жұмыспен қамтығандар  0.161  0.839\nҮй шаруасындағы әйелдер        0.231  0.769',
    },
    errors: {
      R: 'Error in table(...): барлық аргументтердің ұзындығы бірдей болуы керек — баған табылмады.',
      Python: 'KeyError: кестеде мұндай баған жоқ.',
    },
    chartTitle: 'Жұмыспен қамту бойынша басылған вирустық жүктеме үлесі',
    checklist: ['Топтар бойынша басылу үлестері', 'Статистика және p-мәні', 'Қай топ ерекшеленеді және қай бағытта', 'Себеп-салдарлық қорытынды жоқ / шектеу көрсетілген'],
    fragments: [
      '377 пациенттің іріктемесінде басылған вирустық жүктеме үлесі жұмыспен қамтуға қарай ерекшеленді: жалдамалы жұмыскерлерде 94%, өзін-өзі жұмыспен қамтығандарда 84% және үй шаруасындағы әйелдерде 77%.',
      'χ² = 11,1; df = 2; p = 0,004.',
      'Демек, жалдамалы жұмысқа орналасу АРТ тиімділігін арттырады, сондықтан пациенттерді жұмысқа жіберу керек.',
      'Нақтылау үшін жас пен аурудың сатысын ескерген жөн.',
    ],
    debrief: {
      referenceConclusion: 'Эталон қорытынды: басылған ВЖ үлесі жұмыспен қамтуға қарай ерекшеленеді (χ² = 11,1; df = 2; p = 0,004): жалдамалы жұмыскерлерде жоғары (94%), үй шаруасындағы әйелдерде төмен (77%). Бұл — бақылаулық байланыс, себептің дәлелі емес: жұмыспен қамту табысты, клиникаға қолжетімділікті және басқа факторларды көрсетуі мүмкін.',
      typesRepeat: 'Айнымалылар түрлері: бинарлы және номиналды',
      methodSecondTryRepeat: 'χ² қашан, ал t-критерий қашан қолданылады',
      methodFailedRepeat: 'Қиылыс кестелерін (contingency tables) талдау',
      aiFound: 'ЖИ қатесі табылды: бақылаулық деректерден себеп-салдарлық қорытынды',
      aiMissed: 'ЖИ қатесі табылмады (3-фрагмент: себеп-салдарлық қорытынды)',
      aiRepeat: 'Байланыс ≠ себептілік',
      disputeSteps: ['7-қадам. Интерпретация', '8-қадам. ЖИ-ді тексеру', '3-қадам. Айнымалылар түрлері'],
    },
    tutor: {
      1: ['7-1-7 мақсаттары нені білдіреді?', '«Басылған вирустық жүктеме» деген не?'],
      2: ['Медициналық деректерде қандай қателер болады?', 'Шеткі мәнді (outlier) енгізу қатесінен қалай ажыратуға болады?'],
      3: ['Номиналды айнымалы реттік айнымалыдан немен ерекшеленеді?', 'Зерттеудегі нәтиже (outcome) деген не?'],
      5: ['χ²-критерийінің қандай болжамдары (assumptions) бар?', 'Фишердің дәл критерийі қашан керек?'],
      6: ['R-дегі table() функциясы не істейді?', 'χ²-тест нәтижесіндегі df деген не?'],
      9: ['Неге байланыс себептілікті білдірмейді?'],
      10: ['Келесі кейске қалай дайындалуға болады?'],
    },
  },

  en: {
    title: 'HIV infection and employment: viral load suppression',
    shortTitle: 'HIV and employment',
    situation: {
      paragraphs: [
        'You are an epidemiologist at the HIV prevention centre of the Training Territory. A meeting is discussing why some patients on ART do not have suppressed viral load. Your manager asks you to check: is a patient\'s employment associated with viral load suppression?',
        'The study included **377** patients on antiretroviral therapy (ART). A viral load of ≤40 copies/mL is considered suppressed.',
      ],
      goal: 'After this case you will be able to choose a test for the association between two categorical variables, run a χ² test in R or Python, and phrase the conclusion correctly without causal claims.',
    },
    dataErrors: {
      4: 'Age of 230 years — a typo (probably 23)',
      9: 'Negative viral load — a sign error',
      13: 'Sex coded as «male» instead of «M» — inconsistent coding',
    },
    retryHint: 'Look again at age, the sign of the numbers and how sex is coded.',
    allFoundNote: 'All three problems found. These values are corrected in the analysis; they do not affect the result for employment and VL suppression.',
    variables: {
      id: 'Participant number', age: 'Age, years', sex: 'Sex', emp: 'Employment',
      vl: 'Viral load, copies/mL', sup: 'VL suppressed (≤40 copies)',
    },
    method: {
      question: 'Which method lets you test the association between employment and viral load suppression?',
      options: ['Independent-samples t-test', 'One-way analysis of variance (ANOVA)', "Pearson's χ² test for a 3×2 table", 'Pearson correlation', 'Paired t-test'],
      retryHint: 'Think: the outcome “VL suppressed” is a binary categorical variable, and employment has three categories. For categorical variables, what do we compare — means or frequencies?',
      failNote: 'Both attempts used. Direction: the association between two categorical variables is tested with a contingency table. The method is marked as an area for growth in the debriefing.',
    },
    outputs: {
      R: "\tPearson's Chi-squared test\n\ndata:  tab\nX-squared = 11.12, df = 2, p-value = 0.003848\n\n                  No    Yes\nHomemakers      0.231  0.769\nSelf-employed   0.161  0.839\nWage employees  0.060  0.940",
      Python: '11.12 0.00385 2\n\nvl_suppressed      No    Yes\nemployment\nHomemakers      0.231  0.769\nSelf-employed   0.161  0.839\nWage employees  0.060  0.940',
    },
    errors: {
      R: 'Error in table(...): all arguments must have the same length — column not found.',
      Python: 'KeyError: column not found in the table.',
    },
    chartTitle: 'Proportion with suppressed viral load by employment',
    checklist: ['Suppression proportions by group', 'Statistic and p-value', 'Which group differs and in which direction', 'No causal claim / limitation stated'],
    fragments: [
      'In a sample of 377 patients, the proportion with suppressed viral load differed by employment: 94% among wage employees, 84% among the self-employed and 77% among homemakers.',
      'χ² = 11.1; df = 2; p = 0.004.',
      'Therefore, wage employment increases the effectiveness of ART, and patients should be sent to work.',
      'To refine this, age and disease stage should be taken into account.',
    ],
    debrief: {
      referenceConclusion: 'Reference conclusion: the proportion with suppressed VL differs by employment (χ² = 11.1; df = 2; p = 0.004): higher among wage employees (94%), lower among homemakers (77%). This is an observational association, not proof of cause: employment may reflect income, access to the clinic and other factors.',
      typesRepeat: 'Variable types: binary and nominal',
      methodSecondTryRepeat: 'When to use χ² and when a t-test',
      methodFailedRepeat: 'Analysing contingency tables',
      aiFound: 'AI error found: a causal conclusion from observational data',
      aiMissed: 'AI error not found (fragment 3: causal conclusion)',
      aiRepeat: 'Association ≠ causation',
      disputeSteps: ['Step 7. Interpretation', 'Step 8. AI check', 'Step 3. Variable types'],
    },
    tutor: {
      1: ['What do the 7-1-7 targets mean?', 'What does “suppressed viral load” mean?'],
      2: ['What errors occur in medical data?', 'How do I tell an outlier from a data entry error?'],
      3: ['How does a nominal variable differ from an ordinal one?', 'What is an outcome in a study?'],
      5: ['What are the assumptions of the χ² test?', "When do I need Fisher's exact test?"],
      6: ['What does the table() function do in R?', 'What is df in the χ² test output?'],
      9: ['Why does association not mean causation?'],
      10: ['How do I prepare for the next case?'],
    },
  },
}

export function buildCase21(lang: Lang): CaseDefinition {
  const T = TEXT[lang]
  const L = CASE21_LABELS[lang]
  const preview = generateCase21Rows(lang).slice(0, 15).map(r => ({
    id: r.id, age: r.age, sex: r.sex, employment: r.emp, viral_load: r.vl, vl_suppressed: r.sup,
  }))
  return {
    id: '21',
    title: T.title,
    shortTitle: T.shortTitle,
    situation: T.situation,
    data: {
      fileName: 'case21_hiv_employment.csv',
      totalRows: 377,
      columns: ['id', 'age', 'sex', 'employment', 'viral_load', 'vl_suppressed'],
      preview,
      errors: T.dataErrors,
      retryHint: T.retryHint,
      allFoundNote: T.allFoundNote,
      csv: () => toCsv(['id', 'age', 'sex', 'employment', 'viral_load', 'vl_suppressed'], generateCase21Rows(lang, false).map(r => ({
        id: r.id, age: r.age, sex: r.sex, employment: r.emp, viral_load: r.vl, vl_suppressed: r.sup,
      }))),
    },
    variables: [
      { key: 'id', label: T.variables.id, expected: 'id' },
      { key: 'age', label: T.variables.age, expected: 'q' },
      { key: 'sex', label: T.variables.sex, expected: 'n' },
      { key: 'emp', label: T.variables.emp, expected: 'n' },
      { key: 'vl', label: T.variables.vl, expected: 'q' },
      { key: 'sup', label: T.variables.sup, expected: 'b', accepted: ['n'] },
    ],
    outcome: 'sup',
    method: { ...T.method, correct: 2 },
    code: {
      templates: {
        R: ['d <- read.csv("case21_hiv_employment.csv")', 'tab <- table(d$[0], d$[1])', 'chisq.test(tab)', 'prop.table(tab, 1)'],
        Python: ['import pandas as pd', 'from scipy.stats import chi2_contingency', 'd = pd.read_csv("case21_hiv_employment.csv")', 'tab = pd.crosstab(d["[0]"], d["[1]"])', 'chi2, p, dof, exp = chi2_contingency(tab, correction=False)', 'print(chi2, p, dof)'],
      },
      blankAnswers: ['employment', 'vl_suppressed'],
      freeRequired: [{ source: '(chisq\\.test|chi2_contingency)' }, { source: 'employment' }, { source: 'vl_suppressed' }],
      outputs: T.outputs,
      errors: T.errors,
      chart: {
        title: T.chartTitle,
        bars: [[L.emp.self, 83.9], [L.emp.home, 76.9], [L.emp.wage, 94.0]],
      },
    },
    interpretation: {
      checklist: [
        { label: T.checklist[0], pattern: PATTERNS.shares },
        { label: T.checklist[1], pattern: PATTERNS.statistic },
        { label: T.checklist[2], pattern: PATTERNS.group },
        { label: T.checklist[3], pattern: PATTERNS.limitation },
      ],
    },
    aiTrap: { fragments: T.fragments, wrongIndex: 2, explanation: PATTERNS.aiTrap },
    debrief: T.debrief,
    tutor: { quick: T.tutor },
  }
}

/** Русский вариант — для тестов и мест, где язык не важен (баллы одинаковы на всех языках). */
export const case21: CaseDefinition = buildCase21('ru')
