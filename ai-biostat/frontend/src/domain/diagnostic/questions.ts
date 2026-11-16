import type { Localized } from '@/core/localized'
import type { Block, DiagnosticQuestion } from './Diagnostic'

/**
 * Диагностика пилота: два параллельных варианта по 20 вопросов (А — входная, Б — итоговая).
 * Вопрос N варианта А и вопрос N варианта Б проверяют одно и то же умение на разном материале
 * одинаковой сложности. По 5 вопросов на компетенцию (вопросы 1–5 данные, 6–10 методы,
 * 11–15 интерпретация, 16–20 работа с ИИ). Написано Claude 17.11.2026 (исходный файл
 * «диагностика и глоссарий» не найден) — нужна экспертиза; KZ — черновик для вычитки.
 */
type Tri = [ru: string, kk: string, en: string]
const L = ([ru, kk, en]: Tri): Localized => ({ ru, kk, en })
const q = (block: Block, question: Tri, options: Tri[], answer: number): DiagnosticQuestion =>
  ({ block, question: L(question), options: options.map(L), answer })

const DATA: Block = 'Работа с данными'
const STAT: Block = 'Биостатистика'
const INTERP: Block = 'Интерпретация'
const AI: Block = 'Работа с ИИ'

// ---------- общие наборы вариантов ----------
const VAR_TYPES: Tri[] = [
  ['Количественная', 'Сандық', 'Quantitative'],
  ['Порядковая', 'Реттік', 'Ordinal'],
  ['Номинальная', 'Номиналды', 'Nominal'],
  ['Бинарная', 'Бинарлы', 'Binary'],
]
const AI_VERDICT: Tri[] = [
  ['Верно', 'Дұрыс', 'Correct'],
  ['Есть ошибка', 'Қате бар', 'Contains an error'],
  ['Недостаточно данных', 'Деректер жеткіліксіз', 'Not enough information'],
]
const DESCRIBE: Tri[] = [
  ['Среднее и стандартное отклонение', 'Орташа мән және стандартты ауытқу', 'Mean and standard deviation'],
  ['Мода', 'Мода', 'Mode'],
  ['Медиана и межквартильный размах', 'Медиана және квартильаралық ауқым', 'Median and interquartile range'],
  ['Только минимум и максимум', 'Тек минимум мен максимум', 'Minimum and maximum only'],
]
const CODING: Tri[] = [
  ['Несогласованное кодирование одной категории — привести к одному виду', 'Бір санаттың біркелкі емес кодталуы — бір түрге келтіру керек', 'Inconsistent coding of one category — make it uniform'],
  ['Всё нормально, это разные категории', 'Бәрі дұрыс, бұл әртүрлі санаттар', 'Everything is fine, these are different categories'],
  ['Это пропущенные значения', 'Бұл өткізіп алынған мәндер', 'These are missing values'],
  ['Это количественная переменная', 'Бұл сандық айнымалы', 'This is a quantitative variable'],
]
const TWO_GROUPS_MEANS: Tri[] = [
  ['Парный t-критерий', 'Жұптық t-критерий', 'Paired t-test'],
  ['t-критерий для независимых групп', 'Тәуелсіз топтарға арналған t-критерий', 'Independent-samples t-test'],
  ['χ²-критерий Пирсона', 'Пирсонның χ²-критерийі', "Pearson's χ² test"],
  ['Корреляция Пирсона', 'Пирсон корреляциясы', 'Pearson correlation'],
]
const PROPORTIONS: Tri[] = [
  ['t-критерий Стьюдента', 'Стьюдент t-критерийі', "Student's t-test"],
  ['Корреляция Пирсона', 'Пирсон корреляциясы', 'Pearson correlation'],
  ['Парный t-критерий', 'Жұптық t-критерий', 'Paired t-test'],
  ['χ²-критерий Пирсона', 'Пирсонның χ²-критерийі', "Pearson's χ² test"],
]
const PAIRED: Tri[] = [
  ['t-критерий для независимых групп', 'Тәуелсіз топтарға арналған t-критерий', 'Independent-samples t-test'],
  ['χ²-критерий Пирсона', 'Пирсонның χ²-критерийі', "Pearson's χ² test"],
  ['Парный t-критерий', 'Жұптық t-критерий', 'Paired t-test'],
  ['Однофакторный дисперсионный анализ (ANOVA)', 'Бірфакторлы дисперсиялық талдау (ANOVA)', 'One-way ANOVA'],
]
const NONPARAM: Tri[] = [
  ['Критерий Манна–Уитни', 'Манн–Уитни критерийі', 'Mann–Whitney test'],
  ['t-критерий для независимых групп', 'Тәуелсіз топтарға арналған t-критерий', 'Independent-samples t-test'],
  ['Парный t-критерий', 'Жұптық t-критерий', 'Paired t-test'],
  ['Критерий Уилкоксона для связанных выборок', 'Байланысқан іріктемелерге арналған Уилкоксон критерийі', 'Wilcoxon signed-rank test'],
]
const CORREL: Tri[] = [
  ['χ²-критерий Пирсона', 'Пирсонның χ²-критерийі', "Pearson's χ² test"],
  ['t-критерий для независимых групп', 'Тәуелсіз топтарға арналған t-критерий', 'Independent-samples t-test'],
  ['Критерий Мак-Немара', 'Мак-Немар критерийі', "McNemar's test"],
  ['Корреляция Пирсона', 'Пирсон корреляциясы', 'Pearson correlation'],
]

