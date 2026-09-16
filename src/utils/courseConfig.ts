/**
 * Ismail Yusuf College (IYC), Jogeshwari (East), Mumbai
 * Centralized Course & Roll Number Range Configuration
 *
 * Source: Official IYC Academic & Admission Divisions (https://ismailyusufcollege.ac.in/)
 * Includes standard intake capacities per undergraduate division.
 * Roll numbers represent seat numbers within each course division.
 */

export interface CourseConfig {
  code: string; // e.g. 'CS', 'BT', 'BC', 'BA'
  name: string; // e.g. 'B.Sc. Computer Science'
  department: string;
  aliases?: string[];
  firstYearMaxRoll: number;
  secondYearMaxRoll: number;
  thirdYearMaxRoll: number;
  sourceNote: string;
}

export interface StudyYearConfig {
  code: string; // 'F' | 'S' | 'T'
  label: string;
  fullTitle: string;
}

export const STUDY_YEARS: StudyYearConfig[] = [
  { code: 'F', label: 'First Year (FY)', fullTitle: 'First Year' },
  { code: 'S', label: 'Second Year (SY)', fullTitle: 'Second Year' },
  { code: 'T', label: 'Third Year (TY)', fullTitle: 'Third Year' }
];

export const OFFICIAL_IYC_COURSES: CourseConfig[] = [
  {
    code: 'CS',
    name: 'B.Sc. Computer Science',
    department: 'Computer Science',
    firstYearMaxRoll: 60,
    secondYearMaxRoll: 60,
    thirdYearMaxRoll: 60,
    sourceNote: 'IYC Undergraduate Self-Finance Division (Intake: 60 seats per academic batch)'
  },
  {
    code: 'BT',
    name: 'B.Sc. Biotechnology',
    department: 'Biotechnology',
    firstYearMaxRoll: 99,
    secondYearMaxRoll: 99,
    thirdYearMaxRoll: 99,
    sourceNote: 'IYC Undergraduate Biotechnology Division (Intake & merit list capacity up to 99 seats)'
  },
  {
    code: 'BC',
    name: 'B.Com.',
    department: 'Commerce',
    firstYearMaxRoll: 120,
    secondYearMaxRoll: 120,
    thirdYearMaxRoll: 120,
    sourceNote: 'IYC Bachelor of Commerce division (Standard Mumbai University intake: 120 seats per division)'
  },
  {
    code: 'BA',
    name: 'B.A.',
    department: 'Arts',
    firstYearMaxRoll: 120,
    secondYearMaxRoll: 120,
    thirdYearMaxRoll: 120,
    sourceNote: 'IYC Bachelor of Arts division (Standard Mumbai University intake: 120 seats per division)'
  },
  {
    code: 'SC',
    name: 'B.Sc.',
    aliases: ['GS'],
    department: 'Science',
    firstYearMaxRoll: 120,
    secondYearMaxRoll: 120,
    thirdYearMaxRoll: 120,
    sourceNote: 'IYC Bachelor of Science General (Standard Mumbai University intake: 120 seats per division)'
  },
  {
    code: 'AF',
    name: 'B.Com. Accounting & Finance',
    aliases: ['BAF'],
    department: 'Commerce',
    firstYearMaxRoll: 60,
    secondYearMaxRoll: 60,
    thirdYearMaxRoll: 60,
    sourceNote: 'IYC B.Com. Accounting & Finance (Self-Finance intake: 60 seats)'
  },
  {
    code: 'MS',
    name: 'B.Com. Management Studies',
    aliases: ['BMS'],
    department: 'Commerce & Management',
    firstYearMaxRoll: 60,
    secondYearMaxRoll: 60,
    thirdYearMaxRoll: 60,
    sourceNote: 'IYC Management Studies / BMS (Self-Finance intake: 60 seats)'
  }
];

/**
 * Helper to find course by code or alias
 */
export function findCourseByCode(code: string): CourseConfig | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return OFFICIAL_IYC_COURSES.find(
    c => c.code === upper || (c.aliases && c.aliases.includes(upper))
  );
}

/**
 * Get maximum roll number for a given course and study year
 */
export function getMaxRollForCourseAndYear(course: CourseConfig, yearCode: string): number {
  const upperYear = yearCode.trim().toUpperCase();
  if (upperYear === 'F') return course.firstYearMaxRoll;
  if (upperYear === 'S') return course.secondYearMaxRoll;
  if (upperYear === 'T') return course.thirdYearMaxRoll;
  return course.thirdYearMaxRoll;
}
