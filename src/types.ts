
export interface Voter {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  email: string;
  status: 'Not Voted' | 'In Progress' | 'Completed';
  studentNumber: string;
  completedAt?: any;
  sessionId?: string;
}

export interface Position {
  id: string;
  title: string;
  order: number;
}

export interface Candidate {
  id: string;
  name: string;
  positionId: string;
  photoUrl: string;
  bio: string;
}

export interface Vote {
  voterId: string;
  candidateId: string;
  positionId: string;
  voterGender: string;
  timestamp: any;
}

export interface AdminConfig {
  adminPasswordHash: string;
}
