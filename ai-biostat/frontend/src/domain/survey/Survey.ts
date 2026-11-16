import type { Localized } from '@/core/localized'

/**
 * Опросник обратной связи в конце пилота.
 * Студенты/специалисты (решение автора 17.11.2026): две анкеты обратной связи университета (Google-формы автора)
 *   — «Анкета обратной связи для обучающихся»: 12 утверждений, Да/Нет (1 — да, 0 — нет); RU автора, KZ/EN — перевод Claude;
 *   — «Анкета обратной связи 2025» (CBL): 12 вопросов, 1–5 баллов; тексты автора на трёх языках (опечатки поправлены);
 *   + SUS (System Usability Scale, Brooke 1996: 10 утверждений 1–5, балл 0–100 считает сервер — app/main.py sus_score)
 *   + ретроспективная самооценка «до/сейчас» + 5 открытых вопросов (объединены из обеих анкет). ФИО не спрашиваем — код.
 * Преподаватели: SUS (о панели) + оценка разделов панели + 3 открытых вопроса.
 * Ключи ответов — столбцы выгрузки survey.csv. KZ-переводы Claude — нужна вычитка.
 */
type Tri = [ru: string, kk: string, en: string]
const L = ([ru, kk, en]: Tri): Localized => ({ ru, kk, en })

export type ItemKind = 'scale' | 'part' | 'prepost' | 'open' | 'yesno' | 'points'
export interface SurveyItem { id: string; kind: ItemKind; text: Localized }
export interface SurveySection { id: 'formA' | 'formB' | 'sus' | 'parts' | 'self' | 'open'; items: SurveyItem[] }

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

/** Анкета 1 — «Анкета обратной связи для обучающихся» (Да/Нет). */
const FORM_A: Tri[] = [
  ['Практическая значимость материала', 'Материалдың практикалық маңыздылығы', 'Practical relevance of the material'],
  ['Доступность восприятия учебного материала', 'Оқу материалын қабылдаудың қолжетімділігі', 'Accessibility of the learning material'],
  ['Развитие творческого мышления студентов', 'Студенттердің шығармашылық ойлауын дамыту', 'Development of students’ creative thinking'],
  ['Способствует саморазвитию и самообразованию', 'Өзін-өзі дамытуға және өздігінен білім алуға ықпал етеді', 'Promotes self-development and self-education'],
  ['Снятие психологической инерции у студента', 'Студенттің психологиялық инерциясын жою', 'Overcoming the student’s psychological inertia'],
  ['Критическое осмысление учебного материала', 'Оқу материалын сыни тұрғыдан түсіну', 'Critical understanding of the learning material'],
  ['Соответствие содержания занятия/лекции современным данным по специальности', 'Сабақ/дәріс мазмұнының мамандық бойынша заманауи деректерге сәйкестігі', 'The content of the class/lecture matches current data in the specialty'],
  ['Качество преподавания материала', 'Материалды оқыту сапасы', 'Quality of teaching the material'],
  ['Доступность изложения материала', 'Материалды баяндаудың түсініктілігі', 'Clarity of the presentation of the material'],
  ['Возможность проконсультироваться с преподавателем', 'Оқытушыдан кеңес алу мүмкіндігі', 'Opportunity to consult the teacher'],
  ['Достаточность и соответствие объёма содержания обучения Вашим ожиданиям', 'Оқыту мазмұны көлемінің жеткіліктілігі және Сіздің күтулеріңізге сәйкестігі', 'Sufficiency of the content and how well it meets your expectations'],
  ['Трудности в освоении материала', 'Материалды меңгерудегі қиындықтар', 'Difficulties in mastering the material'],
]

/** Анкета 2 — «Анкета обратной связи 2025» (CBL), 1–5 баллов. Вопрос 12: 1 — очень легко, 5 — очень сложно. */
const FORM_B: Tri[] = [
  ['Технология и материал пригодятся Вам в профессии?', 'Сіздің мамандығыңызға технология мен материал көмектесті ме?', 'Will the technology and material be useful to you in your profession?'],
  ['Доступен ли формат тематического занятия?', 'Тақырыптық сабақ форматы қолжетімді ме?', 'Is the format of the thematic lesson accessible?'],
  ['Систематизировались ли Ваши знания по данной тематике?', 'Берілген тақырып бойынша біліміңіз жүйеленді ме?', 'Has your knowledge on this topic been systematized?'],
  ['Даёт ли такой метод проведения занятия повод к Вашему саморазвитию и самообразованию?', 'Бұндай сабақ беру әдісі Сіздің өзіндік дамуыңызға және өзіндік білім алуыңызға көмектесті ме?', 'Does this method of conducting a lesson give a reason for your self-development and self-education?'],
  ['Стимулирует ли эта методика Вас к работе в группе (в команде)?', 'Бұндай әдіс Сізді топта жұмыс істеуге ынталандыра ма?', 'Does this technique encourage you to work in a group (in a team)?'],
  ['Критично ли Вы осмысливаете материал, который даёт одногруппник?', 'Топ студенттерінің берген материалын Сіз толық қабылдай аласыз ба?', 'Do you critically comprehend the material that a groupmate gives?'],
  ['Соответствует ли содержание методики требованиям Вашей будущей специальности?', 'Әдістеме мазмұны Сіздің болашақ мамандығыңызға сәйкес келе ме?', 'Does the content of the methodology meet the requirements of your future specialty?'],
  ['Оцените качество материала, предоставленного одногруппниками', 'Топтың студенттерінің берген материалдарының сапасын бағалаңыз', 'Evaluate the quality of the material provided by classmates'],
  ['Доступно ли даны тематические рубрики?', 'Тақырып бөлімдері жеткілікті ме?', 'Are the thematic headings clearly presented?'],
  ['Была ли у Вас возможность при выполнении заданий проконсультироваться с преподавателем?', 'Сабақ тапсырмаларын орындау барысында оқытушыдан кеңес алу мүмкіндігі болды ма?', 'Have you had the opportunity to consult a teacher when completing assignments?'],
  ['Соответствуют ли объём материала и данная методика обучения Вашим ожиданиям?', 'Бұл оқыту әдістемесінің материал көлемі Сіздің күткеніңізге сәйкес келе ме?', 'Do the volume of the material and this teaching method meet your expectations?'],
  ['Были ли трудности в освоении материала? (1 балл — было очень легко, 5 баллов — было очень сложно)', 'Материалды меңгеру кезінде қиындықтар болды ма? (1 ұпай — өте оңай болды, 5 ұпай — өте қиын болды)', 'Were there any difficulties in mastering the material? (1 point — very easy, 5 points — very difficult)'],
]

