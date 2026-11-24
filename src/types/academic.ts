import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'docente' | 'estudante';
export type AccentColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
export type PostType = 'comunicado' | 'conteudo' | 'link' | 'aviso_avaliacao';
export type PostPriority = 'normal' | 'importante' | 'urgente';
export type ResourceCategory = 'site' | 'documento' | 'video' | 'repositorio' | 'ferramenta';
export type AssessmentCategory = 'prova' | 'frequencia' | 'teste' | 'trabalho' | 'oral' | 'exame';
export type ResultFormat = 'foto' | 'pdf';
export type AcademicYear = '1.º Ano' | '2.º Ano' | '3.º Ano' | '4.º Ano' | '5.º Ano';

export const ACADEMIC_YEARS: AcademicYear[] = [
  '1.º Ano',
  '2.º Ano',
  '3.º Ano',
  '4.º Ano',
  '5.º Ano',
];

export const BLUEPRINT_LIMITS = {
  idMax: 128,
  idPattern: /^[a-zA-Z0-9_-]+$/,
  joinCodePattern: /^[A-Z0-9]{4,16}$/,
  displayNameMax: 100,
  departmentMax: 100,
  schoolMax: 120,
  courseMax: 100,
  studentCodeMax: 40,
  classTitleMin: 2,
  classTitleMax: 120,
  classCodeMin: 2,
  classCodeMax: 32,
  semesterMax: 40,
  scheduleMax: 100,
  roomMax: 80,
  urlMax: 500,
  meetingUrlMax: 300,
  classDescriptionMax: 1000,
  postTitleMin: 2,
  postTitleMax: 160,
  postBodyMax: 5000,
  moduleMax: 80,
  externalLabelMax: 100,
  resourceTitleMax: 140,
  resourceDescriptionMax: 600,
  assignmentTitleMax: 140,
  assignmentDescriptionMax: 3000,
  dueDateMax: 40,
  submissionNotesMax: 2000,
  feedbackMax: 1000,
  commentMax: 1000,
  attachmentMaxBytes: 5000000,
  attachmentNameMax: 200,
  assessmentTitleMax: 140,
  assessmentNotesMax: 600,
  gradeRemarksMax: 400,
  resultTitleMax: 160,
  resultNotesMax: 2000,
  photoMax: 100000,
  chatMessageMax: 1500,
  academicTitleMax: 120,
  bioMax: 2500,
  specializationMax: 300,
  officeHoursMax: 160,
  officeLocationMax: 120,
  contactEmailMax: 160,
  phoneMax: 40,
  websiteUrlMax: 300,
  lastMessageMax: 300,
};

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  department?: string;
  studentCode?: string;
  photoUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UniversityClass {
  id: string;
  title: string;
  code: string;
  joinCode: string;
  semester: string;
  school?: string;
  course?: string;
  academicYear?: AcademicYear;
  department?: string;
  schedule?: string;
  room?: string;
  meetingUrl?: string;
  description?: string;
  accentColor: AccentColor;
  lecturerId: string;
  lecturerName: string;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClassJoinCode {
  classId: string;
  title: string;
  code: string;
  lecturerId: string;
  lecturerName: string;
  semester: string;
  school?: string;
  course?: string;
  academicYear?: AcademicYear;
  accentColor: AccentColor;
  createdAt: Timestamp;
}

export interface Enrollment {
  studentId: string;
  classId: string;
  lecturerId: string;
  studentName: string;
  studentCode?: string;
  studentPhotoUrl?: string;
  classTitle: string;
  classCode: string;
  semester: string;
  school?: string;
  course?: string;
  academicYear?: AcademicYear;
  lecturerName: string;
  accentColor: AccentColor;
  status: 'active' | 'removed';
  attendanceCount: number;
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClassPost {
  id: string;
  classId: string;
  lecturerId: string;
  authorId: string;
  authorName: string;
  type: PostType;
  priority: PostPriority;
  module?: string;
  title: string;
  body?: string;
  externalUrl?: string;
  externalLabel?: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMime?: string;
  isPinned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PostComment {
  id: string;
  postId: string;
  classId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  createdAt: Timestamp;
}

export interface ClassResource {
  id: string;
  classId: string;
  lecturerId: string;
  title: string;
  url: string;
  category: ResourceCategory;
  module?: string;
  description?: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMime?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Assignment {
  id: string;
  classId: string;
  lecturerId: string;
  title: string;
  description?: string;
  dueDate?: string;
  maxPoints: number;
  referenceUrl?: string;
  status: 'open' | 'closed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Submission {
  studentId: string;
  studentName: string;
  classId: string;
  assignmentId: string;
  lecturerId: string;
  submissionUrl?: string;
  notes?: string;
  grade: number;
  isGraded: boolean;
  feedback?: string;
  status: 'submitted' | 'graded';
  submittedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Assessment {
  id: string;
  classId: string;
  lecturerId: string;
  title: string;
  category: AssessmentCategory;
  date?: string;
  maxPoints: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentGrade {
  studentId: string;
  studentName: string;
  studentCode?: string;
  classId: string;
  assessmentId: string;
  lecturerId: string;
  score: number;
  remarks?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ResultPublication {
  id: string;
  classId: string;
  lecturerId: string;
  authorName: string;
  title: string;
  assessmentTitle?: string;
  format: ResultFormat;
  notes?: string;
  attachmentId: string;
  attachmentName: string;
  attachmentSize: number;
  attachmentMime: string;
  publishedDate?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClassChatMessage {
  id: string;
  classId: string;
  lecturerId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorStudentCode?: string;
  authorPhotoUrl?: string;
  text: string;
  createdAt: Timestamp;
}

export interface LecturerPublicProfile {
  lecturerId: string;
  displayName: string;
  academicTitle?: string;
  school?: string;
  department?: string;
  bio?: string;
  specialization?: string;
  officeHours?: string;
  officeLocation?: string;
  contactEmail?: string;
  phone?: string;
  websiteUrl?: string;
  photoUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DirectConversation {
  studentId: string;
  classId: string;
  lecturerId: string;
  studentName: string;
  studentCode?: string;
  studentPhotoUrl?: string;
  lecturerName: string;
  lastMessage?: string;
  lastSenderRole: UserRole;
  lastMessageAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DirectMessage {
  id: string;
  classId: string;
  studentId: string;
  lecturerId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderPhotoUrl?: string;
  text: string;
  createdAt: Timestamp;
}
