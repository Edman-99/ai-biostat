import type { Lang } from '@/api/types'
import type { CaseDefinition, Pattern } from '@/domain/cases/CaseDefinition'
import { int, rng, shuffledUnits } from '../shared/synthetic'

/**
 * Кейс 4. Неонатальный сепсис: «случай-контроль». χ²-критерий и отношение шансов (логистическая регрессия,
 * Wald 95% ДИ = метод Вульфа). Вымышленный кейс (Claude, 17.11.2026; пакет v0.2 не использовался) — нужна экспертиза.
 * Таблица sepsis × prom18 = (1,1) 24, (1,0) 36, (0,1) 22, (0,0) 98; 60 случаев, 120 контролей.
 * Эталон (scipy/statsmodels): воздействие 40,0% vs 18,3%; χ² = 9,8702 (без поправки), p = 0,00168;
 * ОШ = 2,9697 (95% ДИ 1,4847–5,9399).
 */
const SEX: Record<Lang, { m: string; f: string }> = { ru: { m: 'М', f: 'Ж' }, kk: { m: 'Е', f: 'Ә' }, en: { m: 'M', f: 'F' } }

export function generateCase04Rows(lang: Lang = 'ru') {
  const R = rng(404)
  const units = shuffledUnits<[number, number]>(R, [[[1, 1], 24], [[1, 0], 36], [[0, 1], 22], [[0, 0], 98]])
  const rows = units.map(([sepsis, prom18], i) => ({
    id: i + 1,
    sepsis,
    prom18,
    birth_weight: 10 * (sepsis ? int(R, 230, 370) : int(R, 270, 420)),
    gest_age: sepsis ? int(R, 33, 39) : int(R, 36, 41),
    sex: R() < 0.52 ? SEX[lang].m : SEX[lang].f,
  }))
  // «грязь» для шага 2
  rows[1].birth_weight = 32000
  rows[5].gest_age = 54
  rows[11].prom18 = 3
  return rows
}

const PATTERNS = {
  shares: { source: '(\\d{2}[,.]?\\d?\\s?%)|доля|доли|процент|үлес|пайыз|proportion|percent', flags: 'i' },
  test: { source: '(χ|хи|chi|9[,.]8|p\\s*[=<])', flags: 'i' },
  // без флага i: иначе «OR» совпадёт с английским словом «or»
  or: { source: '(ОШ|МҚ|[Оо]тношени[ея] шансов|[Шш]анс|[Oo]dds|[Мм]үмкіндік|\\bOR\\b|2[,.]97?)' },
  limitation: { source: '(причин|огранич|не доказ|наблюдат|ассоци|связ|смешив|confound|себеп|шектеу|дәлелде|бақылау|байланыс|caus|limit|not prove|observational|associat|ретроспектив|retrospective)', flags: 'i' },
  // без флага i: «ОР»/«OR» иначе совпадут с частью любого слова («фактор», «or»)
  aiTrap: { source: '([Шш]анс|[Oo]dds|[Мм]үмкіндік|ОШ|МҚ|\\bOR\\b|\\bRR\\b|(^|[^А-Яа-яЁё])ОР([^А-Яа-яЁё]|$)|[Сс]лучай-?\\s?контроль|[Cc]ase-?\\s?control|[Жж]ағдай-?\\s?бақылау|[Нн]ельзя|[Cc]annot|can\'t|мүмкін емес|[Зз]аболеваем|[Ii]ncidence)' },
} satisfies Record<string, Pattern>