const SELF: SurveySection = {
  id: 'self',
  items: [
    item('self_method', 'prepost', ['Я умею выбрать статистический метод под тип данных и вопрос', 'Деректер түрі мен сұраққа сай статистикалық әдісті таңдай аламын', 'I can choose a statistical method that fits the data type and the question']),
    item('self_interp', 'prepost', ['Я умею правильно интерпретировать p-значение, ДИ и размер эффекта', 'p-мәнін, СА мен әсер мөлшерін дұрыс түсіндіре аламын', 'I can correctly interpret a p-value, a CI and an effect size']),
    item('self_ai', 'prepost', ['Я умею находить ошибки в ответах ИИ по статистике', 'Статистика бойынша ЖИ жауаптарындағы қателерді таба аламын', 'I can find errors in AI answers about statistics']),
    item('self_code', 'prepost', ['Я умею выполнить анализ в R или Python', 'R немесе Python-да талдау жасай аламын', 'I can run an analysis in R or Python']),
  ],
}

/** Открытые вопросы обеих анкет автора (повторы объединены). */
const LEARNER_OPEN: SurveySection = {
  id: 'open',
  items: [
    item('open_unclear', 'open', ['Укажите вопросы, которые остались неясными', 'Түсініксіз болған сұрақтарды көрсетіңіз', 'Specify the questions that remained unclear']),
    item('open_facts', 'open', ['Отметьте, пожалуйста, 3 ценных факта, которые Вы узнали', 'Сіз білген 3 құнды фактіні белгілеңіз', 'Please note 3 valuable facts that you learned']),
    item('open_advantages', 'open', ['Перечислите главные достоинства данного метода обучения (что помогает Вам учиться?)', 'Берілген оқу әдістемесінің негізгі жетістіктерін көрсетіңіз (оқуға не көмектеседі?)', 'List the main advantages of this teaching method (what helps you learn?)']),
    item('open_improve', 'open', ['Ваши предложения: какие изменения улучшат методику обучения?', 'Ұсыныстарыңыз: оқыту әдістемесін жақсарту үшін қандай өзгерістер жасауға болады?', 'Your suggestions: what changes would improve the teaching method?']),
    item('open_opinion', 'open', ['Ваше мнение о данной методике', 'Бұл әдіс туралы Сіздің пікіріңіз', 'Your opinion about this technique']),
  ],
}

export const LEARNER_SURVEY: SurveySection[] = [
  { id: 'formA', items: FORM_A.map((t, i) => item(`fa${i + 1}`, 'yesno', t)) },
  { id: 'formB', items: FORM_B.map((t, i) => item(`fb${i + 1}`, 'points', t)) },
  susSection,
  SELF,
  LEARNER_OPEN,
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
  {
    id: 'open',
    items: [
      item('open_liked', 'open', ['Что понравилось больше всего?', 'Сізге не бәрінен көп ұнады?', 'What did you like most?']),
      item('open_hindered', 'open', ['Что мешало или было трудным?', 'Не кедергі болды немесе қиын болды?', 'What got in the way or was difficult?']),
      item('open_improve', 'open', ['Что улучшить в первую очередь?', 'Ең алдымен нені жақсарту керек?', 'What should be improved first?']),
    ],
  },
]

export type SurveyAnswers = Record<string, number | string>

/** Ключи, которые надо заполнить: всё, кроме открытых; «до/сейчас» — по два; «Нет» (0) и «не пользовался» (0) — тоже ответ. */
export function requiredKeys(sections: SurveySection[]): string[] {
  return sections.flatMap(s => s.items.flatMap(i =>
    i.kind === 'prepost' ? [`${i.id}_before`, `${i.id}_now`] : i.kind === 'open' ? [] : [i.id]))
}

export function missingKeys(sections: SurveySection[], a: SurveyAnswers): string[] {
  return requiredKeys(sections).filter(k => typeof a[k] !== 'number')
}
