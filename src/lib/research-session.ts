import { ResearchReport } from './agents/synthesizer';
import { EvaluationResult } from './agents/evaluator';

export interface ResearchSession {
  id: string;
  question: string;
  status: 'pending' | 'planning' | 'searching' | 'evaluating' | 'synthesizing' | 'completed' | 'failed';
  progress: number;
  currentPhase: string;
  details?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;

  // Progressive data storage
  planningResult?: any;
  searchResults?: any[];
  evaluationResults?: EvaluationResult[];
  synthesisResult?: {
    fullReport: string;
    wordCount: number;
    sectionsGenerated: string[];
    keyFindings: string[];
    citationsUsed: string[];
    modelUsed: string;
  };

  // Metadata
  metadata?: {
    totalTokens?: number;
    modelsUsed?: string[];
    subtopicsInvestigated?: number;
    sourcesEvaluated?: number;
  };
}

export interface SessionUpdate {
  status?: ResearchSession['status'];
  progress?: number;
  currentPhase?: string;
  details?: string;
  errorMessage?: string;
  planningResult?: any;
  searchResults?: any[];
  evaluationResults?: EvaluationResult[];
  synthesisResult?: any;
  metadata?: any;
}

class ResearchSessionStorage {
  private sessions: Map<string, ResearchSession> = new Map();
  private readonly storageFile = process.env.NODE_ENV === 'production'
    ? '/tmp/research_sessions.json'
    : './research_sessions.json';

  constructor() {
    this.loadSessions();

    // Auto-save every 30 seconds
    setInterval(() => this.saveSessions(), 30000);

    // Cleanup old sessions (older than 24 hours)
    setInterval(() => this.cleanupOldSessions(), 3600000);
  }

  private loadSessions(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf8');
        const sessions = JSON.parse(data) as ResearchSession[];
        this.sessions = new Map(sessions.map(s => [s.id, s]));
        console.log(`Loaded ${sessions.length} research sessions`);
      }
    } catch (error) {
      console.warn('Failed to load research sessions:', error);
    }
  }

  private saveSessions(): void {
    try {
      const fs = require('fs');
      const sessions = Array.from(this.sessions.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('Failed to save research sessions:', error);
    }
  }

  private cleanupOldSessions(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    const sessionsToDelete: string[] = [];

    this.sessions.forEach((session, id) => {
      const sessionTime = new Date(session.updatedAt).getTime();
      if (sessionTime < cutoffTime && session.status !== 'active') {
        sessionsToDelete.push(id);
      }
    });

    sessionsToDelete.forEach(id => this.sessions.delete(id));

    if (sessionsToDelete.length > 0) {
      console.log(`Cleaned up ${sessionsToDelete.length} old research sessions`);
      this.saveSessions();
    }
  }

  createSession(question: string): ResearchSession {
    const sessionId = this.generateSessionId();
    const session: ResearchSession = {
      id: sessionId,
      question,
      status: 'pending',
      progress: 0,
      currentPhase: 'Initializing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.sessions.set(sessionId, session);
    this.saveSessions();

    return session;
  }

  getSession(sessionId: string): ResearchSession | null {
    const session = this.sessions.get(sessionId);
    return session || null;
  }

  updateSession(sessionId: string, updates: SessionUpdate): ResearchSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Update session with new data
    Object.assign(session, updates);
    session.updatedAt = new Date().toISOString();

    // Set completed timestamp if status is completed
    if (updates.status === 'completed' && !session.completedAt) {
      session.completedAt = new Date().toISOString();
    }

    this.sessions.set(sessionId, session);

    // Save immediately for important updates
    if (updates.status === 'completed' || updates.status === 'failed') {
      this.saveSessions();
    }

    return session;
  }

  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.saveSessions();
    }
    return deleted;
  }

  getActiveSessions(): ResearchSession[] {
    return Array.from(this.sessions.values()).filter(
      session => !['completed', 'failed'].includes(session.status)
    );
  }

  getCompletedSessions(): ResearchSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.status === 'completed'
    );
  }

  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${random}`;
  }

  // Session recovery for resuming failed/interrupted research
  canResumeSession(question: string): ResearchSession | null {
    // Look for recent incomplete sessions with the same question
    const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago

    for (const session of this.sessions.values()) {
      if (
        session.question === question &&
        !['completed', 'failed'].includes(session.status) &&
        new Date(session.createdAt).getTime() > cutoffTime
      ) {
        return session;
      }
    }

    return null;
  }

  resumeSession(sessionId: string): ResearchSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || ['completed', 'failed'].includes(session.status)) {
      return null;
    }

    // Reset progress but keep existing data
    session.status = 'pending';
    session.progress = 0;
    session.currentPhase = 'Resuming research';
    session.updatedAt = new Date().toISOString();
    session.errorMessage = undefined;

    this.sessions.set(sessionId, session);
    this.saveSessions();

    return session;
  }
}

export const researchSessionStorage = new ResearchSessionStorage();