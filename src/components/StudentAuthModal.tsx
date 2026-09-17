import React, { useState, useEffect } from 'react';
import { useApp, AuthTab } from '../context/AppContext';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  UserPlus, 
  LogIn, 
  School, 
  AlertCircle,
  Lock,
  Mail,
  Phone,
  User,
  Eye,
  EyeOff,
  Briefcase,
  KeyRound,
  RefreshCw,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { 
  COLLEGE_COURSES, 
  STUDY_YEARS, 
  validateStudentRegistration,
  validateStudentName
} from '../utils/studentValidation';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: AuthTab;
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({ 
  isOpen, 
  onClose,
  defaultTab = 'student-login' 
}) => {
  const { 
    authModalTab,
    registerStudent, 
    registerStaff,
    loginStudent,
    loginStaff,
    loginAdmin,
    setCurrentPage
  } = useApp();

  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab);

  useEffect(() => {
    if (authModalTab) {
      setActiveTab(authModalTab);
    }
  }, [authModalTab]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Student Login State
  const [loginStudentId, setLoginStudentId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [studentLoginError, setStudentLoginError] = useState('');

  // Clear all login and register form details
  const resetAllForms = () => {
    setLoginStudentId('');
    setLoginPassword('');
    setShowLoginPassword(false);
    setStudentLoginError('');

    setRegFullName('');
    setRegStudyYear('F');
    setRegCourseCode('CS');
    setRegStudentId('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegPhone('');
    setShowRegPassword(false);
    setRegErrors({});
    setRegGeneralError('');
    setRegSuccessMessage('');

    // Reset student OTP
    setStudentOtpCode('');
    setStudentOtpSent(false);
    setStudentOtpLoading(false);
    setStudentOtpVerifyLoading(false);
    setStudentOtpCooldown(0);
    setStudentEmailVerified(false);
    setStudentVerificationToken('');
    setStudentOtpError('');
    setStudentOtpSuccess('');
    setStudentPreviewUrl(null);

    setStaffEmail('');
    setStaffPassword('');
    setShowStaffPassword(false);
    setStaffError('');
    setStaffRegName('');
    setStaffRegEmail('');
    setStaffRegDepartment('Computer Science');
    setStaffRegId('');
    setStaffRegPassword('');
    setStaffRegConfirmPassword('');
    setStaffRegSuccess('');
    setStaffRegErrors({});

    // Reset staff OTP
    setStaffOtpCode('');
    setStaffOtpSent(false);
    setStaffOtpLoading(false);
    setStaffOtpVerifyLoading(false);
    setStaffOtpCooldown(0);
    setStaffEmailVerified(false);
    setStaffVerificationToken('');
    setStaffOtpError('');
    setStaffOtpSuccess('');
    setStaffPreviewUrl(null);

    setAdminIdentifier('');
    setAdminPassword('');
    setShowAdminPassword(false);
    setAdminError('');
  };

  const handleModalClose = () => {
    resetAllForms();
    onClose();
  };

  // Student Register State
  const [regFullName, setRegFullName] = useState('');
  const [regStudyYear, setRegStudyYear] = useState('F');
  const [regCourseCode, setRegCourseCode] = useState('CS');
  const [regStudentId, setRegStudentId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regGeneralError, setRegGeneralError] = useState('');
  const [regSuccessMessage, setRegSuccessMessage] = useState('');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Student OTP Verification State
  const [studentOtpCode, setStudentOtpCode] = useState('');
  const [studentOtpSent, setStudentOtpSent] = useState(false);
  const [studentOtpLoading, setStudentOtpLoading] = useState(false);
  const [studentOtpVerifyLoading, setStudentOtpVerifyLoading] = useState(false);
  const [studentOtpCooldown, setStudentOtpCooldown] = useState(0);
  const [studentEmailVerified, setStudentEmailVerified] = useState(false);
  const [studentVerificationToken, setStudentVerificationToken] = useState('');
  const [studentOtpError, setStudentOtpError] = useState('');
  const [studentOtpSuccess, setStudentOtpSuccess] = useState('');
  const [studentPreviewUrl, setStudentPreviewUrl] = useState<string | null>(null);

  // Staff Portal State (Sign In vs Register toggle)
  const [staffMode, setStaffMode] = useState<'signin' | 'register'>('signin');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffError, setStaffError] = useState('');

  // Staff Register fields
  const [staffRegName, setStaffRegName] = useState('');
  const [staffRegEmail, setStaffRegEmail] = useState('');
  const [staffRegDepartment, setStaffRegDepartment] = useState('Computer Science');
  const [staffRegId, setStaffRegId] = useState('');
  const [staffRegPassword, setStaffRegPassword] = useState('');
  const [staffRegConfirmPassword, setStaffRegConfirmPassword] = useState('');
  const [staffRegSuccess, setStaffRegSuccess] = useState('');
  const [staffRegErrors, setStaffRegErrors] = useState<Record<string, string>>({});

  // Staff OTP Verification State
  const [staffOtpCode, setStaffOtpCode] = useState('');
  const [staffOtpSent, setStaffOtpSent] = useState(false);
  const [staffOtpLoading, setStaffOtpLoading] = useState(false);
  const [staffOtpVerifyLoading, setStaffOtpVerifyLoading] = useState(false);
  const [staffOtpCooldown, setStaffOtpCooldown] = useState(0);
  const [staffEmailVerified, setStaffEmailVerified] = useState(false);
  const [staffVerificationToken, setStaffVerificationToken] = useState('');
  const [staffOtpError, setStaffOtpError] = useState('');
  const [staffOtpSuccess, setStaffOtpSuccess] = useState('');
  const [staffPreviewUrl, setStaffPreviewUrl] = useState<string | null>(null);

  // Countdown timers for OTP cooldown
  useEffect(() => {
    if (studentOtpCooldown <= 0) return;
    const interval = setInterval(() => {
      setStudentOtpCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [studentOtpCooldown]);

  useEffect(() => {
    if (staffOtpCooldown <= 0) return;
    const interval = setInterval(() => {
      setStaffOtpCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [staffOtpCooldown]);

  // Admin Login State
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState('');

  if (!isOpen) return null;

  // Expected Student ID prefix helper
  const expectedPrefix = `26${regStudyYear}${regCourseCode}`;

  // ----------------------------------------------------
  // STUDENT LOGIN HANDLER
  // ----------------------------------------------------
  const handleStudentLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoginError('');

    const cleanId = loginStudentId.trim().toUpperCase();
    if (!cleanId) {
      setStudentLoginError('Please enter your Student ID (e.g. 26FCS01).');
      return;
    }

    if (!loginPassword.trim()) {
      setStudentLoginError('Please enter your password.');
      return;
    }

    // Try backend authentication
    try {
      const resp = await fetch('/api/auth/login-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: cleanId, password: loginPassword.trim() })
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const result = loginStudent(cleanId, loginPassword.trim(), data.user);
        if (result.success) {
          resetAllForms();
          onClose();
          return;
        }
      } else {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 404) {
          setStudentLoginError('No student account found with this Student ID.');
          return;
        }
        if (resp.status === 401) {
          setStudentLoginError('Incorrect password. Please verify and try again.');
          return;
        }
        if (errData.error) {
          setStudentLoginError(errData.error);
          return;
        }
      }
    } catch {
      // Offline fallback
    }

    const localResult = loginStudent(cleanId, loginPassword.trim());
    if (localResult.success) {
      resetAllForms();
      onClose();
    } else {
      setStudentLoginError(localResult.error || 'Login failed. Please check your credentials.');
    }
  };

  // ----------------------------------------------------
  // OTP HANDLERS: STUDENT EMAIL VERIFICATION
  // ----------------------------------------------------
  const handleSendStudentOtp = async () => {
    const trimmedEmail = regEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setRegErrors(prev => ({ ...prev, email: 'Please enter your email address first.' }));
      setStudentOtpError('Please enter your email address first.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRegErrors(prev => ({ ...prev, email: 'Please enter a valid email address (e.g. name@gmail.com).' }));
      setStudentOtpError('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }

    setStudentOtpLoading(true);
    setStudentOtpError('');
    setStudentOtpSuccess('');
    setStudentPreviewUrl(null);
    setRegErrors(prev => {
      const next = { ...prev };
      delete next.email;
      return next;
    });

    try {
      const resp = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setStudentOtpError(data.error || 'Failed to send verification code.');
        if (data.cooldownRemaining) {
          setStudentOtpCooldown(data.cooldownRemaining);
        }
      } else {
        setStudentOtpSent(true);
        setStudentOtpCooldown(60);
        setStudentOtpSuccess(data.message || '4-digit OTP sent to your email.');
        if (data.previewUrl) {
          setStudentPreviewUrl(data.previewUrl);
        }
      }
    } catch {
      setStudentOtpError('Network error. Unable to reach verification service.');
    } finally {
      setStudentOtpLoading(false);
    }
  };

  const handleVerifyStudentOtp = async () => {
    const trimmedEmail = regEmail.trim().toLowerCase();
    const cleanOtp = studentOtpCode.trim();

    if (!cleanOtp || cleanOtp.length !== 4) {
      setStudentOtpError('Please enter the 4-digit verification code.');
      return;
    }

    setStudentOtpVerifyLoading(true);
    setStudentOtpError('');

    try {
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, otp: cleanOtp })
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setStudentOtpError(data.error || 'Verification code is invalid or expired.');
      } else {
        setStudentEmailVerified(true);
        setStudentVerificationToken(data.verificationToken);
        setStudentOtpSuccess('Email verified successfully! You can now complete registration.');
        setStudentOtpError('');
      }
    } catch {
      setStudentOtpError('Network error. Could not verify code.');
    } finally {
      setStudentOtpVerifyLoading(false);
    }
  };

  // ----------------------------------------------------
  // OTP HANDLERS: STAFF EMAIL VERIFICATION
  // ----------------------------------------------------
  const handleSendStaffOtp = async () => {
    const trimmedEmail = staffRegEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setStaffError('Please enter your staff email address first.');
      setStaffOtpError('Please enter your staff email address first.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStaffError('Please enter a valid email address.');
      setStaffOtpError('Please enter a valid email address.');
      return;
    }

    setStaffOtpLoading(true);
    setStaffOtpError('');
    setStaffOtpSuccess('');
    setStaffPreviewUrl(null);

    try {
      const resp = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setStaffOtpError(data.error || 'Failed to send verification code.');
        if (data.cooldownRemaining) {
          setStaffOtpCooldown(data.cooldownRemaining);
        }
      } else {
        setStaffOtpSent(true);
        setStaffOtpCooldown(60);
        setStaffOtpSuccess(data.message || '4-digit OTP sent to your email.');
        if (data.previewUrl) {
          setStaffPreviewUrl(data.previewUrl);
        }
      }
    } catch {
      setStaffOtpError('Network error. Unable to reach verification service.');
    } finally {
      setStaffOtpLoading(false);
    }
  };

  const handleVerifyStaffOtp = async () => {
    const trimmedEmail = staffRegEmail.trim().toLowerCase();
    const cleanOtp = staffOtpCode.trim();

    if (!cleanOtp || cleanOtp.length !== 4) {
      setStaffOtpError('Please enter the 4-digit verification code.');
      return;
    }

    setStaffOtpVerifyLoading(true);
    setStaffOtpError('');

    try {
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, otp: cleanOtp })
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setStaffOtpError(data.error || 'Verification code is invalid or expired.');
      } else {
        setStaffEmailVerified(true);
        setStaffVerificationToken(data.verificationToken);
        setStaffOtpSuccess('Email verified successfully! You can now complete registration.');
        setStaffOtpError('');
      }
    } catch {
      setStaffOtpError('Network error. Could not verify code.');
    } finally {
      setStaffOtpVerifyLoading(false);
    }
  };

  // ----------------------------------------------------
  // STUDENT REGISTRATION HANDLER
  // ----------------------------------------------------
  const handleStudentRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrors({});
    setRegGeneralError('');
    setRegSuccessMessage('');

    const input = {
      name: regFullName.trim(),
      studentId: regStudentId.trim().toUpperCase(),
      studyYear: regStudyYear,
      courseCode: regCourseCode,
      email: regEmail.trim(),
      password: regPassword,
      confirmPassword: regConfirmPassword,
      phone: regPhone.trim()
    };

    // 1. FRONTEND VALIDATION
    const validation = validateStudentRegistration(input);
    if (!validation.isValid) {
      setRegErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      setRegGeneralError(firstError);
      return;
    }

    // Check that email has been verified with 4-digit OTP
    if (!studentEmailVerified || !studentVerificationToken) {
      setRegGeneralError('Email verification is required. Please verify your email with the 4-digit OTP code before completing registration.');
      setRegErrors(prev => ({ ...prev, email: 'Email verification with OTP is compulsory.' }));
      return;
    }

    setIsSubmittingStudent(true);

    // 2. BACKEND VALIDATION & CREATION
    try {
      const response = await fetch('/api/auth/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, verificationToken: studentVerificationToken })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsSubmittingStudent(false);
        if (data.field) {
          setRegErrors({ [data.field]: data.error });
        }
        setRegGeneralError(data.error || 'Registration rejected by server.');
        return;
      }

      // Also register into local context store
      registerStudent({ ...input, verificationToken: studentVerificationToken }, data.user);

      // Save ID to prefill login
      const registeredId = input.studentId;

      // 3. RESET THE ENTIRE REGISTRATION FORM (EVERY FIELD)
      resetAllForms();
      setIsSubmittingStudent(false);

      // 4. SHOW CLEAN SUCCESS MESSAGE
      setRegSuccessMessage('Registration successful! Your email has been verified. You can now sign in with your Student ID and password.');

      // 5. REDIRECT TO STUDENT LOGIN AFTER SUCCESS
      setTimeout(() => {
        setLoginStudentId(registeredId);
        setLoginPassword('');
        setStudentLoginError('');
        setActiveTab('student-login');
        setRegSuccessMessage('');
      }, 2000);

    } catch {
      setIsSubmittingStudent(false);
      setRegGeneralError('Network error. Could not connect to registration service.');
    }
  };

  // ----------------------------------------------------
  // STAFF LOGIN HANDLER (Email + Password)
  // ----------------------------------------------------
  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');

    const cleanEmail = staffEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setStaffError('Please enter your staff email address.');
      return;
    }

    if (!staffPassword.trim()) {
      setStaffError('Please enter your staff password.');
      return;
    }

    try {
      const resp = await fetch('/api/auth/login-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: staffPassword.trim() })
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const result = loginStaff(cleanEmail, staffPassword.trim(), data.user);
        if (result.success) {
          resetAllForms();
          onClose();
          setCurrentPage('staff-dashboard');
          return;
        }
      }
    } catch {
      // Offline fallback
    }

    const localResult = loginStaff(cleanEmail, staffPassword.trim());
    if (localResult.success) {
      resetAllForms();
      onClose();
      setCurrentPage('staff-dashboard');
    } else {
      setStaffError(localResult.error || 'Staff authentication failed.');
    }
  };

  // ----------------------------------------------------
  // STAFF REGISTRATION HANDLER
  // ----------------------------------------------------
  const handleStaffRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    setStaffRegSuccess('');

    const nameVal = validateStudentName(staffRegName);
    if (!nameVal.isValid) {
      setStaffError('Please enter a valid full name.');
      return;
    }

    const trimmedEmail = staffRegEmail.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStaffError('Please enter a valid email address.');
      return;
    }

    // Check that staff email has been verified with 4-digit OTP
    if (!staffEmailVerified || !staffVerificationToken) {
      setStaffError('Email verification is required. Please verify your email with the 4-digit OTP code before completing registration.');
      return;
    }

    if (!staffRegPassword || staffRegPassword.length < 6) {
      setStaffError('Password must be at least 6 characters long.');
      return;
    }

    if (staffRegPassword !== staffRegConfirmPassword) {
      setStaffError('Passwords do not match.');
      return;
    }

    const staffData = {
      name: nameVal.cleanedName,
      email: trimmedEmail,
      department: staffRegDepartment,
      staffId: staffRegId.trim() || 'Not Assigned',
      password: staffRegPassword,
      confirmPassword: staffRegConfirmPassword,
      verificationToken: staffVerificationToken
    };

    try {
      const resp = await fetch('/api/auth/register-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        if (data.field) {
          setStaffRegErrors({ [data.field]: data.error });
        }
        setStaffError(data.error || 'Staff registration failed.');
        return;
      }

      registerStaff(staffData, data.user);
      setStaffRegSuccess('Staff registration successful! You can now sign in with your email and password.');
      resetAllForms();
      setTimeout(() => {
        setStaffEmail(trimmedEmail);
        setStaffMode('signin');
        setStaffRegSuccess('');
      }, 1500);
    } catch {
      setStaffError('Server error while registering staff account.');
    }
  };

  // ----------------------------------------------------
  // ADMIN LOGIN HANDLER (Mayur Suryavanshi Authorized)
  // ----------------------------------------------------
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const clean = adminIdentifier.trim();
    if (!clean) {
      setAdminError('Please enter Admin Email or ID.');
      return;
    }

    if (!adminPassword.trim()) {
      setAdminError('Please enter admin password.');
      return;
    }

    try {
      const resp = await fetch('/api/auth/login-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: clean, password: adminPassword.trim() })
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const result = loginAdmin(clean, adminPassword.trim(), data.user);
        if (result.success) {
          resetAllForms();
          onClose();
          setCurrentPage('admin');
          return;
        }
      } else {
        const errData = await resp.json().catch(() => ({}));
        setAdminError(errData.error || 'Invalid administrator credentials.');
        return;
      }
    } catch {
      // Offline fallback
    }

    const localResult = loginAdmin(clean, adminPassword.trim());
    if (localResult.success) {
      resetAllForms();
      onClose();
      setCurrentPage('admin');
    } else {
      setAdminError(localResult.error || 'Admin credentials unverified.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        id="auth-modal-dialog"
        className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white p-6 relative">
          <button
            onClick={handleModalClose}
            id="auth-modal-close-btn"
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <School className="w-4 h-4 text-amber-400" />
            <span>Ismail Yusuf College • Jogeshwari (East)</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            FindIt Campus Portal
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Access your lost &amp; found dashboard, claim items, and verify reports safely.
          </p>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1.5 mt-5 bg-white/10 p-1.5 rounded-2xl backdrop-blur-xs">
            <button
              type="button"
              id="auth-tab-student-login"
              onClick={() => { setActiveTab('student-login'); setStudentLoginError(''); }}
              className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all ${
                activeTab === 'student-login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Student Login
            </button>
            <button
              type="button"
              id="auth-tab-student-register"
              onClick={() => { setActiveTab('student-register'); setRegGeneralError(''); }}
              className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all ${
                activeTab === 'student-register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              New Student
            </button>
            <button
              type="button"
              id="auth-tab-staff-login"
              onClick={() => { setActiveTab('staff-login'); setStaffError(''); }}
              className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all ${
                activeTab === 'staff-login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Staff Portal
            </button>
            <button
              type="button"
              id="auth-tab-admin-login"
              onClick={() => { setActiveTab('admin-login'); setAdminError(''); }}
              className={`py-2 px-2 rounded-xl text-xs font-bold text-center transition-all ${
                activeTab === 'admin-login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Admin Login
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">

          {/* TAB 1: STUDENT LOGIN */}
          {activeTab === 'student-login' && (
            <form onSubmit={handleStudentLoginSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <h3 className="text-lg font-bold text-slate-900">Student Sign In</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sign in using your IYC Student ID and password
                </p>
              </div>

              {studentLoginError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex flex-col space-y-2">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{studentLoginError}</span>
                  </div>
                  {studentLoginError.includes('No student account found') && (
                    <button
                      type="button"
                      id="login-switch-to-register-btn"
                      onClick={() => {
                        setActiveTab('student-register');
                        setStudentLoginError('');
                        setRegStudentId(loginStudentId.trim().toUpperCase());
                      }}
                      className="self-start text-xs font-bold text-blue-700 hover:underline bg-blue-100/60 px-2.5 py-1 rounded-lg mt-1 inline-flex items-center space-x-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Register New Student with {loginStudentId || 'this ID'}</span>
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="student-login-id"
                    value={loginStudentId}
                    onChange={e => setLoginStudentId(e.target.value.toUpperCase())}
                    placeholder="e.g. 26FCS01"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono text-sm tracking-wider uppercase"
                    required
                  />
                  <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Format: 26 + Year (F/S/T) + Course Code (CS, BT, BC, BA, SC, AF, MS) + Roll Number
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    id="student-login-password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="student-login-submit-btn"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In as Student</span>
              </button>

              <div className="text-center pt-2 text-xs text-slate-500">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  id="student-goto-register-btn"
                  onClick={() => setActiveTab('student-register')}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Register New Student
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: STUDENT REGISTRATION */}
          {activeTab === 'student-register' && (
            <form onSubmit={handleStudentRegisterSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <h3 className="text-lg font-bold text-slate-900">Student Registration</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register with your Ismail Yusuf College Student ID
                </p>
              </div>

              {regGeneralError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{regGeneralError}</span>
                </div>
              )}

              {regSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="font-semibold leading-relaxed">
                    {regSuccessMessage}
                  </div>
                </div>
              )}

              {/* 1. Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="student-register-name"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Mayur Suryavanshi"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${regErrors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-300'} text-sm focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {regErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1">{regErrors.name}</p>
                )}
              </div>

              {/* 2. Study Year & 3. Course Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Study Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="student-register-year"
                    value={regStudyYear}
                    onChange={e => setRegStudyYear(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    {STUDY_YEARS.map(y => (
                      <option key={y.code} value={y.code}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="student-register-course"
                    value={regCourseCode}
                    onChange={e => setRegCourseCode(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    {COLLEGE_COURSES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Student ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Student ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="student-register-id"
                    value={regStudentId}
                    onChange={e => setRegStudentId(e.target.value.toUpperCase())}
                    placeholder={`e.g. ${expectedPrefix}01`}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${regErrors.studentId ? 'border-red-400 bg-red-50/30' : 'border-slate-300'} font-mono text-sm tracking-wider uppercase focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {regErrors.studentId ? (
                  <p className="text-[11px] text-red-600 mt-1">{regErrors.studentId}</p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Required prefix: <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{expectedPrefix}</span> followed by roll number (e.g. {expectedPrefix}01).
                  </p>
                )}
              </div>

              {/* 5. Email Address (Compulsory with OTP verification) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Personal emails accepted (Gmail, Yahoo, etc.)
                  </span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      id="student-register-email"
                      value={regEmail}
                      onChange={e => {
                        setRegEmail(e.target.value);
                        if (studentEmailVerified) {
                          setStudentEmailVerified(false);
                          setStudentVerificationToken('');
                          setStudentOtpSent(false);
                          setStudentOtpSuccess('');
                        }
                      }}
                      placeholder="e.g. yourname@gmail.com"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                        studentEmailVerified 
                          ? 'border-emerald-400 bg-emerald-50/20 text-emerald-900'
                          : regErrors.email 
                            ? 'border-red-400 bg-red-50/30' 
                            : 'border-slate-300'
                      } text-sm focus:ring-2 focus:ring-blue-500`}
                      required
                    />
                    <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${studentEmailVerified ? 'text-emerald-500' : 'text-slate-400'}`} />
                  </div>

                  {studentEmailVerified ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Verified</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="student-send-otp-btn"
                      onClick={handleSendStudentOtp}
                      disabled={studentOtpLoading || studentOtpCooldown > 0}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border shrink-0 transition-colors flex items-center gap-1.5 ${
                        studentOtpCooldown > 0
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm'
                      }`}
                    >
                      {studentOtpLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : studentOtpCooldown > 0 ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Resend ({studentOtpCooldown}s)</span>
                        </>
                      ) : studentOtpSent ? (
                        <span>Resend OTP</span>
                      ) : (
                        <span>Send OTP</span>
                      )}
                    </button>
                  )}
                </div>

                {regErrors.email && (
                  <p className="text-[11px] text-red-600">{regErrors.email}</p>
                )}

                {/* OTP Verification Box */}
                {studentOtpSent && !studentEmailVerified && (
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                        <span>Enter 4-Digit Verification Code</span>
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        Expires in 10 mins
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug">
                      We sent a 4-digit code to <span className="font-semibold text-slate-800">{regEmail}</span>. Enter it below to verify your email.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="student-otp-code-input"
                        value={studentOtpCode}
                        onChange={e => setStudentOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        maxLength={4}
                        className="w-32 text-center font-mono font-bold tracking-widest text-base py-2 px-3 rounded-xl border border-blue-300 focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <button
                        type="button"
                        id="student-verify-otp-btn"
                        onClick={handleVerifyStudentOtp}
                        disabled={studentOtpVerifyLoading || studentOtpCode.length !== 4}
                        className="flex-1 py-2 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {studentOtpVerifyLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify Code</span>
                          </>
                        )}
                      </button>
                    </div>

                    {studentOtpError && (
                      <p className="text-[11px] text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{studentOtpError}</span>
                      </p>
                    )}

                    {studentPreviewUrl && (
                      <div className="pt-1 border-t border-blue-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Testing mailbox available:</span>
                        <a 
                          href={studentPreviewUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-bold text-blue-700 hover:underline flex items-center gap-1"
                        >
                          <span>Open Test Email</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {studentEmailVerified && (
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Email confirmed. 4-digit OTP successfully verified.</span>
                  </p>
                )}
              </div>

              {/* 6. Password & 7. Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      id="student-register-password"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border ${regErrors.password ? 'border-red-400 bg-red-50/30' : 'border-slate-300'} text-xs focus:ring-2 focus:ring-blue-500`}
                      required
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {regErrors.password && (
                    <p className="text-[10px] text-red-600 mt-1">{regErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      id="student-register-confirm-password"
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border ${regErrors.confirmPassword ? 'border-red-400 bg-red-50/30' : 'border-slate-300'} text-xs focus:ring-2 focus:ring-blue-500`}
                      required
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {regErrors.confirmPassword && (
                    <p className="text-[10px] text-red-600 mt-1">{regErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* 8. Phone (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Phone Number <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="student-register-phone"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                id="student-register-submit-btn"
                disabled={isSubmittingStudent}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmittingStudent ? 'Validating Account...' : 'Complete Student Registration'}</span>
              </button>

              <div className="text-center pt-1 text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  id="student-switch-to-login-btn"
                  onClick={() => setActiveTab('student-login')}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: STAFF & FACULTY PORTAL */}
          {activeTab === 'staff-login' && (
            <div className="space-y-4">
              <div className="text-center pb-1">
                <h3 className="text-lg font-bold text-slate-900">Faculty &amp; Staff Portal</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ismail Yusuf College Faculty &amp; Staff Access
                </p>

                {/* Sub toggle: Sign In vs Register */}
                <div className="flex justify-center mt-3 bg-slate-100 p-1 rounded-xl max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => { setStaffMode('signin'); setStaffError(''); }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      staffMode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Faculty Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStaffMode('register'); setStaffError(''); }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      staffMode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Register Staff
                  </button>
                </div>
              </div>

              {staffError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{staffError}</span>
                </div>
              )}

              {staffRegSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{staffRegSuccess}</span>
                </div>
              )}

              {staffMode === 'signin' ? (
                /* STAFF SIGN IN (Email + Password) */
                <form onSubmit={handleStaffLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Staff Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="staff-login-email"
                        value={staffEmail}
                        onChange={e => setStaffEmail(e.target.value)}
                        placeholder="e.g. faculty.member@iyc.edu.in"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showStaffPassword ? 'text' : 'password'}
                        id="staff-login-password"
                        value={staffPassword}
                        onChange={e => setStaffPassword(e.target.value)}
                        placeholder="Enter your staff password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="staff-login-submit-btn"
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize &amp; Open Faculty Hub</span>
                  </button>
                </form>
              ) : (
                /* STAFF REGISTRATION */
                <form onSubmit={handleStaffRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="staff-reg-name"
                        value={staffRegName}
                        onChange={e => setStaffRegName(e.target.value)}
                        placeholder="e.g. Prof. Satyam Sharma"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Staff Email (Compulsory with OTP verification) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Staff Email Address <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Personal or college emails accepted
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="email"
                          id="staff-reg-email"
                          value={staffRegEmail}
                          onChange={e => {
                            setStaffRegEmail(e.target.value);
                            if (staffEmailVerified) {
                              setStaffEmailVerified(false);
                              setStaffVerificationToken('');
                              setStaffOtpSent(false);
                              setStaffOtpSuccess('');
                            }
                          }}
                          placeholder="e.g. faculty@gmail.com or name@iyc.edu.in"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                            staffEmailVerified 
                              ? 'border-emerald-400 bg-emerald-50/20 text-emerald-900' 
                              : staffRegErrors.email
                                ? 'border-red-400 bg-red-50/30'
                                : 'border-slate-300'
                          } text-sm focus:ring-2 focus:ring-blue-500`}
                          required
                        />
                        <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${staffEmailVerified ? 'text-emerald-500' : 'text-slate-400'}`} />
                      </div>

                      {staffEmailVerified ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          id="staff-send-otp-btn"
                          onClick={handleSendStaffOtp}
                          disabled={staffOtpLoading || staffOtpCooldown > 0}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold border shrink-0 transition-colors flex items-center gap-1.5 ${
                            staffOtpCooldown > 0
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm'
                          }`}
                        >
                          {staffOtpLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : staffOtpCooldown > 0 ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Resend ({staffOtpCooldown}s)</span>
                            </>
                          ) : staffOtpSent ? (
                            <span>Resend OTP</span>
                          ) : (
                            <span>Send OTP</span>
                          )}
                        </button>
                      )}
                    </div>
                    {staffRegErrors.email && (
                      <p className="text-[11px] text-red-600">{staffRegErrors.email}</p>
                    )}

                    {/* Staff OTP verification container */}
                    {staffOtpSent && !staffEmailVerified && (
                      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-blue-900">
                            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                            <span>Enter 4-Digit Verification Code</span>
                          </div>
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            Expires in 10 mins
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-snug">
                          We sent a 4-digit code to <span className="font-semibold text-slate-800">{staffRegEmail}</span>. Enter it below to verify your email.
                        </p>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="staff-otp-code-input"
                            value={staffOtpCode}
                            onChange={e => setStaffOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="••••"
                            maxLength={4}
                            className="w-32 text-center font-mono font-bold tracking-widest text-base py-2 px-3 rounded-xl border border-blue-300 focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                          <button
                            type="button"
                            id="staff-verify-otp-btn"
                            onClick={handleVerifyStaffOtp}
                            disabled={staffOtpVerifyLoading || staffOtpCode.length !== 4}
                            className="flex-1 py-2 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {staffOtpVerifyLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify Code</span>
                              </>
                            )}
                          </button>
                        </div>

                        {staffOtpError && (
                          <p className="text-[11px] text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{staffOtpError}</span>
                          </p>
                        )}

                        {staffPreviewUrl && (
                          <div className="pt-1 border-t border-blue-200/60 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Testing mailbox available:</span>
                            <a 
                              href={staffPreviewUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="font-bold text-blue-700 hover:underline flex items-center gap-1"
                            >
                              <span>Open Test Email</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {staffEmailVerified && (
                      <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Email confirmed. 4-digit OTP successfully verified.</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="staff-reg-dept"
                        value={staffRegDepartment}
                        onChange={e => setStaffRegDepartment(e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Staff ID <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        id="staff-reg-id"
                        value={staffRegId}
                        onChange={e => setStaffRegId(e.target.value)}
                        placeholder="None / Not Assigned"
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="staff-reg-password"
                        value={staffRegPassword}
                        onChange={e => setStaffRegPassword(e.target.value)}
                        placeholder="Min. 6 chars"
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="staff-reg-confirm"
                        value={staffRegConfirmPassword}
                        onChange={e => setStaffRegConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="staff-reg-submit-btn"
                    className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 mt-2"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Register Faculty Account</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: ADMIN PORTAL SIGN IN */}
          {activeTab === 'admin-login' && (
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <h3 className="text-lg font-bold text-slate-900">Campus Administrator Console</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter authorized administrator credentials to continue
                </p>
              </div>

              {adminError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{adminError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Administrator Email / ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="admin-login-email"
                    value={adminIdentifier}
                    onChange={e => setAdminIdentifier(e.target.value)}
                    placeholder="Enter admin email or ID"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    id="admin-login-password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="admin-login-submit-btn"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Enter Admin Console</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
