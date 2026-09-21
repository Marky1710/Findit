import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';

const getModuleDirname = (): string => {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Fallback if import.meta.url is undefined
  }
  return process.cwd();
};
const currentDirname = getModuleDirname();
import { 
  OFFICIAL_IYC_COURSES, 
  STUDY_YEARS, 
  findCourseByCode, 
  getMaxRollForCourseAndYear 
} from './src/utils/courseConfig';
import { 
  validateStudentName, 
  validateStudentId 
} from './src/utils/studentValidation';
import { INITIAL_USERS, INITIAL_LOCATIONS } from './src/data/initialData';
import { User, Item, Claim, Message, ActivityLog, ModerationReport, CampusLocation, StoredMatch } from './src/types';
import { calculateMatchScore, isReportEligibleForMatching } from './src/utils/matchingAlgorithm';
import { calculateTextSemanticSimilarity } from './src/utils/nlpSemanticEngine';
import { 
  requestEmailOtp, 
  verifyEmailOtp, 
  consumeVerificationToken,
  testSmtpConnection
} from './src/server/emailService';

const PORT = Number(process.env.PORT) || 3000;

// Resolve persistent database file path with robust fallback checks
function getDatabaseFilePath(): string {
  if (process.env.DB_FILE_PATH) return process.env.DB_FILE_PATH;
  
  const candidates = [
    path.join(process.cwd(), 'server-db.json'),
    path.join(process.cwd(), 'dist', 'server-db.json'),
    path.join(currentDirname, 'server-db.json'),
    path.join(currentDirname, '..', 'server-db.json')
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const stats = fs.statSync(p);
        if (stats.size > 10) return p;
      }
    } catch {
      // Ignore
    }
  }

  return path.join(process.cwd(), 'server-db.json');
}

const DB_FILE = getDatabaseFilePath();

// Database schema interface
export interface SessionData {
  token: string;
  userId: string;
  role: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

interface DatabaseSchema {
  users: User[];
  items: Item[];
  claims: Claim[];
  messages: Message[];
  activities: ActivityLog[];
  moderation: ModerationReport[];
  locations: CampusLocation[];
  matches?: StoredMatch[];
  sessions?: Record<string, SessionData>;
}

/**
 * Recalculates candidate match pairings in the persistent database.
 * Requirements:
 * - Deterministic, immutable report pair IDs: `${lost.id}_${found.id}`
 * - Excludes DELETED, REJECTED, RECOVERED, and CLOSED reports
 * - Prevents duplicate matches on page refresh
 */
function recalculateMatchesInDb(database: DatabaseSchema): StoredMatch[] {
  const activeItems = (database.items || []).filter(i => isReportEligibleForMatching(i));
  const lostItems = activeItems.filter(i => i.type === 'LOST');
  const foundItems = activeItems.filter(i => i.type === 'FOUND');

  const matchesMap = new Map<string, StoredMatch>();

  for (const lost of lostItems) {
    for (const found of foundItems) {
      // Immutable report ID pair identifier
      const matchId = `${lost.id}_${found.id}`;
      const scoreDetails = calculateMatchScore(lost, found);

      if (scoreDetails.isPossibleMatch) {
        matchesMap.set(matchId, {
          id: matchId,
          lostItemId: lost.id,
          foundItemId: found.id,
          lostItem: lost,
          foundItem: found,
          categoryScore: scoreDetails.categoryScore,
          locationScore: scoreDetails.locationScore,
          dateScore: scoreDetails.dateScore,
          colorScore: scoreDetails.colorScore,
          keywordsScore: scoreDetails.keywordsScore,
          nlpScore: scoreDetails.nlpScore || 0,
          totalScore: scoreDetails.totalScore,
          matchStrength: scoreDetails.matchStrength,
          confidenceLevel: scoreDetails.confidenceLevel,
          isPossibleMatch: scoreDetails.isPossibleMatch,
          matchFactors: scoreDetails.matchFactors,
          explanation: scoreDetails.explanation || '',
          calculatedAt: new Date().toISOString()
        });
      }
    }
  }

  const matchesList = Array.from(matchesMap.values()).sort((a, b) => b.totalScore - a.totalScore);
  database.matches = matchesList;
  return matchesList;
}

// Load database from file with robust defaults and purge fake/Kulkarni/seed accounts
function loadDatabase(): DatabaseSchema {
  const dbPath = getDatabaseFilePath();
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const data = JSON.parse(raw);
      // Clean any legacy fake users, seed staff, old test students, or Kulkarni accounts
      const cleanedUsers: User[] = (data.users || []).filter((u: User) => {
        const nameLower = (u.name || '').toLowerCase();
        const emailLower = (u.email || '').toLowerCase();
        // Disallow Kulkarni or old demo personas
        if (nameLower.includes('kulkarni') || emailLower.includes('kulkarni')) return false;
        if (['user-rohan', 'user-priya', 'user-mayur-demo', 'user-mayur', 'user-bhusan', 'user-mugdha', 'user-prachita', 'user-tamana', 'user-satyam', 'user-priyal'].includes(u.id)) return false;
        // Disallow any admin other than Mayur Suryavanshi
        if (u.role === 'admin' && (u.email !== 'suryavanshimayur187@gmail.com' && u.id !== 'user-admin-mayur')) return false;
        return true;
      });

      // Ensure Mayur Suryavanshi authorized admin exists as sole admin
      const hasMayur = cleanedUsers.some(u => u.role === 'admin' && (u.email === 'suryavanshimayur187@gmail.com' || u.id === 'user-admin-mayur'));
      if (!hasMayur) {
        const mayurAdmin = INITIAL_USERS.find(u => u.id === 'user-admin-mayur');
        if (mayurAdmin) cleanedUsers.unshift(mayurAdmin);
      }

      // Strip any AI avatar URLs from all users
      cleanedUsers.forEach(u => {
        if (u.avatar && u.avatar.includes('unsplash.com')) {
          delete u.avatar;
        }
      });

      const cleanedDb: DatabaseSchema = {
        users: cleanedUsers,
        items: data.items || [],
        claims: data.claims || [],
        messages: data.messages || [],
        activities: data.activities || [],
        moderation: data.moderation || [],
        locations: (Array.isArray(data.locations) && data.locations.length > 0) ? data.locations : INITIAL_LOCATIONS,
        matches: Array.isArray(data.matches) ? data.matches : [],
        sessions: (typeof data.sessions === 'object' && data.sessions) ? data.sessions : {}
      };
      recalculateMatchesInDb(cleanedDb);
      saveDatabase(cleanedDb);
      return cleanedDb;
    }
  } catch (err) {
    console.error('Error loading database, initializing fresh state:', err);
  }

  // Initialize fresh clean database with sole admin Mayur Suryavanshi
  const freshDb: DatabaseSchema = {
    users: INITIAL_USERS.map(u => {
      const copy = { ...u };
      delete copy.avatar; // strictly no AI avatars
      return copy;
    }),
    items: [],
    claims: [],
    messages: [],
    activities: [],
    moderation: [],
    locations: INITIAL_LOCATIONS,
    matches: [],
    sessions: {}
  };
  saveDatabase(freshDb);
  return freshDb;
}