export const DIAGNOSTIC_A: DiagnosticQuestion[] = [
  // ---------- работа с данными ----------
  q(DATA, ['Стадия ВИЧ-инфекции (1, 2, 3, 4) — это какая переменная?', 'АИТВ-инфекциясының сатысы (1, 2, 3, 4) — бұл қандай айнымалы?', 'HIV infection stage (1, 2, 3, 4) is what kind of variable?'], VAR_TYPES, 1),
  q(DATA, ['Группа крови (O, A, B, AB) — это какая переменная?', 'Қан тобы (O, A, B, AB) — бұл қандай айнымалы?', 'Blood group (O, A, B, AB) is what kind of variable?'], VAR_TYPES, 2),
  q(DATA, ['В таблице возраст пациента — 230 лет. Что правильнее всего сделать?', 'Кестеде пациенттің жасы — 230 жыл. Ең дұрысы не істеу?', 'A patient’s age in the table is 230 years. What is the best thing to do?'], [
    ['Оставить: это просто выброс', 'Қалдыру: бұл жай шеткі мән', 'Keep it: it is just an outlier'],
    ['Проверить по первичному документу; исправить или отметить как пропуск', 'Бастапқы құжат бойынша тексеру; түзету немесе өткізіп алу деп белгілеу', 'Check the source document; correct it or mark it as missing'],
    ['Заменить средним возрастом без проверки', 'Тексерусіз орташа жаспен ауыстыру', 'Replace it with the mean age without checking'],
    ['Удалить всю таблицу', 'Бүкіл кестені жою', 'Delete the whole table'],
  ], 1),
  q(DATA, ['Длительность госпитализации имеет сильную правостороннюю асимметрию. Как лучше её описать?', 'Ауруханада болу ұзақтығы күшті оң жақты асимметрияға ие. Оны қалай сипаттаған дұрыс?', 'Length of hospital stay is strongly right-skewed. How is it best described?'], DESCRIBE, 2),
  q(DATA, ['В столбце «пол» встречаются значения «М», «м» и «муж.». В чём проблема?', '«Жынысы» бағанында «Е», «е» және «ер» мәндері кездеседі. Мәселе неде?', 'The “sex” column contains the values “M”, “m” and “male”. What is the problem?'], CODING, 0),

  // ---------- биостатистика ----------
  q(STAT, ['Нужно сравнить среднее систолическое давление в двух независимых группах; распределение близко к нормальному. Какой метод подходит?', 'Екі тәуелсіз топтағы орташа систолалық қысымды салыстыру керек; таралуы қалыптыға жақын. Қай әдіс сәйкес келеді?', 'You need to compare mean systolic blood pressure between two independent groups; the distribution is close to normal. Which method fits?'], TWO_GROUPS_MEANS, 1),
  q(STAT, ['Нужно сравнить долю пациентов с подавленной вирусной нагрузкой в трёх группах занятости. Какой метод подходит?', 'Жұмыспен қамтудың үш тобында вирустық жүктемесі басылған пациенттердің үлесін салыстыру керек. Қай әдіс сәйкес келеді?', 'You need to compare the proportion of patients with suppressed viral load across three employment groups. Which method fits?'], PROPORTIONS, 3),
  q(STAT, ['Давление измерено у одних и тех же 30 пациентов до и после лечения; разности распределены нормально. Какой метод подходит?', 'Қысым сол бір 30 пациентте емдеуге дейін және кейін өлшенді; айырмалар қалыпты таралған. Қай әдіс сәйкес келеді?', 'Blood pressure was measured in the same 30 patients before and after treatment; the differences are normally distributed. Which method fits?'], PAIRED, 2),
  q(STAT, ['Нужно сравнить длительность госпитализации в двух независимых группах; распределение сильно скошено, выборки малые. Какой метод подходит?', 'Екі тәуелсіз топтағы ауруханада болу ұзақтығын салыстыру керек; таралуы қатты қисайған, іріктемелер шағын. Қай әдіс сәйкес келеді?', 'You need to compare length of hospital stay between two independent groups; the distribution is strongly skewed and the samples are small. Which method fits?'], NONPARAM, 0),
  q(STAT, ['Нужно оценить связь между возрастом и систолическим давлением; обе переменные количественные, связь линейная. Какой метод подходит?', 'Жас пен систолалық қысым арасындағы байланысты бағалау керек; екі айнымалы да сандық, байланыс сызықтық. Қай әдіс сәйкес келеді?', 'You need to assess the association between age and systolic blood pressure; both variables are quantitative and the relationship is linear. Which method fits?'], CORREL, 3),

  // ---------- интерпретация ----------
  q(INTERP, ['ОШ = 2,1; 95% ДИ 0,8–5,4. Какой вывод корректен?', 'МҚ (OR) = 2,1; 95% СА (CI) 0,8–5,4. Қай қорытынды дұрыс?', 'OR = 2.1; 95% CI 0.8–5.4. Which conclusion is correct?'], [
    ['Связь доказана: шансы выше в 2,1 раза', 'Байланыс дәлелденді: мүмкіндік 2,1 есе жоғары', 'The association is proven: the odds are 2.1 times higher'],
    ['Связь не доказана: ДИ включает 1', 'Байланыс дәлелденбеді: СА 1-ді қамтиды', 'The association is not shown: the CI includes 1'],
    ['Риск выше на 110%', 'Тәуекел 110%-ға жоғары', 'The risk is 110% higher'],
    ['Без p-значения ничего сказать нельзя', 'p-мәнінсіз ештеңе айту мүмкін емес', 'Nothing can be said without a p-value'],
  ], 1),
  q(INTERP, ['p = 0,03. Что это означает?', 'p = 0,03. Бұл нені білдіреді?', 'p = 0.03. What does this mean?'], [
    ['Гипотеза исследования верна с вероятностью 97%', 'Зерттеу гипотезасы 97% ықтималдықпен дұрыс', 'The study hypothesis is true with 97% probability'],
    ['Различие обязательно клинически важно', 'Айырма міндетті түрде клиникалық маңызды', 'The difference is necessarily clinically important'],
    ['Если бы различий не было, такие или большие различия встречались бы примерно в 3% случаев', 'Егер айырма болмаса, мұндай немесе одан үлкен айырмалар шамамен 3% жағдайда кездесер еді', 'If there were no difference, differences this large or larger would occur in about 3% of cases'],
    ['Вероятность ошибки в исследовании — 3%', 'Зерттеудегі қателік ықтималдығы — 3%', 'The probability that the study is wrong is 3%'],
  ], 2),
  q(INTERP, ['Разность средних давления — 4 мм рт. ст., 95% ДИ 1–7 мм рт. ст. Что верно?', 'Қысымның орташа мәндерінің айырмасы — 4 мм с.б., 95% СА 1–7 мм с.б. Не дұрыс?', 'The difference in mean blood pressure is 4 mmHg, 95% CI 1–7 mmHg. What is true?'], [
    ['Различие статистически значимо: ДИ не включает 0', 'Айырма статистикалық маңызды: СА 0-ді қамтымайды', 'The difference is statistically significant: the CI does not include 0'],
    ['Различие незначимо: ДИ слишком широкий', 'Айырма маңызды емес: СА тым кең', 'The difference is not significant: the CI is too wide'],
    ['Истинная разность точно равна 4 мм рт. ст.', 'Шынайы айырма дәл 4 мм с.б.', 'The true difference is exactly 4 mmHg'],
    ['ДИ показывает разброс давления у пациентов', 'СА пациенттердегі қысымның шашырауын көрсетеді', 'The CI shows the spread of blood pressure among patients'],
  ], 0),
  q(INTERP, ['Коэффициент корреляции между физической активностью и массой тела r = −0,65. Что верно?', 'Дене белсенділігі мен дене салмағы арасындағы корреляция коэффициенті r = −0,65. Не дұрыс?', 'The correlation coefficient between physical activity and body weight is r = −0.65. What is true?'], [
    ['Связи нет', 'Байланыс жоқ', 'There is no association'],
    ['Сильная прямая связь', 'Күшті тура байланыс', 'A strong positive association'],
    ['Активность снижает массу тела на 65%', 'Белсенділік дене салмағын 65%-ға төмендетеді', 'Activity reduces body weight by 65%'],
    ['Заметная обратная связь: при большей активности масса в среднем меньше', 'Айтарлықтай кері байланыс: белсенділік жоғары болса, салмақ орташа есеппен аз', 'A noticeable negative association: with more activity, weight is lower on average'],
  ], 3),
  q(INTERP, ['В наблюдательном исследовании рак лёгкого чаще у курящих (p < 0,001). Какой вывод корректен?', 'Бақылаулық зерттеуде өкпе обыры темекі шегетіндерде жиірек (p < 0,001). Қай қорытынды дұрыс?', 'In an observational study, lung cancer is more common among smokers (p < 0.001). Which conclusion is correct?'], [
    ['Это исследование доказывает, что курение вызывает рак', 'Бұл зерттеу темекі шегу обырды тудыратынын дәлелдейді', 'This study proves that smoking causes cancer'],
    ['Выявлена значимая связь; для вывода о причине нужны дополнительные доказательства', 'Маңызды байланыс анықталды; себеп туралы қорытындыға қосымша дәлелдер керек', 'A significant association was found; a causal conclusion needs further evidence'],
    ['Связи нет, результат случайный', 'Байланыс жоқ, нәтиже кездейсоқ', 'There is no association; the result is due to chance'],
    ['Вывод сделать нельзя, так как p слишком мало', 'p тым кіші болғандықтан, қорытынды жасауға болмайды', 'No conclusion is possible because p is too small'],
  ], 1),

  // ---------- работа с ИИ ----------
  q(AI, ['ИИ пишет: «p = 0,03 означает, что гипотеза верна с вероятностью 97%». Как оценить этот ответ?', 'ЖИ былай жазады: «p = 0,03 гипотезаның 97% ықтималдықпен дұрыс екенін білдіреді». Бұл жауапты қалай бағалайсыз?', 'An AI writes: “p = 0.03 means the hypothesis is true with 97% probability.” How do you rate this answer?'], AI_VERDICT, 1),
  q(AI, ['ИИ предложил статистический метод, не уточнив тип данных. Что следует сделать?', 'ЖИ деректер түрін нақтыламай статистикалық әдіс ұсынды. Не істеу керек?', 'An AI suggested a statistical method without asking about the data type. What should you do?'], [
    ['Принять ответ — ИИ не ошибается в статистике', 'Жауапты қабылдау — ЖИ статистикада қателеспейді', 'Accept the answer — AI does not make mistakes in statistics'],
    ['Выбрать любой другой метод', 'Кез келген басқа әдісті таңдау', 'Choose any other method'],
    ['Проверить тип данных и допущения метода', 'Деректер түрін және әдістің болжамдарын тексеру', 'Check the data type and the method’s assumptions'],
    ['Попросить ИИ ответить увереннее', 'ЖИ-ден сенімдірек жауап беруді сұрау', 'Ask the AI to answer more confidently'],
  ], 2),
  q(AI, ['ИИ пишет: «Для сравнения долей в двух независимых группах используем t-критерий Стьюдента». Как оценить этот ответ?', 'ЖИ былай жазады: «Екі тәуелсіз топтағы үлестерді салыстыру үшін Стьюдент t-критерийін қолданамыз». Бұл жауапты қалай бағалайсыз?', 'An AI writes: “To compare proportions in two independent groups, we use Student’s t-test.” How do you rate this answer?'], AI_VERDICT, 1),
  q(AI, ['ИИ ссылается на статью с авторами и DOI, но вы не можете её найти. Как поступить?', 'ЖИ авторлары мен DOI көрсетілген мақалаға сілтеме жасайды, бірақ сіз оны таба алмайсыз. Не істеу керек?', 'An AI cites an article with authors and a DOI, but you cannot find it. What should you do?'], [
    ['Считать ссылку непроверенной (возможно, выдуманной) и проверить по базам', 'Сілтемені тексерілмеген (мүмкін, ойдан шығарылған) деп санап, дерекқорлардан тексеру', 'Treat the reference as unverified (possibly fabricated) and check it in databases'],
    ['Доверять ссылке: ИИ знает литературу лучше', 'Сілтемеге сену: ЖИ әдебиетті жақсырақ біледі', 'Trust it: the AI knows the literature better'],
    ['Вставить ссылку в работу как есть', 'Сілтемені жұмысқа сол күйінде қою', 'Put the reference into your work as is'],
    ['Удалить из работы все ссылки', 'Жұмыстан барлық сілтемелерді жою', 'Remove all references from your work'],
  ], 0),
  q(AI, ['Можно ли загрузить в общедоступный ИИ-чат таблицу с ФИО и диагнозами пациентов для анализа?', 'Пациенттердің аты-жөні мен диагноздары бар кестені талдау үшін жалпыға қолжетімді ЖИ-чатқа жүктеуге бола ма?', 'May you upload a table with patients’ full names and diagnoses to a public AI chat for analysis?'], [
    ['Да, если чат популярный', 'Иә, егер чат танымал болса', 'Yes, if the chat is popular'],
    ['Да, если удалить только адреса', 'Иә, егер тек мекенжайларды жойса', 'Yes, if only the addresses are removed'],
    ['Да, если попросить ИИ не сохранять данные', 'Иә, егер ЖИ-ден деректерді сақтамауды сұраса', 'Yes, if you ask the AI not to store the data'],
    ['Нет: персональные медицинские данные передавать нельзя — только обезличенные', 'Жоқ: жеке медициналық деректерді беруге болмайды — тек иесіздендірілген', 'No: personal medical data must not be shared — only de-identified data'],
  ], 3),
]