interface Text {
  title: string
  shortTitle: string
  situation: CaseDefinition['situation']
  dataErrors: Record<number, string>
  retryHint: string
  allFoundNote: string
  variables: Record<'id' | 'sepsis' | 'prom18' | 'weight' | 'gest' | 'sex', string>
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
    title: 'Неонатальный сепсис: случай-контроль',
    shortTitle: 'Неонатальный сепсис',
    situation: {
      paragraphs: [
        'Вы — эпидемиолог перинатального центра Учебной территории. За год в отделении новорождённых зарегистрированы случаи раннего неонатального сепсиса. Чтобы проверить гипотезу о факторе риска, проведено исследование **«случай-контроль»**: **60** новорождённых с сепсисом (случаи) и **120** новорождённых без сепсиса (контроли). Изучаемое воздействие — безводный период более 18 часов.',
        'Заведующий отделением спрашивает: связан ли длительный безводный период с неонатальным сепсисом и насколько сильна эта связь?',
      ],
      goal: 'Что вы будете уметь после кейса: объяснять, почему в исследовании «случай-контроль» рассчитывают отношение шансов, а не риск, выполнять χ²-тест и получать ОШ с 95% ДИ в R или Python.',
    },
    dataErrors: {
      2: 'Масса тела 32 000 г — лишний ноль (вероятно, 3 200 г)',
      6: 'Срок гестации 54 недели — невозможное значение',
      12: 'В бинарной переменной prom18 значение 3 — допустимы только 0 и 1',
    },
    retryHint: 'Проверьте правдоподобие массы тела и срока гестации, а также коды бинарных переменных.',
    allFoundNote: 'Все три проблемы найдены. В анализе значения исправлены по истории развития новорождённого; на итог по безводному периоду и сепсису они не влияют.',
    variables: {
      id: 'Номер новорождённого', sepsis: 'Сепсис (1 — случай, 0 — контроль)', prom18: 'Безводный период >18 ч (1 — да, 0 — нет)',
      weight: 'Масса тела при рождении, г', gest: 'Срок гестации, недель', sex: 'Пол',
    },
    method: {
      question: 'Дизайн — «случай-контроль». Каким показателем и критерием оценить связь безводного периода >18 ч с сепсисом?',
      options: ['Относительный риск (ОР) и χ²-критерий', 'Отношение шансов (ОШ) и χ²-критерий', 't-критерий для независимых групп', 'Корреляция Пирсона', 'Однофакторный дисперсионный анализ (ANOVA)'],
      retryHint: 'Подумайте: в «случай-контроль» исследователь сам задал число больных и здоровых. Можно ли тогда рассчитать риск заболеть?',
      failNote: 'Обе попытки использованы. Направление: в исследовании «случай-контроль» долю заболевших задаёт исследователь, поэтому риск и ОР не рассчитывают — используют отношение шансов. Метод отмечен в дебрифинге как зона роста.',
    },
    errors: {
      R: 'Error in table(...): все аргументы должны иметь одинаковую длину — столбец не найден.',
      Python: 'KeyError: столбец не найден в таблице.',
    },
    chartTitle: 'Доля новорождённых с безводным периодом >18 ч',
    bars: ['Случаи (сепсис)', 'Контроли'],
    checklist: ['Доли воздействия у случаев и контролей', 'Статистика χ² и p-значение', 'Отношение шансов и его 95% ДИ', 'Ограничения: дизайн, наблюдательная связь, смешивающие факторы'],
    fragments: [
      'Длительный безводный период (>18 ч) отмечен у 40% новорождённых с сепсисом и у 18% в контрольной группе.',
      'χ² = 9,87; p = 0,002; ОШ = 2,97 (95% ДИ 1,48–5,94).',
      'Следовательно, риск сепсиса у новорождённых с безводным периодом более 18 часов в 3 раза выше.',
      'Для уточнения стоит учесть срок гестации и массу тела при рождении.',
    ],
    debrief: {
      referenceConclusion: 'Эталонный вывод: безводный период более 18 часов встречался у 40,0% новорождённых с сепсисом и у 18,3% в контрольной группе (χ² = 9,87; p = 0,002). Отношение шансов 2,97 (95% ДИ 1,48–5,94): шансы воздействия среди случаев примерно в 3 раза выше. Дизайн «случай-контроль» не позволяет рассчитать риск и ОР; связь наблюдательная, возможны смешивающие факторы (например, недоношенность).',
      typesRepeat: 'Типы переменных: бинарный исход и бинарное воздействие',
      methodSecondTryRepeat: 'ОШ или ОР: выбор зависит от дизайна',
      methodFailedRepeat: 'Дизайн «случай-контроль» и отношение шансов',
      aiFound: 'Найдена ошибка ИИ: ОШ из исследования «случай-контроль» выдано за риск',
      aiMissed: 'Ошибка ИИ не найдена (фрагмент 3: ОШ ≠ относительный риск)',
      aiRepeat: 'Отношение шансов и относительный риск',
      disputeSteps: ['Шаг 7. Интерпретация', 'Шаг 8. Проверка ИИ', 'Шаг 5. Выбор метода'],
    },
    tutor: {
      1: ['Что такое исследование «случай-контроль»?', 'Что такое ранний неонатальный сепсис?'],
      2: ['Какая масса тела новорождённого правдоподобна?', 'Как проверить, что бинарная переменная закодирована только 0 и 1?'],
      3: ['Срок гестации в неделях — какой это тип переменной?', 'Что является исходом в исследовании «случай-контроль»?'],
      5: ['Почему в «случай-контроль» нельзя рассчитать риск?', 'Чем отношение шансов отличается от относительного риска?'],
      6: ['Как получить ОШ и 95% ДИ через логистическую регрессию?', 'Что означает exp(коэффициента) в логистической регрессии?'],
      9: ['Когда отношение шансов близко к относительному риску?'],
      10: ['Как подготовиться к следующему кейсу?'],
    },
  },

  kk: {
    title: 'Неонаталдық сепсис: жағдай-бақылау',
    shortTitle: 'Неонаталдық сепсис',
    situation: {
      paragraphs: [
        'Сіз — Оқу аумағындағы перинаталдық орталықтың эпидемиологысыз. Бір жылда жаңа туған нәрестелер бөлімшесінде ерте неонаталдық сепсис жағдайлары тіркелді. Қауіп факторы туралы болжамды тексеру үшін **«жағдай-бақылау» (case-control)** зерттеуі жүргізілді: сепсисі бар **60** нәресте (жағдайлар) және сепсисі жоқ **120** нәресте (бақылау тобы). Зерттелетін әсер — 18 сағаттан ұзақ сусыз кезең.',
        'Бөлім меңгерушісі сұрайды: ұзақ сусыз кезең неонаталдық сепсиспен байланысты ма және бұл байланыс қаншалықты күшті?',
      ],
      goal: 'Кейстен кейін не істей аласыз: «жағдай-бақылау» зерттеуінде неге тәуекел емес, мүмкіндіктер қатынасы (МҚ, OR) есептелетінін түсіндіру, χ²-тест орындау және R немесе Python-да 95% СА-мен МҚ алу.',
    },
    dataErrors: {
      2: 'Дене салмағы 32 000 г — артық нөл (шамасы, 3 200 г)',
      6: 'Гестация мерзімі 54 апта — мүмкін емес мән',
      12: 'prom18 бинарлы айнымалысында 3 мәні — тек 0 және 1 болуы мүмкін',
    },
    retryHint: 'Дене салмағы мен гестация мерзімінің шынайылығын, сондай-ақ бинарлы айнымалылардың кодтарын тексеріңіз.',
    allFoundNote: 'Үш мәселенің бәрі табылды. Талдауда мәндер нәрестенің даму тарихы бойынша түзетілді; олар сусыз кезең мен сепсис бойынша қорытындыға әсер етпейді.',
    variables: {
      id: 'Нәресте нөмірі', sepsis: 'Сепсис (1 — жағдай, 0 — бақылау)', prom18: 'Сусыз кезең >18 сағ (1 — иә, 0 — жоқ)',
      weight: 'Туған кездегі дене салмағы, г', gest: 'Гестация мерзімі, апта', sex: 'Жынысы',
    },
    method: {
      question: 'Дизайн — «жағдай-бақылау». Сусыз кезеңнің >18 сағ сепсиспен байланысын қандай көрсеткішпен және критериймен бағалау керек?',
      options: ['Салыстырмалы тәуекел (СТ, RR) және χ²-критерий', 'Мүмкіндіктер қатынасы (МҚ, OR) және χ²-критерий', 'Тәуелсіз топтарға арналған t-критерий', 'Пирсон корреляциясы', 'Бірфакторлы дисперсиялық талдау (ANOVA)'],
      retryHint: 'Ойланыңыз: «жағдай-бақылау» зерттеуінде ауру және сау балалар санын зерттеушінің өзі белгілеген. Сонда ауыру тәуекелін есептеуге бола ма?',
      failNote: 'Екі әрекет те пайдаланылды. Бағыт: «жағдай-бақылау» зерттеуінде ауырғандар үлесін зерттеуші белгілейді, сондықтан тәуекел мен СТ есептелмейді — мүмкіндіктер қатынасы қолданылады. Әдіс дебрифингте даму аймағы ретінде белгіленді.',
    },
    errors: {
      R: 'Error in table(...): барлық аргументтердің ұзындығы бірдей болуы керек — баған табылмады.',
      Python: 'KeyError: кестеде мұндай баған жоқ.',
    },
    chartTitle: 'Сусыз кезеңі >18 сағ болған нәрестелер үлесі',
    bars: ['Жағдайлар (сепсис)', 'Бақылау тобы'],
    checklist: ['Жағдайлар мен бақылау тобындағы әсер үлестері', 'χ² статистикасы және p-мәні', 'Мүмкіндіктер қатынасы және оның 95% СА', 'Шектеулер: дизайн, бақылаулық байланыс, шатастырушы факторлар'],
    fragments: [
      'Ұзақ сусыз кезең (>18 сағ) сепсисі бар нәрестелердің 40%-ында және бақылау тобының 18%-ында тіркелді.',
      'χ² = 9,87; p = 0,002; МҚ = 2,97 (95% СА 1,48–5,94).',
      'Демек, сусыз кезеңі 18 сағаттан ұзақ болған нәрестелерде сепсис тәуекелі 3 есе жоғары.',
      'Нақтылау үшін гестация мерзімі мен туған кездегі дене салмағын ескерген жөн.',
    ],
    debrief: {
      referenceConclusion: 'Эталон қорытынды: 18 сағаттан ұзақ сусыз кезең сепсисі бар нәрестелердің 40,0%-ында және бақылау тобының 18,3%-ында кездесті (χ² = 9,87; p = 0,002). Мүмкіндіктер қатынасы 2,97 (95% СА 1,48–5,94): жағдайлар арасында әсердің мүмкіндігі шамамен 3 есе жоғары. «Жағдай-бақылау» дизайны тәуекел мен СТ есептеуге мүмкіндік бермейді; байланыс бақылаулық, шатастырушы факторлар (мысалы, шала туу) болуы мүмкін.',
      typesRepeat: 'Айнымалылар түрлері: бинарлы нәтиже және бинарлы әсер',
      methodSecondTryRepeat: 'МҚ немесе СТ: таңдау дизайнға байланысты',
      methodFailedRepeat: '«Жағдай-бақылау» дизайны және мүмкіндіктер қатынасы',
      aiFound: 'ЖИ қатесі табылды: «жағдай-бақылау» зерттеуінің МҚ-ы тәуекел ретінде берілді',
      aiMissed: 'ЖИ қатесі табылмады (3-фрагмент: МҚ ≠ салыстырмалы тәуекел)',
      aiRepeat: 'Мүмкіндіктер қатынасы және салыстырмалы тәуекел',
      disputeSteps: ['7-қадам. Интерпретация', '8-қадам. ЖИ-ді тексеру', '5-қадам. Әдісті таңдау'],
    },
    tutor: {
      1: ['«Жағдай-бақылау» зерттеуі деген не?', 'Ерте неонаталдық сепсис деген не?'],
      2: ['Нәрестенің қандай дене салмағы шынайы?', 'Бинарлы айнымалы тек 0 және 1-мен кодталғанын қалай тексеруге болады?'],
      3: ['Аптамен берілген гестация мерзімі — айнымалының қай түрі?', '«Жағдай-бақылау» зерттеуінде нәтиже (outcome) не?'],
      5: ['Неге «жағдай-бақылау» зерттеуінде тәуекелді есептеуге болмайды?', 'Мүмкіндіктер қатынасы салыстырмалы тәуекелден немен ерекшеленеді?'],
      6: ['Логистикалық регрессия арқылы МҚ мен 95% СА қалай алынады?', 'Логистикалық регрессиядағы exp(коэффициент) нені білдіреді?'],
      9: ['Мүмкіндіктер қатынасы қашан салыстырмалы тәуекелге жақын болады?'],
      10: ['Келесі кейске қалай дайындалуға болады?'],
    },
  },

  en: {
    title: 'Neonatal sepsis: case-control',
    shortTitle: 'Neonatal sepsis',
    situation: {
      paragraphs: [
        'You are an epidemiologist at the perinatal centre of the Training Territory. Over a year, cases of early-onset neonatal sepsis were recorded in the neonatal unit. To test a hypothesis about a risk factor, a **case-control** study was carried out: **60** newborns with sepsis (cases) and **120** newborns without sepsis (controls). The exposure studied is prolonged rupture of membranes of more than 18 hours.',
        'The head of the unit asks: is prolonged rupture of membranes associated with neonatal sepsis, and how strong is the association?',
      ],
      goal: 'After this case you will be able to explain why a case-control study uses the odds ratio rather than risk, run a χ² test, and obtain the OR with its 95% CI in R or Python.',
    },
    dataErrors: {
      2: 'Birth weight of 32,000 g — an extra zero (probably 3,200 g)',
      6: 'Gestational age of 54 weeks — an impossible value',
      12: 'Value 3 in the binary variable prom18 — only 0 and 1 are allowed',
    },
    retryHint: 'Check whether birth weight and gestational age are plausible, and check the codes of the binary variables.',
    allFoundNote: 'All three problems found. The values are corrected from the newborn records in the analysis; they do not affect the result for rupture of membranes and sepsis.',
    variables: {
      id: 'Newborn number', sepsis: 'Sepsis (1 — case, 0 — control)', prom18: 'Rupture of membranes >18 h (1 — yes, 0 — no)',
      weight: 'Birth weight, g', gest: 'Gestational age, weeks', sex: 'Sex',
    },
    method: {
      question: 'The design is case-control. Which measure and test should you use to assess the association between rupture of membranes >18 h and sepsis?',
      options: ['Relative risk (RR) and the χ² test', 'Odds ratio (OR) and the χ² test', 'Independent-samples t-test', 'Pearson correlation', 'One-way analysis of variance (ANOVA)'],
      retryHint: 'Think: in a case-control study, the researcher sets the number of sick and healthy children. Can you then calculate the risk of getting sick?',
      failNote: 'Both attempts used. Direction: in a case-control study the proportion of cases is set by the researcher, so risk and RR are not calculated — the odds ratio is used. The method is marked as an area for growth in the debriefing.',
    },
    errors: {
      R: 'Error in table(...): all arguments must have the same length — column not found.',
      Python: 'KeyError: column not found in the table.',
    },
    chartTitle: 'Proportion of newborns with rupture of membranes >18 h',
    bars: ['Cases (sepsis)', 'Controls'],
    checklist: ['Proportion exposed among cases and controls', 'χ² statistic and p-value', 'Odds ratio and its 95% CI', 'Limitations: design, observational association, confounders'],
    fragments: [
      'Prolonged rupture of membranes (>18 h) was found in 40% of newborns with sepsis and in 18% of controls.',
      'χ² = 9.87; p = 0.002; OR = 2.97 (95% CI 1.48–5.94).',
      'Therefore, the risk of sepsis in newborns with rupture of membranes over 18 hours is 3 times higher.',
      'To refine this, gestational age and birth weight should be taken into account.',
    ],
    debrief: {
      referenceConclusion: 'Reference conclusion: rupture of membranes over 18 hours occurred in 40.0% of newborns with sepsis and in 18.3% of controls (χ² = 9.87; p = 0.002). The odds ratio is 2.97 (95% CI 1.48–5.94): the odds of exposure among cases are about 3 times higher. A case-control design does not allow risk or RR to be calculated; the association is observational and may be confounded (for example, by prematurity).',
      typesRepeat: 'Variable types: binary outcome and binary exposure',
      methodSecondTryRepeat: 'OR or RR: the choice depends on the design',
      methodFailedRepeat: 'Case-control design and the odds ratio',
      aiFound: 'AI error found: a case-control OR was presented as risk',
      aiMissed: 'AI error not found (fragment 3: OR ≠ relative risk)',
      aiRepeat: 'Odds ratio and relative risk',
      disputeSteps: ['Step 7. Interpretation', 'Step 8. AI check', 'Step 5. Choosing the method'],
    },
    tutor: {
      1: ['What is a case-control study?', 'What is early-onset neonatal sepsis?'],
      2: ['What birth weights are plausible?', 'How do I check that a binary variable is coded only as 0 and 1?'],
      3: ['What type of variable is gestational age in weeks?', 'What is the outcome in a case-control study?'],
      5: ['Why can’t risk be calculated in a case-control study?', 'How does the odds ratio differ from relative risk?'],
      6: ['How do I get the OR and 95% CI from logistic regression?', 'What does exp(coefficient) mean in logistic regression?'],
      9: ['When is the odds ratio close to the relative risk?'],
      10: ['How do I prepare for the next case?'],
    },
  },
}