// Atomic and synced database writer
function saveDatabase(dbData: DatabaseSchema) {
  try {
    const targetFile = getDatabaseFilePath();
    const dataStr = JSON.stringify(dbData, null, 2);
    const tmpFile = `${targetFile}.tmp.${Date.now()}`;
    
    // Atomic write to prevent file corruption
    fs.writeFileSync(tmpFile, dataStr, 'utf-8');
    fs.renameSync(tmpFile, targetFile);

    // Sync to dist folder as well if present
    const distDir = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      const distFile = path.join(distDir, 'server-db.json');
      if (distFile !== targetFile) {
        try {
          fs.writeFileSync(distFile, dataStr, 'utf-8');
        } catch {
          // Non-critical fallback
        }
      }
    }
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// In-memory reference synced to disk
let db = loadDatabase();

// Active server-side sessions
const activeSessions = new Map<string, SessionData>();
if (db.sessions) {
  const now = Date.now();
  for (const [token, session] of Object.entries(db.sessions)) {
    if (session.expiresAt > now) {
      activeSessions.set(token, session);
    }
  }
}

function createSession(user: User): string {
  const token = 'iyc_sess_' + crypto.randomBytes(24).toString('hex') + '_' + Date.now().toString(36);
  const sessionData: SessionData = {
    token,
    userId: user.id,
    role: user.role,
    email: user.email || '',
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days TTL
  };
  activeSessions.set(token, sessionData);
  if (!db.sessions) db.sessions = {};
  db.sessions[token] = sessionData;
  saveDatabase(db);
  return token;
}

function invalidateSession(token?: string, userId?: string) {
  let changed = false;
  if (token) {
    if (activeSessions.has(token)) {
      activeSessions.delete(token);
      changed = true;
    }
    if (db.sessions && db.sessions[token]) {
      delete db.sessions[token];
      changed = true;
    }
  }
  if (userId) {
    for (const [sToken, sData] of activeSessions.entries()) {
      if (sData.userId === userId) {
        activeSessions.delete(sToken);
        changed = true;
      }
    }
    if (db.sessions) {
      for (const [sToken, sData] of Object.entries(db.sessions)) {
        if (sData.userId === userId) {
          delete db.sessions[sToken];
          changed = true;
        }
      }
    }
  }
  if (changed) {
    saveDatabase(db);
  }
}

function getAuthenticatedUser(req: Request): User | null {
  const authHeader = req.headers['authorization'];
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    token = (req.headers['x-session-token'] as string) || '';
  }
  if (!token && req.query.token) {
    token = (req.query.token as string).trim();
  }

  if (token) {
    const session = activeSessions.get(token);
    if (!session) {
      return null;
    }
    if (Date.now() > session.expiresAt) {
      invalidateSession(token);
      return null;
    }
    const user = db.users.find(u => u.id === session.userId);
    if (!user || user.isDeleted || user.isBlocked) {
      invalidateSession(token);
      return null;
    }
    return user;
  }

  return null;
}