export const DIAGNOSTIC_B: DiagnosticQuestion[] = [
  // ---------- работа с данными ----------
  q(DATA, ['Степень тяжести состояния (лёгкая, средняя, тяжёлая) — это какая переменная?', 'Жағдайдың ауырлық дәрежесі (жеңіл, орташа, ауыр) — бұл қандай айнымалы?', 'Severity of condition (mild, moderate, severe) is what kind of variable?'], VAR_TYPES, 1),
  q(DATA, ['Семейное положение (не женат/не замужем, в браке, в разводе, вдовец/вдова) — это какая переменная?', 'Отбасылық жағдайы (некеде емес, некеде, ажырасқан, жесір) — бұл қандай айнымалы?', 'Marital status (single, married, divorced, widowed) is what kind of variable?'], VAR_TYPES, 2),
  q(DATA, ['В таблице систолическое давление пациента — 1200 мм рт. ст. Что правильнее всего сделать?', 'Кестеде пациенттің систолалық қысымы — 1200 мм с.б. Ең дұрысы не істеу?', 'A patient’s systolic blood pressure in the table is 1200 mmHg. What is the best thing to do?'], [
    ['Оставить: это просто выброс', 'Қалдыру: бұл жай шеткі мән', 'Keep it: it is just an outlier'],
    ['Проверить по первичному документу; исправить или отметить как пропуск', 'Бастапқы құжат бойынша тексеру; түзету немесе өткізіп алу деп белгілеу', 'Check the source document; correct it or mark it as missing'],
    ['Заменить средним давлением без проверки', 'Тексерусіз орташа қысыммен ауыстыру', 'Replace it with the mean pressure without checking'],
    ['Удалить всю таблицу', 'Бүкіл кестені жою', 'Delete the whole table'],
  ], 1),
  q(DATA, ['Уровень С-реактивного белка имеет сильную правостороннюю асимметрию и выбросы. Как лучше его описать?', 'С-реактивті ақуыз деңгейі күшті оң жақты асимметрияға және шеткі мәндерге ие. Оны қалай сипаттаған дұрыс?', 'C-reactive protein levels are strongly right-skewed with outliers. How are they best described?'], DESCRIBE, 2),
  q(DATA, ['В столбце «курение» встречаются значения «да», «Да» и «yes». В чём проблема?', '«Темекі шегу» бағанында «иә», «Иә» және «yes» мәндері кездеседі. Мәселе неде?', 'The “smoking” column contains the values “yes”, “Yes” and “Y”. What is the problem?'], CODING, 0),

  // ---------- биостатистика ----------
  q(STAT, ['Нужно сравнить средний уровень гемоглобина у мужчин и женщин; распределение близко к нормальному. Какой метод подходит?', 'Ерлер мен әйелдердегі гемоглобиннің орташа деңгейін салыстыру керек; таралуы қалыптыға жақын. Қай әдіс сәйкес келеді?', 'You need to compare mean haemoglobin levels between men and women; the distribution is close to normal. Which method fits?'], TWO_GROUPS_MEANS, 1),
  q(STAT, ['Нужно сравнить долю привитых детей в четырёх регионах. Какой метод подходит?', 'Төрт өңірдегі екпе алған балалардың үлесін салыстыру керек. Қай әдіс сәйкес келеді?', 'You need to compare the proportion of vaccinated children across four regions. Which method fits?'], PROPORTIONS, 3),
  q(STAT, ['Масса тела измерена у одних и тех же 25 пациентов в начале и через 3 месяца диеты; разности распределены нормально. Какой метод подходит?', 'Дене салмағы сол бір 25 пациентте диетаның басында және 3 айдан кейін өлшенді; айырмалар қалыпты таралған. Қай әдіс сәйкес келеді?', 'Body weight was measured in the same 25 patients at the start and after 3 months of diet; the differences are normally distributed. Which method fits?'], PAIRED, 2),
  q(STAT, ['Нужно сравнить уровень боли по шкале 0–10 в двух независимых группах. Какой метод подходит?', 'Екі тәуелсіз топтағы 0–10 шкаласы бойынша ауырсыну деңгейін салыстыру керек. Қай әдіс сәйкес келеді?', 'You need to compare pain scores on a 0–10 scale between two independent groups. Which method fits?'], NONPARAM, 0),
  q(STAT, ['Нужно оценить связь между индексом массы тела и уровнем глюкозы; обе переменные количественные, связь линейная. Какой метод подходит?', 'Дене салмағының индексі мен глюкоза деңгейі арасындағы байланысты бағалау керек; екі айнымалы да сандық, байланыс сызықтық. Қай әдіс сәйкес келеді?', 'You need to assess the association between body mass index and glucose level; both variables are quantitative and the relationship is linear. Which method fits?'], CORREL, 3),

  // ---------- интерпретация ----------
  q(INTERP, ['ОР = 1,6; 95% ДИ 0,9–2,7. Какой вывод корректен?', 'СТ (RR) = 1,6; 95% СА (CI) 0,9–2,7. Қай қорытынды дұрыс?', 'RR = 1.6; 95% CI 0.9–2.7. Which conclusion is correct?'], [
    ['Связь доказана: риск выше в 1,6 раза', 'Байланыс дәлелденді: тәуекел 1,6 есе жоғары', 'The association is proven: the risk is 1.6 times higher'],
    ['Связь не доказана: ДИ включает 1', 'Байланыс дәлелденбеді: СА 1-ді қамтиды', 'The association is not shown: the CI includes 1'],
    ['Риск выше на 160%', 'Тәуекел 160%-ға жоғары', 'The risk is 160% higher'],
    ['Без p-значения ничего сказать нельзя', 'p-мәнінсіз ештеңе айту мүмкін емес', 'Nothing can be said without a p-value'],
  ], 1),
  q(INTERP, ['p = 0,01. Что это означает?', 'p = 0,01. Бұл нені білдіреді?', 'p = 0.01. What does this mean?'], [
    ['Гипотеза исследования верна с вероятностью 99%', 'Зерттеу гипотезасы 99% ықтималдықпен дұрыс', 'The study hypothesis is true with 99% probability'],
    ['Эффект лечения обязательно большой', 'Емнің әсері міндетті түрде үлкен', 'The treatment effect is necessarily large'],
    ['Если бы различий не было, такие или большие различия встречались бы примерно в 1% случаев', 'Егер айырма болмаса, мұндай немесе одан үлкен айырмалар шамамен 1% жағдайда кездесер еді', 'If there were no difference, differences this large or larger would occur in about 1% of cases'],
    ['Вероятность ошибки в исследовании — 1%', 'Зерттеудегі қателік ықтималдығы — 1%', 'The probability that the study is wrong is 1%'],
  ], 2),
  q(INTERP, ['Разность средних массы тела — 2,5 кг, 95% ДИ от −0,5 до 5,5 кг. Что верно?', 'Дене салмағының орташа мәндерінің айырмасы — 2,5 кг, 95% СА −0,5-тен 5,5 кг-ға дейін. Не дұрыс?', 'The difference in mean body weight is 2.5 kg, 95% CI −0.5 to 5.5 kg. What is true?'], [
    ['Различие не доказано: ДИ включает 0', 'Айырма дәлелденбеген: СА 0-ді қамтиды', 'The difference is not shown: the CI includes 0'],
    ['Различие статистически значимо: разность больше 0', 'Айырма статистикалық маңызды: айырма 0-ден үлкен', 'The difference is significant: the difference is above 0'],
    ['Истинная разность точно равна 2,5 кг', 'Шынайы айырма дәл 2,5 кг', 'The true difference is exactly 2.5 kg'],
    ['ДИ показывает разброс массы тела у пациентов', 'СА пациенттердегі дене салмағының шашырауын көрсетеді', 'The CI shows the spread of body weight among patients'],
  ], 0),
  q(INTERP, ['Коэффициент корреляции между возрастом и уровнем холестерина r = 0,45. Что верно?', 'Жас пен холестерин деңгейі арасындағы корреляция коэффициенті r = 0,45. Не дұрыс?', 'The correlation coefficient between age and cholesterol level is r = 0.45. What is true?'], [
    ['Связи нет', 'Байланыс жоқ', 'There is no association'],
    ['Сильная обратная связь', 'Күшті кері байланыс', 'A strong negative association'],
    ['С возрастом холестерин повышается на 45%', 'Жас ұлғайған сайын холестерин 45%-ға артады', 'Cholesterol rises by 45% with age'],
    ['Умеренная прямая связь: у старших холестерин в среднем выше', 'Орташа тура байланыс: егде адамдарда холестерин орташа есеппен жоғары', 'A moderate positive association: older people have higher cholesterol on average'],
  ], 3),
  q(INTERP, ['В наблюдательном исследовании у пьющих кофе диабет 2 типа встречается реже (p = 0,002). Какой вывод корректен?', 'Бақылаулық зерттеуде кофе ішетіндерде 2-типті қант диабеті сирек кездеседі (p = 0,002). Қай қорытынды дұрыс?', 'In an observational study, type 2 diabetes is less common among coffee drinkers (p = 0.002). Which conclusion is correct?'], [
    ['Это исследование доказывает, что кофе защищает от диабета', 'Бұл зерттеу кофе диабеттен қорғайтынын дәлелдейді', 'This study proves that coffee protects against diabetes'],
    ['Выявлена значимая связь; для вывода о причине нужны дополнительные доказательства', 'Маңызды байланыс анықталды; себеп туралы қорытындыға қосымша дәлелдер керек', 'A significant association was found; a causal conclusion needs further evidence'],
    ['Связи нет, результат случайный', 'Байланыс жоқ, нәтиже кездейсоқ', 'There is no association; the result is due to chance'],
    ['Вывод сделать нельзя, так как p слишком мало', 'p тым кіші болғандықтан, қорытынды жасауға болмайды', 'No conclusion is possible because p is too small'],
  ], 1),

  // ---------- работа с ИИ ----------
  q(AI, ['ИИ пишет: «p = 0,20, значит, различий между группами нет». Как оценить этот ответ?', 'ЖИ былай жазады: «p = 0,20, демек, топтар арасында айырма жоқ». Бұл жауапты қалай бағалайсыз?', 'An AI writes: “p = 0.20, so there is no difference between the groups.” How do you rate this answer?'], AI_VERDICT, 1),
  q(AI, ['ИИ выдал код на R, который выполнился без ошибок. Что следует сделать?', 'ЖИ R-де код берді, ол қатесіз орындалды. Не істеу керек?', 'An AI produced R code that ran without errors. What should you do?'], [
    ['Сразу использовать результат — раз ошибок нет, всё верно', 'Нәтижені бірден пайдалану — қате жоқ болса, бәрі дұрыс', 'Use the result straight away — no errors means it is correct'],
    ['Удалить код и посчитать вручную', 'Кодты жойып, қолмен есептеу', 'Delete the code and calculate by hand'],
    ['Проверить, что код анализирует нужные переменные и метод подходит к данным', 'Код қажетті айнымалыларды талдайтынын және әдіс деректерге сәйкес келетінін тексеру', 'Check that the code analyses the right variables and that the method suits the data'],
    ['Попросить ИИ переписать код на Python', 'ЖИ-ден кодты Python-да қайта жазуды сұрау', 'Ask the AI to rewrite the code in Python'],
  ], 2),
  q(AI, ['ИИ пишет: «Чтобы сравнить средние в трёх независимых группах, сделаем три t-теста без поправки». Как оценить этот ответ?', 'ЖИ былай жазады: «Үш тәуелсіз топтағы орташа мәндерді салыстыру үшін түзетусіз үш t-тест жасаймыз». Бұл жауапты қалай бағалайсыз?', 'An AI writes: “To compare means in three independent groups, we will run three t-tests without correction.” How do you rate this answer?'], AI_VERDICT, 1),
  q(AI, ['ИИ привёл «официальную» распространённость заболевания, не указав источник. Как поступить?', 'ЖИ аурудың «ресми» таралуын дереккөзін көрсетпей келтірді. Не істеу керек?', 'An AI gave an “official” prevalence of a disease without citing a source. What should you do?'], [
    ['Проверить цифру по официальному источнику и сослаться на него', 'Санды ресми дереккөз бойынша тексеріп, соған сілтеме жасау', 'Check the figure against an official source and cite it'],
    ['Использовать цифру как есть', 'Санды сол күйінде пайдалану', 'Use the figure as is'],
    ['Округлить цифру и использовать', 'Санды дөңгелектеп, пайдалану', 'Round the figure and use it'],
    ['Попросить ИИ повторить ответ — если совпадёт, значит, верно', 'ЖИ-ден жауапты қайталауды сұрау — сәйкес келсе, дұрыс', 'Ask the AI to repeat the answer — if it matches, it is correct'],
  ], 0),
  q(AI, ['Коллега предлагает отправить ИИ-ассистенту выписки пациентов с ИИН, чтобы быстрее составить отчёт. Ваши действия?', 'Әріптесіңіз есепті тез құрастыру үшін ЖИ-көмекшіге пациенттердің ЖСН көрсетілген үзінділерін жіберуді ұсынады. Не істейсіз?', 'A colleague suggests sending patient discharge summaries with national ID numbers to an AI assistant to write a report faster. What do you do?'], [
    ['Согласиться — так быстрее', 'Келісу — бұлай тезірек', 'Agree — it is faster'],
    ['Отправить, если ассистент платный', 'Көмекші ақылы болса, жіберу', 'Send them if the assistant is a paid one'],
    ['Отправить только половину выписок', 'Үзінділердің жартысын ғана жіберу', 'Send only half of the summaries'],
    ['Отказаться: сначала обезличить данные (убрать ИИН, ФИО, даты рождения)', 'Бас тарту: алдымен деректерді иесіздендіру (ЖСН, аты-жөні, туған күнін алып тастау)', 'Refuse: de-identify the data first (remove ID numbers, names, dates of birth)'],
  ], 3),
]
