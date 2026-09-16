/**
 * Ismail Yusuf College (IYC) Student Registration & ID Validation
 * Validates real student credentials against IYC courses, study years, and roll ranges.
 */

import { 
  OFFICIAL_IYC_COURSES, 
  STUDY_YEARS, 
  CourseConfig, 
  findCourseByCode, 
  getMaxRollForCourseAndYear 
} from './courseConfig';

export { OFFICIAL_IYC_COURSES as COLLEGE_COURSES, STUDY_YEARS };

export interface StudentRegistrationInput {
  name: string;
  studentId: string;
  studyYear: string; // 'F' | 'S' | 'T'
  courseCode: string; // 'CS' | 'BT' | 'BC' | 'BA' | 'SC' | 'AF' | 'MS'
  email: string; // Required (Personal email: Gmail, Yahoo, Outlook, etc.)
  password?: string;
  confirmPassword?: string;
  phone?: string; // Optional
  verificationToken?: string;
}

export interface ValidationOutput {
  isValid: boolean;
  errors: Record<string, string>;
  cleanedData?: {
    name: string;
    studentId: string;
    studyYear: string;
    courseCode: string;
    courseName: string;
    department: string;
    email: string;
    phone: string;
    rollNumber: number;
  };
}

/**
 * Validates full student name.
 * Rejects random strings (e.g. 'esrdefg'), numbers, symbols, keyboard mash,
 * while accepting legitimate Indian student names (e.g. 'Mayur Suryavanshi', 'Aarav Patil', 'Mary-Jane Dsouza').
 */
export function validateStudentName(rawName: string): { isValid: boolean; error?: string; cleanedName: string } {
  const trimmed = (rawName || '').trim();
  const normalized = trimmed.replace(/\s+/g, ' ');

  if (!normalized) {
    return { isValid: false, error: 'Please enter a valid full name.', cleanedName: '' };
  }

  // Must only contain letters, spaces, hyphens, apostrophes, and periods
  if (!/^[A-Za-z\s'\-\.]+$/.test(normalized)) {
    return { isValid: false, error: 'Please enter a valid full name.', cleanedName: normalized };
  }

  // Length limits
  if (normalized.length < 3 || normalized.length > 70) {
    return { isValid: false, error: 'Please enter a valid full name.', cleanedName: normalized };
  }

  // Reject 3 or more identical consecutive characters (e.g. 'aaaa', 'zzzz')
  if (/(.)\1\1/i.test(normalized)) {
    return { isValid: false, error: 'Please enter a valid full name.', cleanedName: normalized };
  }

  // Reject obvious keyboard mash substrings
  const lower = normalized.toLowerCase();
  const mashPatterns = [
    'esrdefg', 'asdfgh', 'qwerty', 'zxcvbn', 'abcdef',
    'sdfgh', 'dfghj', 'fghjk', 'ghjkl', 'wertyu', 'ertyui'
  ];
  if (mashPatterns.some(pattern => lower.includes(pattern))) {
    return { isValid: false, error: 'Please enter a valid full name.', cleanedName: normalized };
  }

  // Must contain at least one vowel
  if (!/[aeiouAEIOU]/.test(normalized)) {
    return { isValid: false, error: 'Please enter a valid full name.', cleanedName: normalized };
  }

  // Full name requires at least 2 distinct words (First Name + Surname)
  const parts = normalized.split(' ').filter(p => p.length > 0);
  if (parts.length < 2) {
    return { isValid: false, error: 'Please enter a valid full name.', cleanedName: normalized };
  }

  // Inspect each name segment
  for (const part of parts) {
    const lettersOnly = part.replace(/[^A-Za-z]/g, '');
    if (lettersOnly.length === 0) {
      return { isValid: false, error: 'Please enter a valid full name.', cleanedName: normalized };
    }
    // Parts longer than 2 letters should contain a vowel (unless initials like "Dr.")
    if (lettersOnly.length >= 3 && !/[aeiouAEIOU]/i.test(lettersOnly)) {
      return { isValid: false, error: 'Please enter a valid full name.', cleanedName: normalized };
    }
    // Reject long consonant runs
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(lettersOnly)) {
      return { isValid: false, error: 'Please enter a valid full name.', cleanedName: normalized };
    }
  }

  return { isValid: true, cleanedName: normalized };
}

/**
 * Validates student ID format and cross-validates against selected course & study year.
 */