function checkAdminAuth(req: Request, res: Response): User | null {
  const user = getAuthenticatedUser(req);
  if (user && user.role === 'admin' && !user.isBlocked && !user.isDeleted && !user.deleted) {
    return user;
  }

  res.status(403).json({ success: false, error: 'Forbidden: Valid administrator authentication required.' });
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // ----------------------------------------------------
  // BACKEND API ROUTES
  // ----------------------------------------------------

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      usersCount: db.users.length, 
      itemsCount: db.items.length, 
      databasePath: getDatabaseFilePath() 
    });
  });

  // Current authenticated user session verification
  app.get('/api/auth/me', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthenticated session.' });
      return;
    }
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  });

  // Real backend logout: invalidates only the specific session
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    let token = '';
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    if (!token) token = (req.headers['x-session-token'] as string) || '';
    if (!token && req.body && req.body.token) token = req.body.token;
    
    if (token) {
      invalidateSession(token);
    }
    res.clearCookie('findit_session', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // Course configuration (Central source of truth)
  app.get('/api/courses', (req: Request, res: Response) => {
    res.json({
      courses: OFFICIAL_IYC_COURSES,
      studyYears: STUDY_YEARS
    });
  });

  // ----------------------------------------------------
  // REAL EMAIL OTP VERIFICATION ENDPOINTS (4-Digit Code)
  // ----------------------------------------------------
  app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: 'Email address is required.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check if this email is already registered to an existing account
      const existingUser = db.users.find(u => (u.email || '').toLowerCase() === cleanEmail);
      if (existingUser) {
        res.status(409).json({ 
          success: false, 
          error: 'An account with this email address is already registered. Please sign in or use another email.' 
        });
        return;
      }

      const result = await requestEmailOtp(cleanEmail);
      if (!result.success) {
        res.status(result.cooldownRemaining ? 429 : 400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      console.error('[send-otp] Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to dispatch verification email.' });
    }
  });

  app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;
      const result = verifyEmailOtp(email, otp);
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      console.error('[verify-otp] Error:', err);
      res.status(500).json({ success: false, error: 'Failed to verify code.' });
    }
  });

  // SMTP connection test and status diagnostic
  app.get('/api/auth/test-smtp', async (req: Request, res: Response) => {
    try {
      const status = await testSmtpConnection();
      res.json({
        success: status.connected,
        ...status,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to verify SMTP connection.'
      });
    }
  });

  // ----------------------------------------------------
  // 1. STUDENT REGISTRATION (Backend Validation Enforced)
  // ----------------------------------------------------
  app.post('/api/auth/register-student', async (req: Request, res: Response) => {
    const { 
      name, 
      studentId, 
      studyYear, 
      courseCode, 
      email, 
      password, 
      confirmPassword, 
      phone,
      verificationToken
    } = req.body;

    // 1. Strict Full Name Validation
    const nameVal = validateStudentName(name);
    if (!nameVal.isValid) {
      res.status(400).json({ 
        success: false, 
        error: nameVal.error || 'Please enter a valid full name.',
        field: 'name' 
      });
      return;
    }

    // 2. Study Year Validation
    const yearObj = STUDY_YEARS.find(y => y.code === (studyYear || '').toUpperCase());
    if (!yearObj) {
      res.status(400).json({ 
        success: false, 
        error: 'Please select your Study Year.',
        field: 'studyYear' 
      });
      return;
    }

    // 3. Course Validation
    const courseObj = findCourseByCode(courseCode);
    if (!courseObj) {
      res.status(400).json({ 
        success: false, 
        error: 'Please select a valid Course.',
        field: 'course' 
      });
      return;
    }

    // 4. Strict Student ID Format & Roll Number Range Validation
    const idVal = validateStudentId(studentId, courseCode, studyYear);
    if (!idVal.isValid) {
      res.status(400).json({ 
        success: false, 
        error: idVal.error || 'Invalid Student ID format.',
        field: 'studentId' 
      });
      return;
    }

    // 5. Unique Student ID Validation
    const cleanId = (studentId || '').trim().toUpperCase();
    const existingStudent = db.users.find(
      u => (u.studentId || '').toUpperCase() === cleanId
    );
    if (existingStudent) {
      res.status(409).json({ 
        success: false, 
        error: 'Student ID already exists.',
        field: 'studentId' 
      });
      return;
    }

    // 6. Mandatory Email & Backend OTP Verification
    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail) {
      res.status(400).json({ 
        success: false, 
        error: 'Email address is required for registration.',
        field: 'email' 
      });
      return;
    }

    if (db.users.some(u => (u.email || '').toLowerCase() === trimmedEmail)) {
      res.status(409).json({ 
        success: false, 
        error: 'Email ID already in use.',
        field: 'email' 
      });
      return;
    }

    // Verify OTP token on server (Prevents bypass or trusting frontend flag)
    const tokenCheck = consumeVerificationToken(trimmedEmail, verificationToken);
    if (!tokenCheck.isValid) {
      res.status(400).json({ 
        success: false, 
        error: tokenCheck.error || 'Email verification is required. Please verify your email with the 4-digit OTP before completing registration.',
        field: 'email' 
      });
      return;
    }

    // 7. Password Validation
    if (!password) {
      res.status(400).json({ 
        success: false, 
        error: 'Password is required.',
        field: 'password' 
      });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters long.',
        field: 'password' 
      });
      return;
    }

    // 8. Confirm Password
    if (confirmPassword !== undefined && password !== confirmPassword) {
      res.status(400).json({ 
        success: false, 
        error: 'Passwords do not match.',
        field: 'confirmPassword' 
      });
      return;
    }

    // 9. Optional Phone validation
    const trimmedPhone = (phone || '').trim();
    if (trimmedPhone) {
      const cleanPhone = trimmedPhone.replace(/[\s\-\+]/g, '');
      if (!/^\d{10,12}$/.test(cleanPhone)) {
        res.status(400).json({ 
          success: false, 
          error: 'Please enter a valid 10-digit phone number.',
          field: 'phone' 
        });
        return;
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create New Student Account (Strictly 'student' role — never admin or staff)
    const newStudent: User = {
      id: `user-student-${Date.now()}`,
      name: nameVal.cleanedName,
      studentId: cleanId,
      course: courseObj.name,
      department: courseObj.department,
      year: yearObj.fullTitle,
      role: 'student', // Non-negotiable server-side assignment
      email: trimmedEmail,
      emailVerified: true,
      phone: trimmedPhone || undefined,
      password: hashedPassword,
      createdAt: new Date().toISOString().split('T')[0]
    };

    db.users.push(newStudent);
    saveDatabase(db);

    // Return sanitized student record (omit password in returned user object)
    const { password: _, ...safeUser } = newStudent;
    res.status(201).json({
      success: true,
      message: 'Registration successful. You can now sign in with your Student ID and password.',
      user: safeUser
    });
  });

  // ----------------------------------------------------
  // 2. STUDENT LOGIN (Student ID + Password)
  // ----------------------------------------------------
  app.post('/api/auth/login-student', async (req: Request, res: Response) => {
    const { studentId, password } = req.body;
    const cleanId = (studentId || '').trim().toUpperCase();

    if (!cleanId) {
      res.status(400).json({ success: false, error: 'Student ID is required.' });
      return;
    }

    const student = db.users.find(
      u => (u.studentId || '').toUpperCase() === cleanId && u.role === 'student'
    );

    if (!student) {
      res.status(404).json({ 
        success: false, 
        error: 'No student account found with this Student ID.' 
      });
      return;
    }

    if (student.isDeleted) {
      res.status(404).json({ success: false, error: 'Student account has been deactivated or removed.' });
      return;
    }

    if (student.isBlocked) {
      res.status(403).json({ success: false, error: 'Your account has been blocked by the Administrator.' });
      return;
    }

    if (student.password && password) {
      const isMatch = await bcrypt.compare(password, student.password);
      if (!isMatch) {
        // Fallback for pre-existing plaintext passwords in dev database
        if (student.password !== password) {
          res.status(401).json({ 
            success: false, 
            error: 'Incorrect password. Please verify and try again.' 
          });
          return;
        } else {
          // Password matched plaintext, let's upgrade it to hashed
          const salt = await bcrypt.genSalt(10);
          student.password = await bcrypt.hash(password, salt);
          saveDatabase(db);
        }
      }
    } else {
       res.status(401).json({ 
        success: false, 
        error: 'Incorrect password. Please verify and try again.' 
      });
      return;
    }

    const sessionToken = createSession(student);
    res.clearCookie('findit_session', { path: '/' });
    const { password: _, ...safeUser } = student;
    res.json({ success: true, token: sessionToken, user: safeUser });
  });

  // ----------------------------------------------------
  // 3. STAFF REGISTRATION & LOGIN
  // ----------------------------------------------------
  app.post('/api/auth/register-staff', async (req: Request, res: Response) => {
    const { name, email, department, staffId, password, confirmPassword, verificationToken } = req.body;

    const nameVal = validateStudentName(name);
    if (!nameVal.isValid) {
      res.status(400).json({ success: false, error: 'Please enter a valid full name.' });
      return;
    }

    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      return;
    }

    if (db.users.some(u => (u.email || '').toLowerCase() === trimmedEmail)) {
      res.status(409).json({ success: false, error: 'Email ID already in use.', field: 'email' });
      return;
    }

    // Verify OTP token on server
    const tokenCheck = consumeVerificationToken(trimmedEmail, verificationToken);
    if (!tokenCheck.isValid) {
      res.status(400).json({ 
        success: false, 
        error: tokenCheck.error || 'Email verification is required. Please verify your email with the 4-digit OTP before completing registration.' 
      });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      return;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      res.status(400).json({ success: false, error: 'Passwords do not match.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStaff: User = {
      id: `user-staff-${Date.now()}`,
      name: nameVal.cleanedName,
      email: trimmedEmail,
      emailVerified: true,
      department: department || 'General Faculty',
      studentId: staffId ? staffId.trim().toUpperCase() : 'Not Assigned',
      designation: 'Faculty / Staff Member',
      role: 'staff', // Strictly staff
      password: hashedPassword,
      createdAt: new Date().toISOString().split('T')[0]
    };

    db.users.push(newStaff);
    saveDatabase(db);

    const { password: _, ...safeUser } = newStaff;
    res.status(201).json({
      success: true,
      message: 'Staff account registered successfully. You can now sign in with your email and password.',
      user: safeUser
    });
  });

  app.post('/api/auth/login-staff', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    const staff = db.users.find(
      u => u.role === 'staff' && (
        (u.email || '').toLowerCase() === cleanEmail ||
        (u.studentId || '').toLowerCase() === cleanEmail ||
        u.id.toLowerCase() === cleanEmail
      )
    );

    if (!staff) {
      res.status(404).json({ success: false, error: 'Staff account not found with this email.' });
      return;
    }

    if (staff.isDeleted) {
      res.status(404).json({ success: false, error: 'Staff account has been deactivated or removed.' });
      return;
    }

    if (staff.isBlocked) {
      res.status(403).json({ success: false, error: 'Your account has been blocked by the Administrator.' });
      return;
    }

    if (staff.password && password) {
      const isMatch = await bcrypt.compare(password, staff.password);
      if (!isMatch) {
        // Fallback for pre-existing plaintext passwords
        if (staff.password !== password) {
          res.status(401).json({ success: false, error: 'Incorrect password. Please verify and try again.' });
          return;
        } else {
          const salt = await bcrypt.genSalt(10);
          staff.password = await bcrypt.hash(password, salt);
          saveDatabase(db);
        }
      }
    } else {
      res.status(401).json({ success: false, error: 'Incorrect password. Please verify and try again.' });
      return;
    }

    const sessionToken = createSession(staff);
    res.clearCookie('findit_session', { path: '/' });
    const { password: _, ...safeUser } = staff;
    res.json({ success: true, token: sessionToken, user: safeUser });
  });

  // ----------------------------------------------------
  // 4. ADMIN LOGIN (Mayur Suryavanshi Authorized ONLY)
  // ----------------------------------------------------
  app.post('/api/auth/login-admin', async (req: Request, res: Response) => {
    const { identifier, password } = req.body;
    const cleanId = (identifier || '').trim().toLowerCase();

    // Verify authorized admin only
    const admin = db.users.find(u => 
      u.role === 'admin' && (
        (u.email || '').toLowerCase() === cleanId ||
        (u.studentId || '').toLowerCase() === cleanId ||
        cleanId === 'admin'
      )
    );

    if (!admin || admin.isDeleted) {
      res.status(404).json({ success: false, error: 'Administrator account not recognized.' });
      return;
    }

    if (admin.password && password) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        if (admin.password !== password) {
          res.status(401).json({ success: false, error: 'Invalid administrator password.' });
          return;
        } else {
          const salt = await bcrypt.genSalt(10);
          admin.password = await bcrypt.hash(password, salt);
          saveDatabase(db);
        }
      }
    } else {
      res.status(401).json({ success: false, error: 'Invalid administrator password.' });
      return;
    }

    const sessionToken = createSession(admin);
    res.clearCookie('findit_session', { path: '/' });
    const { password: _, ...safeUser } = admin;
    res.json({ success: true, token: sessionToken, user: safeUser });
  });

  // ----------------------------------------------------
  // 5. USERS LIST & STATS (Real Database Stats Only)
  // ----------------------------------------------------
  app.get('/api/users', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Return non-deleted sanitized users without passwords and without AI avatars
    const safeUsers = db.users
      .filter(u => !u.isDeleted && !u.deleted)
      .map(({ password: _, avatar: __, ...u }) => u);
    res.json(safeUsers);
  });

  app.get('/api/stats', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    // Requirements: Dashboard counts/statistics must exclude deleted reports
    const activeItems = db.items.filter(i => !i.deleted);
    const lostCount = activeItems.filter(i => i.type === 'LOST').length;
    const foundCount = activeItems.filter(i => i.type === 'FOUND').length;
    const recoveredCount = activeItems.filter(i => i.status === 'RECOVERED').length;
    const claimsCount = db.claims.length;
    const studentsCount = db.users.filter(u => !u.isDeleted && !u.deleted && u.role === 'student').length;
    const staffCount = db.users.filter(u => !u.isDeleted && !u.deleted && u.role === 'staff').length;

    res.json({
      lostItems: lostCount,
      foundItems: foundCount,
      recoveredItems: recoveredCount,
      totalClaims: claimsCount,
      totalStudents: studentsCount,
      totalStaff: staffCount,
      totalUsers: db.users.filter(u => !u.isDeleted && !u.deleted).length,
      deletedItems: db.items.filter(i => i.deleted).length
    });
  });

  // ----------------------------------------------------
  // 6. REAL ITEMS MANAGEMENT & ADMIN SOFT DELETE
  // ----------------------------------------------------
  app.get('/api/items', (req: Request, res: Response) => {
    const adminId = (req.query.adminId as string) || (req.headers['x-admin-id'] as string) || (req.headers['x-user-id'] as string);
    const includeDeleted = req.query.includeDeleted === 'true';
    const statusQuery = (req.query.status as string || '').toUpperCase();
    const viewQuery = (req.query.view as string || '').toLowerCase();
    const activeOnly = req.query.activeOnly === 'true';

    // Verify if requester is an actual authenticated admin from their session
    const authUser = getAuthenticatedUser(req);
    const isAdmin = !!(authUser && authUser.role === 'admin');

    let result = db.items;

    if (!isAdmin || !includeDeleted) {
      // Normal students, staff, and public visitors strictly never receive deleted items
      result = result.filter(item => !item.deleted);
    }

    // Backend filtering for Active Listings:
    // Exclude RECOVERED, CLOSED, and REJECTED reports from active listings
    if (viewQuery === 'activelistings' || statusQuery === 'ACTIVE_LISTINGS' || activeOnly) {
      result = result.filter(item => 
        !item.deleted && 
        item.status !== 'RECOVERED' && 
        item.status !== 'CLOSED' && 
        item.verificationStatus !== 'REJECTED'
      );
    } else if (statusQuery === 'RECOVERED' || viewQuery === 'recovered') {
      result = result.filter(item => !item.deleted && item.status === 'RECOVERED');
    }

    res.json(result);
  });

  app.get('/api/items/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const authUser = getAuthenticatedUser(req);
    const isAdmin = !!(authUser && authUser.role === 'admin');

    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found.' });
      return;
    }

    if (item.deleted && !isAdmin) {
      res.status(404).json({ success: false, error: 'Item not found or has been removed.' });
      return;
    }

    res.json(item);
  });

  app.post('/api/items', (req: Request, res: Response) => {
    const itemData = req.body;
    if (!itemData.itemName || !itemData.location || !itemData.type) {
      res.status(400).json({ success: false, error: 'Missing required item information.' });
      return;
    }

    // Verify poster account status if user ID provided
    if (itemData.userId) {
      const poster = db.users.find(u => u.id === itemData.userId);
      if (poster) {
        if (poster.isBlocked) {
          res.status(403).json({ success: false, error: 'Your account has been blocked by the Administrator.' });
          return;
        }
        if (poster.isRestricted) {
          res.status(403).json({ 
            success: false, 
            error: 'Your posting privileges have been restricted by the Administrator. You cannot create new listings.' 
          });
          return;
        }
      }
    }

    const newItem: Item = {
      ...itemData,
      id: itemData.id || `item-${Date.now()}`,
      status: itemData.status || 'ACTIVE',
      verificationStatus: itemData.verificationStatus || 'PENDING',
      deleted: false,
      createdAt: itemData.createdAt || new Date().toISOString()
    };

    // Remove if already exists with same id (upsert) or add
    const existingIndex = db.items.findIndex(i => i.id === newItem.id);
    if (existingIndex >= 0) {
      db.items[existingIndex] = newItem;
    } else {
      db.items.unshift(newItem);
    }
    recalculateMatchesInDb(db);
    saveDatabase(db);
    res.status(201).json({ success: true, item: newItem });
  });

  app.put('/api/items/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const index = db.items.findIndex(i => i.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, error: 'Item not found.' });
      return;
    }

    db.items[index] = { ...db.items[index], ...updates };
    recalculateMatchesInDb(db);
    saveDatabase(db);
    res.json({ success: true, item: db.items[index] });
  });

  // Verify item listing by Admin or Staff
  app.post('/api/items/:id/verify', (req: Request, res: Response) => {
    const { id } = req.params;
    const { adminId, userId, verifierName } = req.body;
    const authUser = getAuthenticatedUser(req);
    const identifier = adminId || userId || (req.headers['x-admin-id'] as string) || (req.headers['x-user-id'] as string);

    // Authenticate Admin or Staff
    const reviewer = authUser || (identifier ? db.users.find(u => (u.id === identifier || u.email === identifier) && (u.role === 'admin' || u.role === 'staff')) : null);
    if (!reviewer || (reviewer.role !== 'admin' && reviewer.role !== 'staff')) {
      res.status(403).json({ success: false, error: 'Unauthorized. Only Staff or Campus Administrators can verify reports.' });
      return;
    }

    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found.' });
      return;
    }

    const displayName = verifierName || reviewer.name;
    item.isVerifiedByAdmin = true;
    item.verificationStatus = 'VERIFIED';
    item.verifiedBy = displayName;
    item.verifiedAt = new Date().toISOString();

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: reviewer.id,
      title: 'Item Listing Verified',
      description: `Listing "${item.itemName}" was verified by ${displayName} (${reviewer.role}).`,
      timestamp: new Date().toISOString(),
      type: 'STATUS'
    };
    db.activities.unshift(log);

    recalculateMatchesInDb(db);
    saveDatabase(db);
    res.json({ success: true, item });
  });

  // Reject item listing by staff/admin
  app.post('/api/items/:id/reject', (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, adminId, userId, verifiedBy } = req.body;
    const authUser = getAuthenticatedUser(req);
    const identifier = adminId || userId || (req.headers['x-admin-id'] as string) || (req.headers['x-user-id'] as string);

    // Authenticate Admin or Staff
    const reviewer = authUser || (identifier ? db.users.find(u => (u.id === identifier || u.email === identifier) && (u.role === 'admin' || u.role === 'staff')) : null);
    if (!reviewer || (reviewer.role !== 'admin' && reviewer.role !== 'staff')) {
      res.status(403).json({ success: false, error: 'Unauthorized. Only Staff or Campus Administrators can reject reports.' });
      return;
    }

    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found.' });
      return;
    }

    const displayName = verifiedBy || reviewer.name;
    item.verificationStatus = 'REJECTED';
    item.verifiedBy = displayName;
    item.verifiedAt = new Date().toISOString();
    const note = `Review Note (${reviewer.role}): ${reason || 'Details could not be verified'}`;
    item.additionalInfo = item.additionalInfo ? `${item.additionalInfo} | ${note}` : note;

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: reviewer.id,
      title: 'Item Listing Rejected',
      description: `Listing "${item.itemName}" was rejected by ${displayName}. Reason: ${reason || 'Unverified'}`,
      timestamp: new Date().toISOString(),
      type: 'STATUS'
    };
    db.activities.unshift(log);

    recalculateMatchesInDb(db);
    saveDatabase(db);
    res.json({ success: true, item });
  });

  // Mark item as recovered
  app.post('/api/items/:id/recover', (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;
    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found.' });
      return;
    }

    item.status = 'RECOVERED';
    item.recoveredAt = new Date().toISOString();

    // Also mark any pending claim on this item as approved
    db.claims.forEach(c => {
      if (c.itemId === id && c.status === 'PENDING') {
        c.status = 'APPROVED';
        c.resolvedAt = new Date().toISOString();
        c.resolutionNotes = 'Marked recovered by owner/finder';
      }
    });

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: userId || item.userId,
      title: 'Item Recovered',
      description: `"${item.itemName}" was marked as successfully recovered.`,
      timestamp: new Date().toISOString(),
      type: 'RECOVERY'
    };
    db.activities.unshift(log);

    recalculateMatchesInDb(db);
    saveDatabase(db);
    res.json({ success: true, item });
  });

  // Flag item as suspicious
  app.post('/api/items/:id/flag', (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, reportedBy, userId } = req.body;
    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found.' });
      return;
    }

    item.isReportedSuspicious = true;

    const report: ModerationReport = {
      id: `rep-${Date.now()}`,
      itemId: id,
      reportedBy: reportedBy || 'Anonymous Student',
      reason: reason || 'Flagged for suspicious content',
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };
    db.moderation.unshift(report);

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: userId || 'anonymous',
      title: 'Listing Flagged for Moderation',
      description: `Report filed for "${item.itemName}": ${reason || 'Suspicious listing'}.`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);

    saveDatabase(db);
    res.json({ success: true, item, report });
  });

  // Dismiss flag on item / moderation report
  app.post('/api/items/:id/dismiss-flag', (req: Request, res: Response) => {
    const { id } = req.params;
    const rep = db.moderation.find(r => r.id === id || r.itemId === id);
    if (rep) {
      rep.status = 'DISMISSED';
    }

    const item = db.items.find(i => i.id === id || (rep && i.id === rep.itemId));
    if (item) {
      item.isReportedSuspicious = false;
    }

    saveDatabase(db);
    res.json({ success: true });
  });

  // Handler for Soft Delete (Owner, Staff, or Admin)
  const handleSoftDelete = (req: Request, res: Response) => {
    const { id } = req.params;
    const requesterId = req.body?.userId || req.body?.adminId || (req.query?.userId as string) || (req.query?.adminId as string) || (req.headers['x-admin-id'] as string) || (req.headers['x-user-id'] as string);
    const authUser = getAuthenticatedUser(req);
    const user = authUser || db.users.find(u => u.id === requesterId || u.email === requesterId || (u.studentId && u.studentId === requesterId));

    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Report not found in database.' });
      return;
    }

    // Check authorization: Admin, Staff, or Owner of the item
    const isAdmin = user && user.role === 'admin';
    const isStaff = user && user.role === 'staff';
    const isOwner = (user && (user.id === item.userId || user.email === item.userEmail || (user.studentId && user.studentId === item.userId))) ||
                    (requesterId && (requesterId === item.userId || requesterId === item.userEmail));

    if (!isAdmin && !isStaff && !isOwner) {
      res.status(403).json({ 
        success: false, 
        error: 'Unauthorized. You can only delete reports that you submitted, or you must be an administrator or staff member.' 
      });
      return;
    }

    // SOFT DELETE: Flag as deleted, record timestamp and user ID
    const deletedBy = user ? user.id : (requesterId || 'user');
    const deleterName = user ? user.name : (isOwner ? item.userName : 'Authorized User');
    item.deleted = true;
    item.deletedAt = new Date().toISOString();
    item.deletedBy = deletedBy;

    // Add activity log
    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: deletedBy,
      title: isAdmin ? `Report Soft-Deleted by Admin` : (isStaff ? `Report Soft-Deleted by Staff` : `Report Deleted by Student`),
      description: `${deleterName} deleted ${item.type} listing "${item.itemName}" (ID: ${item.id}).`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);

    recalculateMatchesInDb(db);
    saveDatabase(db);
    res.json({ 
      success: true, 
      message: `Report "${item.itemName}" successfully deleted.`, 
      item 
    });
  };

  // Support both DELETE /api/items/:id and POST /api/items/:id/delete
  app.delete('/api/items/:id', handleSoftDelete);
  app.post('/api/items/:id/delete', handleSoftDelete);

  // Admin Restore endpoint
  app.post('/api/items/:id/restore', (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.body?.adminId || (req.query?.adminId as string) || (req.headers['x-admin-id'] as string) || (req.headers['x-user-id'] as string);

    // SECURITY: Verify that the requester is an actual authenticated ADMIN from session or database
    const authUser = getAuthenticatedUser(req);
    const adminUser = (authUser && authUser.role === 'admin') ? authUser : (adminId ? db.users.find(u => (u.id === adminId || u.email === adminId) && u.role === 'admin') : null);
    if (!adminUser) {
      res.status(403).json({ 
        success: false, 
        error: 'Unauthorized. Only certified Campus Administrators can restore reports.' 
      });
      return;
    }

    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Report not found in database.' });
      return;
    }

    // RESTORE: Unset deleted flag
    item.deleted = false;
    delete item.deletedAt;
    delete item.deletedBy;

    // Add activity log
    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: adminUser.id,
      title: `Report Restored by Admin`,
      description: `Admin ${adminUser.name} restored ${item.type} listing "${item.itemName}" (ID: ${item.id}) to active status.`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);

    recalculateMatchesInDb(db);
    saveDatabase(db);
    res.json({ 
      success: true, 
      message: `Report "${item.itemName}" successfully restored.`, 
      item 
    });
  });

  // ----------------------------------------------------
  // ADMIN USER MANAGEMENT
  // ----------------------------------------------------

  const handleBlockUser = (req: Request, res: Response) => {
    const adminUser = checkAdminAuth(req, res);
    if (!adminUser) return;
    const { userId } = req.params;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser || targetUser.isDeleted) { 
      res.status(404).json({ success: false, error: 'User not found.' }); 
      return; 
    }
    if (targetUser.role === 'admin' || targetUser.id === adminUser.id) { 
      res.status(403).json({ success: false, error: 'Cannot block an administrator account.' }); 
      return; 
    }
    
    targetUser.isBlocked = true;
    targetUser.status = 'BLOCKED';
    // Invalidate all active sessions for this blocked user immediately
    invalidateSession(undefined, targetUser.id);

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: adminUser.id,
      title: 'User Account Blocked',
      description: `Administrator ${adminUser.name} blocked user ${targetUser.name} (${targetUser.email || targetUser.studentId}).`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);

    saveDatabase(db);
    const { password: _, ...safeUser } = targetUser;
    res.json({ success: true, user: safeUser, message: `User ${targetUser.name} has been blocked.` });
  };

  app.put('/api/admin/users/:userId/block', handleBlockUser);
  app.post('/api/admin/users/:userId/block', handleBlockUser);

  const handleUnblockUser = (req: Request, res: Response) => {
    const adminUser = checkAdminAuth(req, res);
    if (!adminUser) return;
    const { userId } = req.params;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser || targetUser.isDeleted) { 
      res.status(404).json({ success: false, error: 'User not found.' }); 
      return; 
    }
    
    targetUser.isBlocked = false;
    targetUser.status = targetUser.isRestricted ? 'RESTRICTED' : 'ACTIVE';

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: adminUser.id,
      title: 'User Account Unblocked',
      description: `Administrator ${adminUser.name} unblocked user ${targetUser.name} (${targetUser.email || targetUser.studentId}).`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);

    saveDatabase(db);
    const { password: _, ...safeUser } = targetUser;
    res.json({ success: true, user: safeUser, message: `User ${targetUser.name} has been unblocked.` });
  };

  app.put('/api/admin/users/:userId/unblock', handleUnblockUser);
  app.post('/api/admin/users/:userId/unblock', handleUnblockUser);

  const handleRestrictUser = (req: Request, res: Response) => {
    const adminUser = checkAdminAuth(req, res);
    if (!adminUser) return;
    const { userId } = req.params;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser || targetUser.isDeleted) { 
      res.status(404).json({ success: false, error: 'User not found.' }); 
      return; 
    }
    if (targetUser.role === 'admin' || targetUser.id === adminUser.id) { 
      res.status(403).json({ success: false, error: 'Cannot restrict an administrator account.' }); 
      return; 
    }
    
    targetUser.isRestricted = true;
    if (!targetUser.isBlocked) {
      targetUser.status = 'RESTRICTED';
    }

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: adminUser.id,
      title: 'User Account Privileges Restricted',
      description: `Administrator ${adminUser.name} restricted posting privileges for user ${targetUser.name}.`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);

    saveDatabase(db);
    const { password: _, ...safeUser } = targetUser;
    res.json({ success: true, user: safeUser, message: `User ${targetUser.name} posting privileges restricted.` });
  };

  app.put('/api/admin/users/:userId/restrict', handleRestrictUser);
  app.post('/api/admin/users/:userId/restrict', handleRestrictUser);

  const handleUnrestrictUser = (req: Request, res: Response) => {
    const adminUser = checkAdminAuth(req, res);
    if (!adminUser) return;
    const { userId } = req.params;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser || targetUser.isDeleted) { 
      res.status(404).json({ success: false, error: 'User not found.' }); 
      return; 
    }
    
    targetUser.isRestricted = false;
    if (!targetUser.isBlocked) {
      targetUser.status = 'ACTIVE';
    }

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: adminUser.id,
      title: 'User Account Restrictions Lifted',
      description: `Administrator ${adminUser.name} restored full privileges for user ${targetUser.name}.`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);

    saveDatabase(db);
    const { password: _, ...safeUser } = targetUser;
    res.json({ success: true, user: safeUser, message: `Restrictions lifted for ${targetUser.name}.` });
  };

  app.put('/api/admin/users/:userId/unrestrict', handleUnrestrictUser);
  app.post('/api/admin/users/:userId/unrestrict', handleUnrestrictUser);

  const handleDeleteUser = (req: Request, res: Response) => {
    const { userId } = req.params;
    console.log(`[USER DELETION] Initiating deletion request for target userId: "${userId}"`);

    const adminUser = checkAdminAuth(req, res);
    if (!adminUser) {
      console.warn(`[USER DELETION REJECTED] Administrator authorization check failed for userId "${userId}".`);
      return;
    }
    console.log(`[USER DELETION] Authenticated Administrator: ${adminUser.id} (${adminUser.name}, ${adminUser.email})`);

    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) { 
      console.warn(`[USER DELETION FAILED] Target user "${userId}" does not exist in database.`);
      res.status(404).json({ success: false, error: 'User not found in database.' }); 
      return; 
    }
    if (targetUser.role === 'admin' || targetUser.id === adminUser.id) { 
      console.warn(`[USER DELETION BLOCKED] Attempted to delete administrator account: "${targetUser.id}".`);
      res.status(403).json({ success: false, error: 'Cannot delete an administrator account.' }); 
      return; 
    }

    console.log(`[USER DELETION PROCEEDING] Target user found: ${targetUser.name} (${targetUser.role}, ${targetUser.email || targetUser.studentId})`);

    // Invalidate sessions immediately across server and database
    invalidateSession(undefined, targetUser.id);

    // Soft delete user record and deactivate credentials
    targetUser.isDeleted = true;
    targetUser.deleted = true;
    targetUser.deletedAt = new Date().toISOString();
    targetUser.deletedBy = adminUser.id;
    targetUser.isBlocked = true;
    targetUser.status = 'DELETED';
    delete targetUser.password;

    // Soft delete all active items created by this user
    let deletedItemsCount = 0;
    db.items = db.items.map(i => {
      if (i.userId === userId && !i.deleted) {
        deletedItemsCount++;
        return {
          ...i,
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: adminUser.id
        };
      }
      return i;
    });

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: adminUser.id,
      title: 'User Account Deleted',
      description: `Administrator ${adminUser.name} deleted user ${targetUser.name} (${targetUser.email || targetUser.studentId}).`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);
    
    recalculateMatchesInDb(db);
    saveDatabase(db);
    console.log(`[USER DELETION SUCCESS] User "${targetUser.id}" deleted. ${deletedItemsCount} items removed. Database write completed.`);
    res.json({ success: true, message: `User ${targetUser.name} was successfully deleted.` });
  };

  app.delete('/api/admin/users/:userId', handleDeleteUser);
  app.post('/api/admin/users/:userId/delete', handleDeleteUser);
  app.delete('/api/users/:userId', handleDeleteUser);

  // ----------------------------------------------------
  // 7. CLAIMS & MESSAGES
  // ----------------------------------------------------
  app.get('/api/claims', (req: Request, res: Response) => {
    res.json(db.claims);
  });

  app.post('/api/claims', (req: Request, res: Response) => {
    const claimData = req.body;
    const newClaim: Claim = {
      ...claimData,
      id: `claim-${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    db.claims.unshift(newClaim);

    // Mark item as CLAIMED (pending resolution)
    const item = db.items.find(i => i.id === newClaim.itemId);
    if (item && item.status !== 'RECOVERED') {
      item.status = 'CLAIMED';
    }

    // Notify owner
    db.messages.unshift({
      id: `msg-${Date.now()}`,
      senderId: newClaim.claimantId || 'anonymous',
      senderName: newClaim.claimantName || 'Campus Member',
      receiverId: newClaim.ownerId,
      receiverName: newClaim.ownerName,
      itemId: newClaim.itemId,
      itemName: newClaim.itemName,
      itemType: newClaim.itemType,
      text: `📋 New Ownership Claim Received from ${newClaim.claimantName}. Review their proof in your Dashboard.`,
      createdAt: new Date().toISOString(),
      read: false
    });

    // Add activity log
    db.activities.unshift({
      id: `act-${Date.now()}`,
      userId: newClaim.claimantId,
      title: 'Ownership Claim Submitted',
      description: `Submitted claim with proof for "${newClaim.itemName}". Pending finder/staff review.`,
      timestamp: new Date().toISOString(),
      type: 'STATUS'
    });

    saveDatabase(db);
    res.status(201).json({ success: true, claim: newClaim });
  });

  app.put('/api/claims/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const index = db.claims.findIndex(c => c.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, error: 'Claim not found.' });
      return;
    }
    db.claims[index] = { ...db.claims[index], ...updates };
    saveDatabase(db);
    res.json({ success: true, claim: db.claims[index] });
  });

  // Approve claim
  app.post('/api/claims/:id/approve', (req: Request, res: Response) => {
    const { id } = req.params;
    const { reviewerId, reviewerName, resolutionNotes, handoverLocation } = req.body;
    const claim = db.claims.find(c => c.id === id);
    if (!claim) {
      res.status(404).json({ success: false, error: 'Claim not found.' });
      return;
    }

    claim.status = 'APPROVED';
    claim.resolvedAt = new Date().toISOString();
    claim.resolutionNotes = resolutionNotes || 'Claim verified and approved by reviewer.';
    claim.handoverLocation = handoverLocation || 'Department Office';

    // Mark item as RECOVERED
    const item = db.items.find(i => i.id === claim.itemId);
    if (item) {
      item.status = 'RECOVERED';
      item.recoveredAt = new Date().toISOString();
    }

    // Reject other pending claims on this item
    db.claims.forEach(other => {
      if (other.itemId === claim.itemId && other.id !== claim.id && other.status === 'PENDING') {
        other.status = 'REJECTED';
        other.resolvedAt = new Date().toISOString();
        other.resolutionNotes = 'Item was claimed and verified by another claimant.';
        db.messages.unshift({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: reviewerId || 'system',
          senderName: reviewerName || 'FindIt Reviewer',
          receiverId: other.claimantId,
          itemId: other.itemId,
          itemName: other.itemName,
          itemType: other.itemType,
          text: `Update on your claim for "${other.itemName}": The item has been verified and returned to another claimant.`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    });

    // Notify approved claimant
    db.messages.unshift({
      id: `msg-${Date.now()}`,
      senderId: reviewerId || 'system',
      senderName: reviewerName || 'FindIt Reviewer',
      receiverId: claim.claimantId,
      itemId: claim.itemId,
      itemName: claim.itemName,
      itemType: claim.itemType,
      text: `Good news! Your claim for "${claim.itemName}" has been APPROVED. Handover Location: ${claim.handoverLocation}. Notes: ${claim.resolutionNotes}`,
      createdAt: new Date().toISOString(),
      read: false
    });

    // Activity log
    db.activities.unshift({
      id: `act-${Date.now()}`,
      userId: claim.claimantId,
      title: 'Claim Approved',
      description: `Claim for "${claim.itemName}" approved by ${reviewerName || 'Reviewer'}. Handover at ${claim.handoverLocation}.`,
      timestamp: new Date().toISOString(),
      type: 'CLAIM'
    });

    saveDatabase(db);
    res.json({ success: true, claim, item });
  });

  // Reject claim
  app.post('/api/claims/:id/reject', (req: Request, res: Response) => {
    const { id } = req.params;
    const { reviewerId, reviewerName, resolutionNotes } = req.body;
    const claim = db.claims.find(c => c.id === id);
    if (!claim) {
      res.status(404).json({ success: false, error: 'Claim not found.' });
      return;
    }

    claim.status = 'REJECTED';
    claim.resolvedAt = new Date().toISOString();
    claim.resolutionNotes = resolutionNotes || 'Claim was reviewed and not approved.';

    // Revert item status to ACTIVE if no other pending claims
    const otherPending = db.claims.some(c => c.itemId === claim.itemId && c.id !== claim.id && c.status === 'PENDING');
    const item = db.items.find(i => i.id === claim.itemId);
    if (item && !otherPending && item.status === 'CLAIMED') {
      item.status = 'ACTIVE';
    }

    // Notify claimant
    db.messages.unshift({
      id: `msg-${Date.now()}`,
      senderId: reviewerId || 'system',
      senderName: reviewerName || 'FindIt Reviewer',
      receiverId: claim.claimantId,
      itemId: claim.itemId,
      itemName: claim.itemName,
      itemType: claim.itemType,
      text: `Your claim for "${claim.itemName}" was reviewed and not approved. Reviewer notes: ${claim.resolutionNotes}`,
      createdAt: new Date().toISOString(),
      read: false
    });

    // Activity log
    db.activities.unshift({
      id: `act-${Date.now()}`,
      userId: claim.claimantId,
      title: 'Claim Rejected',
      description: `Claim for "${claim.itemName}" was rejected by ${reviewerName || 'Reviewer'}.`,
      timestamp: new Date().toISOString(),
      type: 'CLAIM'
    });

    saveDatabase(db);
    res.json({ success: true, claim, item });
  });

  app.get('/api/messages', (req: Request, res: Response) => {
    res.json(db.messages);
  });

  app.post('/api/messages', (req: Request, res: Response) => {
    const msgData = req.body;
    const newMsg: Message = {
      ...msgData,
      id: `msg-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false
    };
    db.messages.unshift(newMsg);
    saveDatabase(db);
    res.status(201).json({ success: true, message: newMsg });
  });

  // Mark message as read
  const handleMessageRead = (req: Request, res: Response) => {
    const { id } = req.params;
    const msg = db.messages.find(m => m.id === id);
    if (!msg) {
      res.status(404).json({ success: false, error: 'Message not found.' });
      return;
    }
    msg.read = true;
    saveDatabase(db);
    res.json({ success: true, message: msg });
  };

  app.put('/api/messages/:id/read', handleMessageRead);
  app.post('/api/messages/:id/read', handleMessageRead);

  app.post('/api/messages/mark-all-read', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (userId) {
      db.messages.forEach(m => {
        if (m.receiverId === userId) m.read = true;
      });
      saveDatabase(db);
    }
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // 8. ACTIVITIES
  // ----------------------------------------------------
  app.get('/api/activities', (req: Request, res: Response) => {
    res.json(db.activities);
  });

  app.post('/api/activities', (req: Request, res: Response) => {
    const { userId, title, description, type } = req.body;
    const newAct: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: userId || 'system',
      title: title || 'Activity Logged',
      description: description || '',
      timestamp: new Date().toISOString(),
      type: type || 'STATUS'
    };
    db.activities.unshift(newAct);
    saveDatabase(db);
    res.status(201).json({ success: true, activity: newAct });
  });

  // ----------------------------------------------------
  // 9. MODERATION REPORTS
  // ----------------------------------------------------
  app.get('/api/moderation', (req: Request, res: Response) => {
    res.json(db.moderation);
  });

  app.post('/api/moderation', (req: Request, res: Response) => {
    const { itemId, reportedBy, reason, userId } = req.body;
    const newReport: ModerationReport = {
      id: `rep-${Date.now()}`,
      itemId,
      reportedBy: reportedBy || 'Anonymous Student',
      reason: reason || 'Flagged for moderation',
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };
    db.moderation.unshift(newReport);

    const item = db.items.find(i => i.id === itemId);
    if (item) item.isReportedSuspicious = true;

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: userId || 'anonymous',
      title: 'Item Moderation Report Filed',
      description: `Report filed for item ID ${itemId}: ${reason}.`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);

    saveDatabase(db);
    res.status(201).json({ success: true, report: newReport });
  });

  app.put('/api/moderation/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const index = db.moderation.findIndex(r => r.id === id || r.itemId === id);
    if (index === -1) {
      res.status(404).json({ success: false, error: 'Moderation report not found.' });
      return;
    }
    db.moderation[index] = { ...db.moderation[index], ...updates };
    saveDatabase(db);
    res.json({ success: true, report: db.moderation[index] });
  });

  app.post('/api/moderation/:id/dismiss', (req: Request, res: Response) => {
    const { id } = req.params;
    const rep = db.moderation.find(r => r.id === id || r.itemId === id);
    if (rep) {
      rep.status = 'DISMISSED';
    }
    const item = db.items.find(i => i.id === id || (rep && i.id === rep.itemId));
    if (item) {
      item.isReportedSuspicious = false;
    }
    saveDatabase(db);
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // 10. CAMPUS LOCATIONS
  // ----------------------------------------------------
  app.get('/api/locations', (req: Request, res: Response) => {
    res.json(db.locations);
  });

  app.post('/api/locations', (req: Request, res: Response) => {
    const { area, name, description } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Location name is required.' });
      return;
    }
    const newLoc: CampusLocation = {
      id: `loc-${Date.now()}`,
      area: area || 'General Campus & Amenities',
      name: name.trim(),
      description: (description || '').trim(),
      isActive: true
    };
    db.locations.push(newLoc);
    saveDatabase(db);
    res.status(201).json({ success: true, location: newLoc });
  });

  app.put('/api/locations/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const idx = db.locations.findIndex(l => l.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Location not found.' });
      return;
    }
    db.locations[idx] = { ...db.locations[idx], ...updates };
    saveDatabase(db);
    res.json({ success: true, location: db.locations[idx] });
  });

  app.post('/api/locations/:id/toggle', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = db.locations.findIndex(l => l.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Location not found.' });
      return;
    }
    db.locations[idx].isActive = !db.locations[idx].isActive;
    saveDatabase(db);
    res.json({ success: true, location: db.locations[idx] });
  });

  // ----------------------------------------------------
  // 11. USER BLOCK / STATUS TOGGLE
  // ----------------------------------------------------
  app.post('/api/users/:id/block', (req: Request, res: Response) => {
    const { id } = req.params;
    const user = db.users.find(u => u.id === id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }
    // Toggle block status
    (user as any).isBlocked = !(user as any).isBlocked;
    saveDatabase(db);
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  });

  // ----------------------------------------------------
  // 12. MATCHES ENGINE (Server Calculated & Persistent)
  // ----------------------------------------------------
  app.get('/api/matches', (req: Request, res: Response) => {
    // Recalculate against persistent database to ensure fresh state and immutable IDs
    const matches = recalculateMatchesInDb(db);
    saveDatabase(db);
    res.json(matches);
  });

  // Server-side semantic similarity comparison endpoint (Keeps credentials server-side, with deterministic fallback)
  app.post('/api/nlp/semantic-similarity', async (req: Request, res: Response) => {
    const { textA, textB, itemA, itemB } = req.body;
    if (!textA && !textB && !itemA && !itemB) {
      res.status(400).json({ success: false, error: 'Missing text or item definitions.' });
      return;
    }

    const deterministic = itemA && itemB
      ? calculateTextSemanticSimilarity(itemA, itemB)
      : calculateTextSemanticSimilarity(
          { itemName: textA || '', description: textA || '' } as any,
          { itemName: textB || '', description: textB || '' } as any
        );

    // If server has GEMINI_API_KEY, optionally query for AI reasoning while preserving fallback
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Compare these two Lost & Found item reports from Ismail Yusuf College and evaluate their semantic similarity.
Description A: "${textA || itemA?.description || itemA?.itemName}"
Description B: "${textB || itemB?.description || itemB?.itemName}"
Return JSON only: { "similarityScore": number (0-100), "reason": string }`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        const text = response.text || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          res.json({
            success: true,
            score: typeof parsed.similarityScore === 'number' ? parsed.similarityScore : deterministic.score,
            explanation: parsed.reason || deterministic.explanation,
            method: 'gemini_api_server_side'
          });
          return;
        }
      } catch (err) {
        console.warn('External semantic API request failed; falling back to deterministic local NLP engine:', err);
      }
    }

    res.json({
      success: true,
      score: deterministic.score,
      explanation: deterministic.explanation,
      sharedConcept: deterministic.sharedConceptName,
      method: 'deterministic_nlp_engine'
    });
  });

  // Reset to default clean state
  app.post('/api/reset', (req: Request, res: Response) => {
    db = {
      users: INITIAL_USERS.map(u => {
        const copy = { ...u };
        delete copy.avatar;
        return copy;
      }),
      items: [],
      claims: [],
      messages: [],
      activities: [],
      moderation: [],
      locations: INITIAL_LOCATIONS
    };
    saveDatabase(db);
    res.json({ success: true, message: 'Database reset to clean official state.' });
  });

  // Catch-all 404 handler for any unhandled /api routes to guarantee JSON response and prevent HTML fallback
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: `API endpoint ${req.method} ${req.path} not found.` });
  });

  // Dedicated API error handler to guarantee JSON error response
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error('API Error handler caught:', err);
      res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
      return;
    }
    next(err);
  });

  // ----------------------------------------------------
  // VITE MIDDLEWARE / PRODUCTION STATIC SERVING
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : (fs.existsSync(path.join(currentDirname, 'index.html'))
          ? currentDirname
          : path.join(process.cwd(), 'dist'));
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FindIt IYC Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
