import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
import { User, Item, Claim, Message, ActivityLog, ModerationReport, CampusLocation } from './src/types';
import { calculateMatchScore } from './src/utils/matchingAlgorithm';
import { 
  requestEmailOtp, 
  verifyEmailOtp, 
  consumeVerificationToken,
  testSmtpConnection
} from './src/server/emailService';

const PORT = 3000;

// Resolve persistent database file path with robust fallback checks
function getDatabaseFilePath(): string {
  if (process.env.DB_FILE_PATH) return process.env.DB_FILE_PATH;
  
  const candidates = [
    path.join(process.cwd(), 'server-db.json'),
    path.join(process.cwd(), 'dist', 'server-db.json'),
    path.join(__dirname, 'server-db.json'),
    path.join(__dirname, '..', 'server-db.json')
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
interface DatabaseSchema {
  users: User[];
  items: Item[];
  claims: Claim[];
  messages: Message[];
  activities: ActivityLog[];
  moderation: ModerationReport[];
  locations: CampusLocation[];
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
        locations: (Array.isArray(data.locations) && data.locations.length > 0) ? data.locations : INITIAL_LOCATIONS
      };
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
    locations: INITIAL_LOCATIONS
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
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User ID required.' });
      return;
    }
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found in persistent database.' });
      return;
    }
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
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

    const { password: _, ...safeUser } = student;
    res.json({ success: true, user: safeUser });
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

    const { password: _, ...safeUser } = staff;
    res.json({ success: true, user: safeUser });
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

    if (!admin) {
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

    const { password: _, ...safeUser } = admin;
    res.json({ success: true, user: safeUser });
  });

  // ----------------------------------------------------
  // 5. USERS LIST & STATS (Real Database Stats Only)
  // ----------------------------------------------------
  app.get('/api/users', (req: Request, res: Response) => {
    // Return sanitized users without passwords and without AI avatars
    const safeUsers = db.users.map(({ password: _, avatar: __, ...u }) => u);
    res.json(safeUsers);
  });

  app.get('/api/stats', (req: Request, res: Response) => {
    // Requirements: Dashboard counts/statistics must exclude deleted reports
    const activeItems = db.items.filter(i => !i.deleted);
    const lostCount = activeItems.filter(i => i.type === 'LOST').length;
    const foundCount = activeItems.filter(i => i.type === 'FOUND').length;
    const recoveredCount = activeItems.filter(i => i.status === 'RECOVERED').length;
    const claimsCount = db.claims.length;
    const studentsCount = db.users.filter(u => u.role === 'student').length;
    const staffCount = db.users.filter(u => u.role === 'staff').length;

    res.json({
      lostItems: lostCount,
      foundItems: foundCount,
      recoveredItems: recoveredCount,
      totalClaims: claimsCount,
      totalStudents: studentsCount,
      totalStaff: staffCount,
      totalUsers: db.users.length,
      deletedItems: db.items.filter(i => i.deleted).length
    });
  });

  // ----------------------------------------------------
  // 6. REAL ITEMS MANAGEMENT & ADMIN SOFT DELETE
  // ----------------------------------------------------
  app.get('/api/items', (req: Request, res: Response) => {
    const adminId = (req.query.adminId as string) || (req.headers['x-admin-id'] as string) || (req.headers['x-user-id'] as string);
    const includeDeleted = req.query.includeDeleted === 'true';

    // Verify if requester is an actual authenticated admin
    const isAdmin = adminId ? db.users.some(u => (u.id === adminId || u.email === adminId) && u.role === 'admin') : false;

    if (isAdmin && includeDeleted) {
      // Admin requesting all items including soft-deleted ones
      res.json(db.items);
    } else {
      // Normal students, staff, and public visitors strictly never receive deleted items
      res.json(db.items.filter(item => !item.deleted));
    }
  });

  app.get('/api/items/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req.query.adminId as string) || (req.headers['x-admin-id'] as string) || (req.headers['x-user-id'] as string);
    const isAdmin = adminId ? db.users.some(u => (u.id === adminId || u.email === adminId) && u.role === 'admin') : false;

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
    saveDatabase(db);
    res.json({ success: true, item: db.items[index] });
  });

  // Verify item listing by Admin
  app.post('/api/items/:id/verify', (req: Request, res: Response) => {
    const { id } = req.params;
    const { adminId } = req.body;

    // Authenticate Admin
    const adminUser = db.users.find(u => u.id === adminId && u.role === 'admin');
    if (!adminUser) {
      res.status(403).json({ success: false, error: 'Unauthorized. Only Campus Administrators can verify reports.' });
      return;
    }

    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found.' });
      return;
    }

    item.isVerifiedByAdmin = true;
    item.verificationStatus = 'VERIFIED';
    item.verifiedBy = adminUser.name;
    item.verifiedAt = new Date().toISOString();

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: adminUser.id,
      title: 'Item Listing Verified',
      description: `Listing "${item.itemName}" was verified by ${adminUser.name}.`,
      timestamp: new Date().toISOString(),
      type: 'STATUS'
    };
    db.activities.unshift(log);

    saveDatabase(db);
    res.json({ success: true, item });
  });

  // Reject item listing by staff/admin
  app.post('/api/items/:id/reject', (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, adminId } = req.body;

    // Authenticate Admin
    const adminUser = db.users.find(u => u.id === adminId && u.role === 'admin');
    if (!adminUser) {
      res.status(403).json({ success: false, error: 'Unauthorized. Only Campus Administrators can reject reports.' });
      return;
    }

    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found.' });
      return;
    }

    item.verificationStatus = 'REJECTED';
    item.verifiedBy = adminUser.name;
    item.verifiedAt = new Date().toISOString();
    const note = `Admin Note: ${reason || 'Details could not be verified'}`;
    item.additionalInfo = item.additionalInfo ? `${item.additionalInfo} | ${note}` : note;

    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: adminUser.id,
      title: 'Item Listing Rejected',
      description: `Listing "${item.itemName}" was rejected by ${adminUser.name}. Reason: ${reason || 'Unverified'}`,
      timestamp: new Date().toISOString(),
      type: 'STATUS'
    };
    db.activities.unshift(log);

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

  // Handler for Admin Soft Delete
  const handleSoftDelete = (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.body?.adminId || (req.query?.adminId as string) || (req.headers['x-admin-id'] as string) || (req.headers['x-user-id'] as string);

    // SECURITY: Verify that the requester is an actual authenticated ADMIN in the database
    const adminUser = db.users.find(u => (u.id === adminId || u.email === adminId) && u.role === 'admin');
    if (!adminUser) {
      res.status(403).json({ 
        success: false, 
        error: 'Unauthorized. Only certified Campus Administrators can delete reports.' 
      });
      return;
    }

    const item = db.items.find(i => i.id === id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Report not found in database.' });
      return;
    }

    // SOFT DELETE: Flag as deleted, record timestamp and admin user ID
    item.deleted = true;
    item.deletedAt = new Date().toISOString();
    item.deletedBy = adminUser.id;

    // Add activity log
    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: adminUser.id,
      title: `Report Soft-Deleted by Admin`,
      description: `Admin ${adminUser.name} soft-deleted ${item.type} listing "${item.itemName}" (ID: ${item.id}).`,
      timestamp: new Date().toISOString(),
      type: 'MODERATION'
    };
    db.activities.unshift(log);

    saveDatabase(db);
    res.json({ 
      success: true, 
      message: `Report "${item.itemName}" successfully soft-deleted.`, 
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

    // SECURITY: Verify that the requester is an actual authenticated ADMIN in the database
    const adminUser = db.users.find(u => (u.id === adminId || u.email === adminId) && u.role === 'admin');
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

  const checkAdminAuth = (req: Request, res: Response) => {
    const adminId = req.headers['x-admin-id'] as string;
    const adminUser = db.users.find(u => u.id === adminId && u.role === 'admin');
    if (!adminUser) {
      res.status(403).json({ success: false, error: 'Forbidden: Admin access required.' });
      return null;
    }
    return adminUser;
  };

  app.put('/api/admin/users/:userId/block', (req: Request, res: Response) => {
    if (!checkAdminAuth(req, res)) return;
    const { userId } = req.params;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) { res.status(404).json({ success: false, error: 'User not found.' }); return; }
    if (targetUser.role === 'admin') { res.status(403).json({ success: false, error: 'Cannot block an admin account.' }); return; }
    
    targetUser.isBlocked = true;
    saveDatabase(db);
    res.json({ success: true, user: targetUser });
  });

  app.put('/api/admin/users/:userId/unblock', (req: Request, res: Response) => {
    if (!checkAdminAuth(req, res)) return;
    const { userId } = req.params;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) { res.status(404).json({ success: false, error: 'User not found.' }); return; }
    
    targetUser.isBlocked = false;
    saveDatabase(db);
    res.json({ success: true, user: targetUser });
  });

  app.put('/api/admin/users/:userId/restrict', (req: Request, res: Response) => {
    if (!checkAdminAuth(req, res)) return;
    const { userId } = req.params;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) { res.status(404).json({ success: false, error: 'User not found.' }); return; }
    if (targetUser.role === 'admin') { res.status(403).json({ success: false, error: 'Cannot restrict an admin account.' }); return; }
    
    targetUser.isRestricted = true;
    saveDatabase(db);
    res.json({ success: true, user: targetUser });
  });

  app.put('/api/admin/users/:userId/unrestrict', (req: Request, res: Response) => {
    if (!checkAdminAuth(req, res)) return;
    const { userId } = req.params;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) { res.status(404).json({ success: false, error: 'User not found.' }); return; }
    
    targetUser.isRestricted = false;
    saveDatabase(db);
    res.json({ success: true, user: targetUser });
  });

  app.delete('/api/admin/users/:userId', (req: Request, res: Response) => {
    if (!checkAdminAuth(req, res)) return;
    const { userId } = req.params;
    const targetUser = db.users.find(u => u.id === userId);
    if (!targetUser) { res.status(404).json({ success: false, error: 'User not found.' }); return; }
    if (targetUser.role === 'admin') { res.status(403).json({ success: false, error: 'Cannot delete an admin account.' }); return; }

    // Hard delete user
    db.users = db.users.filter(u => u.id !== userId);
    // Mark items as deleted to prevent orphan references
    db.items = db.items.map(i => i.userId === userId ? { ...i, deleted: true } : i);
    // Remove claims tied to this user to avoid broken claims state
    db.claims = db.claims.filter(c => c.claimantId !== userId && c.ownerId !== userId);
    
    saveDatabase(db);
    res.json({ success: true, message: 'User deleted successfully.' });
  });

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
  // 12. MATCHES ENGINE (Server Calculated)
  // ----------------------------------------------------
  app.get('/api/matches', (req: Request, res: Response) => {
    const activeItems = db.items.filter(i => !i.deleted);
    const lostItems = activeItems.filter(i => i.type === 'LOST' && i.status !== 'RECOVERED');
    const foundItems = activeItems.filter(i => i.type === 'FOUND' && i.status !== 'RECOVERED');

    const matchesList: any[] = [];
    for (const lost of lostItems) {
      for (const found of foundItems) {
        const scoreDetails = calculateMatchScore(lost, found);
        if (scoreDetails.isPossibleMatch) {
          matchesList.push({
            lostItemId: lost.id,
            foundItemId: found.id,
            lostItem: lost,
            foundItem: found,
            ...scoreDetails
          });
        }
      }
    }

    res.json(matchesList);
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
    const distPath = path.join(process.cwd(), 'dist');
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
