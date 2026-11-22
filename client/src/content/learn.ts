export interface Article {
  id: string;
  title: string;
  category: 'Basics' | 'Phases' | 'Symptoms' | 'Care' | 'Health';
  readTime: string;
  intro: string;
  sections: { heading: string; body: string }[];
  keyPoints: string[];
}

export const ARTICLES: Article[] = [
  {
    id: 'understanding-cycle',
    title: 'Understanding the menstrual cycle',
    category: 'Basics',
    readTime: '5 min read',
    intro: 'Your menstrual cycle is a monthly series of hormonal changes that prepare your body for a possible pregnancy. It is controlled by hormones from the brain and the ovaries, and it affects more than just your period.',
    sections: [
      { heading: 'What counts as a cycle?', body: 'Cycle day 1 is the first day of menstrual bleeding. A full cycle runs from that day to the day before your next period begins. Cycles commonly last between 21 and 35 days in adults, and 21 to 45 days in teenagers. A "regular" cycle simply means your own length is fairly consistent — it does not have to be exactly 28 days.' },
      { heading: 'Which hormones are involved?', body: 'Follicle stimulating hormone (FSH) and luteinising hormone (LH) from the brain signal the ovaries. Oestrogen and progesterone from the ovaries then prepare the uterine lining and regulate the cycle. Prostaglandins are released around menstruation and help the uterus contract to shed its lining — they are also involved in period pain.' },
      { heading: 'Why tracking helps', body: 'Recording your period dates, symptoms and moods over several cycles reveals your personal pattern. This can help you plan ahead, understand changes in energy or appetite, and give clearer information to a healthcare professional if something concerns you.' },
    ],
    keyPoints: ['Day 1 is the first day of bleeding.', 'Anywhere from 21–35 days is common for adults.', 'Your cycle affects energy, mood, appetite and more.'],
  },
  {
    id: 'four-phases',
    title: 'The four cycle phases',
    category: 'Phases',
    readTime: '6 min read',
    intro: 'Each phase brings different hormonal shifts and often different physical and emotional feelings. None of them are "bad" — they are simply part of a working system.',
    sections: [
      { heading: 'Menstrual phase', body: 'The uterine lining is shed through the vagina. Bleeding usually lasts 2–7 days. Cramps, fatigue and lower energy are common as prostaglandins cause the uterus to contract. Rest, warmth, fluids and gentle movement can help.' },
      { heading: 'Follicular phase', body: 'This phase begins on day 1 and overlaps with your period. FSH stimulates ovarian follicles, and oestrogen rises. The uterine lining rebuilds. Many people notice improving energy, focus and mood as oestrogen climbs.' },
      { heading: 'Ovulation', body: 'A surge of LH triggers the release of a mature egg, usually about 14 days before the next period. Some people feel a brief twinge of pain, notice increased cervical mucus, or feel more energetic. An egg can be fertilised for around 12–24 hours after release.' },
      { heading: 'Luteal phase', body: 'After ovulation, the follicle becomes the corpus luteum and produces progesterone, which thickens the uterine lining further. If pregnancy does not occur, hormone levels fall, triggering another period. PMS symptoms such as bloating, mood changes and cravings often appear in this phase.' },
    ],
    keyPoints: ['Follicular and menstrual phases overlap.', 'Ovulation happens roughly 14 days before the next period.', 'The luteal phase is when PMS symptoms often appear.'],
  },
  {
    id: 'period-health',
    title: 'Period health basics',
    category: 'Care',
    readTime: '4 min read',
    intro: 'Looking after yourself during your period does not need to be complicated. A few simple habits can make bleeding days more comfortable.',
    sections: [
      { heading: 'Managing pain', body: 'A heating pad on the lower abdomen can relax the uterine muscle. Regular gentle movement such as walking or yoga may ease cramping. Over-the-counter pain relief can be effective for many people — ask a pharmacist or clinician which option suits you.' },
      { heading: 'Hygiene', body: 'Change pads, tampons or menstrual cups as directed on the product label. Tampons and cups should not be left in longer than the recommended time. wash your hands before and after changing products. Mild unscented soap and water are enough for external cleaning; the vagina cleans itself.' },
      { heading: 'Rest and nourishment', body: 'Iron loss can leave some people tired. Iron-rich foods include leafy greens, beans, lentils, red meat and fortified cereals. Pairing them with vitamin C supports absorption. Sleep and hydration matter too.' },
    ],
    keyPoints: ['Heat and gentle movement can ease cramps.', 'Change period products as recommended.', 'Iron-rich foods help replace what is lost.'],
  },
  {
    id: 'pms',
    title: 'PMS and PMDD',
    category: 'Symptoms',
    readTime: '5 min read',
    intro: 'Premenstrual symptoms are physical and emotional changes that appear in the days before a period. They are very common and can range from mild to disruptive.',
    sections: [
      { heading: 'Common symptoms', body: 'Bloating, breast tenderness, headaches, cramps, fatigue, sleep changes, food cravings, irritability, anxiety, tearfulness and difficulty concentrating are all commonly reported. Symptoms typically ease once bleeding begins.' },
      { heading: 'When it is more than PMS', body: 'Premenstrual dysphoric disorder (PMDD) is a severe form where mood symptoms such as depression, marked irritability or anxiety significantly disrupt daily life in the week before a period. If this sounds familiar, speak to a healthcare professional — effective treatments exist.' },
      { heading: 'What can help', body: 'Regular sleep, consistent meals, movement and stress management can reduce symptoms for many people. Tracking symptoms across cycles helps confirm the pattern and is useful information to bring to an appointment.' },
    ],
    keyPoints: ['PMS symptoms repeat in the days before your period.', 'PMDD is severe and disrupts daily life.', 'Tracking helps you and your clinician see patterns.'],
  },
  {
    id: 'ovulation',
    title: 'Ovulation and fertility',
    category: 'Basics',
    readTime: '5 min read',
    intro: 'Ovulation is the release of an egg from an ovary. Understanding it can help you recognise your fertile window — whether you are trying to conceive or trying to avoid pregnancy.',
    sections: [
      { heading: 'When does it happen?', body: 'Ovulation usually occurs about 14 days before the next period starts, not necessarily on day 14 of the cycle. The fertile window includes the five days before ovulation and the day after, because sperm can survive in the reproductive tract for several days.' },
      { heading: 'Signs of ovulation', body: 'Some people notice clear, stretchy cervical mucus, a slight rise in basal body temperature, mild pelvic pain, increased libido or a sense of heightened energy. No single sign is definitive for everyone.' },
      { heading: 'Important limitation', body: 'Cycle tracking is not a reliable form of contraception on its own. Cycles vary, and predictions from an app are estimates. If you need contraception, use a method recommended by a healthcare professional.' },
    ],
    keyPoints: ['Ovulation is roughly 14 days before the next period.', 'The fertile window spans about six days.', 'App predictions are not contraception.'],
  },
  {
    id: 'hygiene',
    title: 'Menstrual hygiene',
    category: 'Care',
    readTime: '4 min read',
    intro: 'Good menstrual hygiene is about comfort, safety and preventing infection — not about being "clean" in a moral sense. Period blood is normal bodily fluid.',
    sections: [
      { heading: 'Choosing products', body: 'Pads, tampons, cups, period underwear and reusable pads all work well. Choose based on comfort, flow, lifestyle and access to washing facilities. Many people use different products on different days.' },
      { heading: 'Changing and cleaning', body: 'Change pads or tampons every 4–8 hours depending on flow and product instructions. Empty and rinse a cup at least every 12 hours. Wash reusable products thoroughly and dry them fully. Wash your hands before and after handling period products.' },
      { heading: 'When to get help', body: 'A strong fishy odour, unusual discharge, persistent itching, or fever may indicate infection and deserves medical advice. Toxic shock syndrome is rare but serious; seek urgent care for sudden fever, rash, vomiting or dizziness while using tampons or a cup.' },
    ],
    keyPoints: ['All period products are valid choices.', 'Follow product guidance for changing and cleaning.', 'Unusual odour, itching or fever needs medical advice.'],
  },
  {
    id: 'common-symptoms',
    title: 'Common period symptoms',
    category: 'Symptoms',
    readTime: '5 min read',
    intro: 'Periods affect the whole body. These symptoms are common, but how intense they are varies widely from person to person and cycle to cycle.',
    sections: [
      { heading: 'Physical symptoms', body: 'Cramps, backache, headaches, bloating, breast tenderness, nausea, changes in bowel habits, acne, fatigue and changes in discharge are all frequently reported. Notice which ones show up regularly for you.' },
      { heading: 'Emotional symptoms', body: 'Irritability, tearfulness, anxiety, low mood, difficulty focusing and feeling overwhelmed can occur in the days before or during a period. Hormonal shifts can influence mood, but your feelings are always real.' },
      { heading: 'Tracking severity', body: 'Recording whether symptoms are mild, moderate or severe helps you spot changes over time. A symptom that suddenly becomes severe or follows a new pattern is worth discussing with a clinician.' },
    ],
    keyPoints: ['Symptoms vary a lot between individuals.', 'Both body and mood changes are common.', 'New or worsening symptoms deserve attention.'],
  },
  {
    id: 'when-to-seek-help',
    title: 'When to seek medical attention',
    category: 'Health',
    readTime: '4 min read',
    intro: 'You know your body best. These signs are general guidance for when it is worth contacting a healthcare professional.',
    sections: [
      { heading: 'Period changes', body: 'No period by age 15, a sudden stop in periods, cycles consistently shorter than 21 or longer than 45 days, bleeding that lasts more than 7 days, very heavy bleeding (soaking a pad or tampon in an hour or two), bleeding between periods or after sex, or new severe pain.' },
      { heading: 'Other signs', body: 'Dizziness or fainting, fever with period product use, unusually foul-smelling discharge, persistent pelvic pain, or symptoms that significantly disrupt school, work or relationships.' },
      { heading: 'How to prepare', body: 'Bring a record of your last several cycles, symptom severity, any medications and the changes you have noticed. A symptom diary makes appointments more productive.' },
    ],
    keyPoints: ['Very heavy, prolonged or new bleeding needs review.', 'Severe pain is not something you must simply endure.', 'Bring your tracking history to the appointment.'],
  },
  {
    id: 'faq',
    title: 'Frequently asked questions',
    category: 'Health',
    readTime: '6 min read',
    intro: 'Short answers to the questions people ask most often about cycles and period tracking.',
    sections: [
      { heading: 'Is a 28-day cycle "normal"?', body: '28 days is an average, not a rule. Cycles between 21 and 35 days are common in adults. What matters more is whether your own cycles are reasonably consistent.' },
      { heading: 'Can my cycle change?', body: 'Yes. Stress, illness, travel, sleep changes, weight changes, exercise, medication and hormonal contraception can all shift timing. Occasional variation is usually nothing to worry about.' },
      { heading: 'Why are my predictions different every month?', body: 'Predictions use your recorded cycle lengths. When cycles vary, the estimate has a wider range. The more cycles you log, the more personalised it becomes — but it will never be exact.' },
      { heading: 'Can I use FLOURA to avoid pregnancy?', body: 'No. Cycle tracking and fertile-window estimates are not reliable contraception. Use a clinically recommended method if you need to prevent pregnancy.' },
      { heading: 'Is my data safe?', body: 'FLOURA stores your records in a private account accessible only with your login. You can export or permanently delete your data at any time in Settings.' },
    ],
    keyPoints: ['28 days is an average, not a rule.', 'Cycles naturally shift with life circumstances.', 'This app is not a contraception method.'],
  },
];

export const CATEGORIES = ['All', 'Basics', 'Phases', 'Symptoms', 'Care', 'Health'] as const;
