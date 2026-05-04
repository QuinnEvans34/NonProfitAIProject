// Screening questionnaire — server copy.
// IMPORTANT: This file MUST stay in sync with `client/src/lib/screening-questions.js`.
// See `docs/11-screening.md` for the polarity caveat and the dual-copy rule.

export const SCREENING_SECTIONS = [
  {
    id: 'mental_health',
    label: 'Mental health',
    questions: [
      {
        id: 'mh_1',
        text: 'Over the past two weeks, how often have you felt little interest or pleasure in doing things?',
        lowLabel: 'Not at all',
        highLabel: 'Nearly every day',
      },
      {
        id: 'mh_2',
        text: 'Over the past two weeks, how often did you find it hard to stop or control worrying?',
        lowLabel: 'Not at all',
        highLabel: 'Nearly every day',
      },
      {
        id: 'mh_3',
        text: 'How often have you had trouble concentrating or making decisions in the last two weeks?',
        lowLabel: 'Never',
        highLabel: 'Always',
      },
      {
        id: 'mh_4',
        text: 'How often do you feel lonely or isolated?',
        lowLabel: 'Never',
        highLabel: 'Always',
      },
      {
        id: 'mh_5',
        text: 'How satisfied are you with yourself (your self-esteem) recently?',
        lowLabel: 'Not at all satisfied',
        highLabel: 'Extremely satisfied',
      },
    ],
  },
  {
    id: 'physical_health',
    label: 'Physical health',
    questions: [
      {
        id: 'ph_1',
        text: 'How much do physical pains or discomfort prevent you from doing what you need to do?',
        lowLabel: 'Not at all',
        highLabel: 'A lot',
      },
      {
        id: 'ph_2',
        text: 'How well are you able to get around (e.g. walk, climb stairs)?',
        lowLabel: 'Very poorly',
        highLabel: 'Very well',
      },
      {
        id: 'ph_3',
        text: 'How satisfied are you with your capacity for work or main responsibilities?',
        lowLabel: 'Very dissatisfied',
        highLabel: 'Very satisfied',
      },
      {
        id: 'ph_4',
        text: 'I engage in regular physical activity (e.g. walking, exercise) on most days.',
        lowLabel: 'Strongly disagree',
        highLabel: 'Strongly agree',
      },
      {
        id: 'ph_5',
        text: 'I maintain a healthy diet or nutrition most of the time.',
        lowLabel: 'Strongly disagree',
        highLabel: 'Strongly agree',
      },
    ],
  },
  {
    id: 'quality_of_life',
    label: 'Quality of life',
    questions: [
      {
        id: 'qol_1',
        text: 'How satisfied are you with your overall quality of life?',
        lowLabel: 'Very dissatisfied',
        highLabel: 'Very satisfied',
      },
      {
        id: 'qol_2',
        text: 'How satisfied are you with your personal relationships (family, friends)?',
        lowLabel: 'Very dissatisfied',
        highLabel: 'Very satisfied',
      },
      {
        id: 'qol_3',
        text: 'How satisfied are you with the support you get from friends or family?',
        lowLabel: 'Very dissatisfied',
        highLabel: 'Very satisfied',
      },
      {
        id: 'qol_4',
        text: 'How safe and secure do you feel in your daily life/environment?',
        lowLabel: 'Not at all safe',
        highLabel: 'Completely safe',
      },
      {
        id: 'qol_5',
        text: 'Do you have enough money to meet your needs (food, bills, etc.)?',
        lowLabel: 'Not at all',
        highLabel: 'Completely',
      },
      {
        id: 'qol_6',
        text: 'How easy is it for you to get healthcare, information or other services when you need them?',
        lowLabel: 'Very difficult',
        highLabel: 'Very easy',
      },
      {
        id: 'qol_7',
        text: 'How satisfied are you with your current living conditions (housing situation)?',
        lowLabel: 'Very dissatisfied',
        highLabel: 'Very satisfied',
      },
    ],
  },
];

export const SCREENING_QUESTION_INDEX = (() => {
  const idx = {};
  for (const section of SCREENING_SECTIONS) {
    for (const q of section.questions) {
      idx[q.id] = {
        sectionId: section.id,
        sectionLabel: section.label,
        text: q.text,
        lowLabel: q.lowLabel,
        highLabel: q.highLabel,
      };
    }
  }
  return idx;
})();

export const ALL_QUESTION_IDS = SCREENING_SECTIONS.flatMap((s) =>
  s.questions.map((q) => q.id)
);

export const TOTAL_QUESTION_COUNT = ALL_QUESTION_IDS.length;

/**
 * Format a numeric scale answer for analyzer/report consumption.
 * @param {number} value - 1..5
 * @param {string} lowLabel - text for value 1
 * @param {string} highLabel - text for value 5
 * @returns {string} e.g. '4 of 5 (closer to "Nearly every day")'
 */
export function formatScaleAnswer(value, lowLabel, highLabel) {
  if (value === 1) return `1 of 5 ("${lowLabel}")`;
  if (value === 5) return `5 of 5 ("${highLabel}")`;
  if (value === 3) return '3 of 5 (midpoint)';
  if (value === 2) return `2 of 5 (closer to "${lowLabel}")`;
  if (value === 4) return `4 of 5 (closer to "${highLabel}")`;
  return `${value} of 5`;
}