export function validateStudentId(
  rawId: string, 
  selectedCourseCode: string, 
  selectedStudyYear: string
): { 
  isValid: boolean; 
  error?: string; 
  yearCode?: string; 
  courseCode?: string; 
  rollNumber?: number;
  maxRoll?: number;
} {
  const cleanId = (rawId || '').trim().toUpperCase();

  if (!cleanId) {
    return { isValid: false, error: 'Invalid Student ID format.' };
  }

  // Standard IYC Student ID format: 26 + [F/S/T] + [CourseCode] + [RollNumber]
  const idRegex = /^26([FST])([A-Z]{2,3})(\d+)$/;
  const match = cleanId.match(idRegex);

  if (!match) {
    return { 
      isValid: false, 
      error: 'Invalid Student ID format.' 
    };
  }

  const idYear = match[1];
  const idCourse = match[2];
  const rollNumberStr = match[3];
  const rollNum = parseInt(rollNumberStr, 10);

  // Validate Year code match
  const selectedYear = STUDY_YEARS.find(y => y.code === (selectedStudyYear || '').toUpperCase());
  if (selectedYear && idYear !== selectedYear.code) {
    return {
      isValid: false,
      error: 'Student ID does not match the selected study year.',
      yearCode: idYear,
      courseCode: idCourse,
      rollNumber: rollNum
    };
  }

  // Validate Course code match
  const selectedCourse = findCourseByCode(selectedCourseCode);
  if (selectedCourse) {
    const courseMatches = (idCourse === selectedCourse.code) || 
      (selectedCourse.aliases && selectedCourse.aliases.includes(idCourse));
    
    if (!courseMatches) {
      return {
        isValid: false,
        error: 'Student ID does not match the selected course.',
        yearCode: idYear,
        courseCode: idCourse,
        rollNumber: rollNum
      };
    }

    // Validate Roll Number range
    const maxRoll = getMaxRollForCourseAndYear(selectedCourse, idYear);
    if (isNaN(rollNum) || rollNum < 1 || rollNum > maxRoll) {
      return {
        isValid: false,
        error: `Invalid Student ID. Roll number ${rollNum} is outside the valid range for ${selectedCourse.name}.`,
        yearCode: idYear,
        courseCode: idCourse,
        rollNumber: rollNum,
        maxRoll
      };
    }
  }

  return {
    isValid: true,
    yearCode: idYear,
    courseCode: idCourse,
    rollNumber: rollNum
  };
}

/**
 * Validates complete student registration input
 */
export function validateStudentRegistration(data: StudentRegistrationInput): ValidationOutput {
  const errors: Record<string, string> = {};

  // 1. Full Name Validation
  const nameValidation = validateStudentName(data.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error || 'Please enter a valid full name.';
  }

  // 2. Study Year Validation
  const yearObj = STUDY_YEARS.find(y => y.code === (data.studyYear || '').toUpperCase());
  if (!yearObj) {
    errors.studyYear = 'Please select your Study Year.';
  }

  // 3. Course Validation
  const courseObj = findCourseByCode(data.courseCode);
  if (!courseObj) {
    errors.course = 'Please select a valid Course.';
  }

  // 4. Student ID Validation
  const idValidation = validateStudentId(
    data.studentId, 
    data.courseCode, 
    data.studyYear
  );

  if (!idValidation.isValid) {
    errors.studentId = idValidation.error || 'Invalid Student ID format.';
  }

  // 5. Email Address Validation (Compulsory: Gmail, Yahoo, Outlook, etc. allowed)
  const trimmedEmail = (data.email || '').trim();
  if (!trimmedEmail) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address (e.g. name@gmail.com).';
  }

  // 6. Password Validation (Required, min 6 characters)
  if (!data.password) {
    errors.password = 'Password is required.';
  } else if (data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
  }

  // 7. Confirm Password Validation
  if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // 8. Contact Phone Number (Optional; if provided, validate 10-12 digits)
  const trimmedPhone = (data.phone || '').trim();
  if (trimmedPhone) {
    const cleanPhone = trimmedPhone.replace(/[\s\-\+]/g, '');
    if (!/^\d{10,12}$/.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit phone number.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    cleanedData: isValid ? {
      name: nameValidation.cleanedName,
      studentId: (data.studentId || '').trim().toUpperCase(),
      studyYear: yearObj ? yearObj.code : data.studyYear,
      courseCode: courseObj ? courseObj.code : data.courseCode,
      courseName: courseObj ? courseObj.name : data.courseCode,
      department: courseObj ? courseObj.department : 'General',
      email: trimmedEmail,
      phone: trimmedPhone,
      rollNumber: idValidation.rollNumber || 0
    } : undefined
  };
}
