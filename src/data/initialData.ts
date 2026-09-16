import { Item, User, Message, ModerationReport, Claim, ActivityLog, CampusLocation } from '../types';

export const INITIAL_LOCATIONS: CampusLocation[] = [
  // Computer Science Department (Ismail Yusuf College)
  { id: 'loc-cs-1', area: 'Computer Science Department', name: 'CS1', isActive: true, description: 'Computer Science Classroom 1' },
  { id: 'loc-cs-2', area: 'Computer Science Department', name: 'CS2', isActive: true, description: 'Computer Science Classroom 2' },
  { id: 'loc-cs-laba', area: 'Computer Science Department', name: 'Lab A', isActive: true, description: 'Computer Science Laboratory A' },
  { id: 'loc-cs-labb', area: 'Computer Science Department', name: 'Lab B', isActive: true, description: 'Computer Science Laboratory B' },
  { id: 'loc-cs-staff', area: 'Computer Science Department', name: 'Computer Science Staff Room / Staff Area', isActive: true, description: 'Faculty & Department Staff Area' },
  { id: 'loc-cs-office', area: 'Computer Science Department', name: 'Computer Science Department Office', isActive: true, description: 'Computer Science Department Administration' },
  
  // General Campus Areas (Ismail Yusuf College, Jogeshwari)
  { id: 'loc-lib', area: 'General Campus & Amenities', name: 'College Library & Reading Hall', isActive: true, description: 'Central Library Reference & Study Sections' },
  { id: 'loc-canteen', area: 'General Campus & Amenities', name: 'College Canteen', isActive: true, description: 'Main Student Canteen & Dining Area' },
  { id: 'loc-admin-bldg', area: 'General Campus & Amenities', name: 'Main Administrative Building', isActive: true, description: 'Principal & Registrar Office Wing' },
  { id: 'loc-security', area: 'General Campus & Amenities', name: 'Campus Security Cabin (Main Gate)', isActive: true, description: 'Main Entrance Security & In-charge Post' },
  { id: 'loc-audi', area: 'General Campus & Amenities', name: 'Main Auditorium', isActive: true, description: 'Auditorium Hall & Seminar Rooms' },
  { id: 'loc-gymkhana', area: 'General Campus & Amenities', name: 'Gymkhana / Sports Ground', isActive: true, description: 'Athletic Ground & Indoor Sports Pavilion' },
  { id: 'loc-sci-wing', area: 'General Campus & Amenities', name: 'Science Wing Laboratories', isActive: true, description: 'Physics & Chemistry Practical Labs' }
];

export const INITIAL_USERS: User[] = [
  // Sole Authorized Campus Administrator (Mayur Suryavanshi)
  {
    id: 'user-admin-mayur',
    name: 'Mayur Suryavanshi',
    studentId: 'IYC-ADMIN-01',
    designation: 'Campus System Administrator',
    department: 'Administration & Campus Operations',
    role: 'admin',
    email: 'suryavanshimayur187@gmail.com',
    phone: '+91 98765 43210',
    password: 'admin123',
    createdAt: '2026-08-01'
  }
];

// Pure empty initial data — no fake/demo items, claims, messages, activities, or moderation reports
export const INITIAL_ITEMS: Item[] = [];
export const INITIAL_MESSAGES: Message[] = [];
export const INITIAL_CLAIMS: Claim[] = [];
export const INITIAL_ACTIVITIES: ActivityLog[] = [];
export const INITIAL_MODERATION: ModerationReport[] = [];
