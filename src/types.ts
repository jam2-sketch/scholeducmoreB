export type UserRole = 'teacher' | 'student' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  photo_url?: string;
  role: UserRole;
  age?: number;
  sex?: string;
  created_at: any;
}

export interface Class {
  id: string;
  name: string;
  section?: string;
  description?: string;
  owner_id: string;
  join_code: string;
  theme_color: string;
  banner_image?: string;
  created_at: any;
}

export interface Enrollment {
  id: string;
  user_id: string;
  class_id: string;
  role: 'teacher' | 'student';
  enrolled_at: any;
}

export interface Post {
  id: string;
  class_id: string;
  author_id: string;
  author_name: string;
  author_photo?: string;
  content: string;
  type: 'announcement' | 'assignment';
  attachment_url?: string;
  created_at: any;
}

export interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description: string;
  due_date: any;
  points: number;
  created_at: any;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  content: string;
  status: 'submitted' | 'graded' | 'returned';
  grade?: number;
  feedback?: string;
  submitted_at: any;
}

export interface Comment {
  id: string;
  parent_id: string;
  author_id: string;
  author_name: string;
  author_photo?: string;
  content: string;
  created_at: any;
}