const OUTPUTS: CaseDefinition['code']['outputs'] = {
  R: "\tPearson's Chi-squared test\n\ndata:  tab\nX-squared = 9.8702, df = 1, p-value = 0.00168\n\n                   OR     2.5 %    97.5 %\n(Intercept) 0.3673469 0.2507185 0.5382283\nprom18      2.9696970 1.4847143 5.9399307",
  Python: '(9.870214146658014, 0.0016797595630055565, 1)\nconst     0.367347\nprom18    2.969697\ndtype: float64\n               0         1\nconst   0.250718  0.538228\nprom18  1.484714  5.939931',
}

export function buildCase04(lang: Lang): CaseDefinition {
  const T = TEXT[lang]
  return {
    id: '4',
    title: T.title,
    shortTitle: T.shortTitle,
    situation: T.situation,
    data: {
      fileName: 'case04_neonatal_sepsis.csv',
      totalRows: 180,
      columns: ['id', 'sepsis', 'prom18', 'birth_weight', 'gest_age', 'sex'],
      preview: generateCase04Rows(lang).slice(0, 15),
      errors: T.dataErrors,
      retryHint: T.retryHint,
      allFoundNote: T.allFoundNote,
    },
    variables: [
      { key: 'id', label: T.variables.id, expected: 'id' },
      { key: 'sepsis', label: T.variables.sepsis, expected: 'b', accepted: ['n'] },
      { key: 'prom18', label: T.variables.prom18, expected: 'b', accepted: ['n'] },
      { key: 'weight', label: T.variables.weight, expected: 'q' },
      { key: 'gest', label: T.variables.gest, expected: 'q' },
      { key: 'sex', label: T.variables.sex, expected: 'n', accepted: ['b'] },
    ],
    outcome: 'sepsis',
    method: { ...T.method, correct: 1 },
    code: {
      templates: {
        R: [
          'd <- read.csv("case04_neonatal_sepsis.csv")',
          'tab <- table(d$[0], d$[1])',
          'chisq.test(tab, correct = FALSE)',
          'm <- glm(sepsis ~ prom18, data = d, family = binomial)',
          'exp(cbind(OR = coef(m), confint.default(m)))',
        ],
        Python: [
          'import numpy as np',
          'import pandas as pd',
          'import statsmodels.api as sm',
          'from scipy.stats import chi2_contingency',
          'd = pd.read_csv("case04_neonatal_sepsis.csv")',
          'tab = pd.crosstab(d["[0]"], d["[1]"])',
          'print(chi2_contingency(tab, correction=False)[:3])',
          'm = sm.Logit(d["sepsis"], sm.add_constant(d["prom18"])).fit(disp=0)',
          'print(np.exp(m.params))',
          'print(np.exp(m.conf_int()))',
        ],
      },
      blankAnswers: ['prom18', 'sepsis'],
      freeRequired: [
        { source: '(chisq\\.test|chi2_contingency)' }, { source: '(glm|Logit|logit|odds|oddsratio|Table2x2)' },
        { source: 'prom18' }, { source: 'sepsis' },
      ],
      outputs: OUTPUTS,
      errors: T.errors,
      chart: { title: T.chartTitle, bars: [[T.bars[0], 40.0], [T.bars[1], 18.3]] },
    },
    interpretation: {
      checklist: [
        { label: T.checklist[0], pattern: PATTERNS.shares },
        { label: T.checklist[1], pattern: PATTERNS.test },
        { label: T.checklist[2], pattern: PATTERNS.or },
        { label: T.checklist[3], pattern: PATTERNS.limitation },
      ],
    },
    aiTrap: { fragments: T.fragments, wrongIndex: 2, explanation: PATTERNS.aiTrap },
    debrief: T.debrief,
    tutor: { quick: T.tutor },
  }
}
