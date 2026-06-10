import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkflowStateService {
  private readonly TRANSITIONS: Record<string, string[]> = {
    BROUILLON: ['ENVOYE', 'ANNULE'],
    ENVOYE: ['ACCEPTE', 'REFUSE', 'ANNULE'],
    ACCEPTE: ['SIGNE', 'ANNULE'],
    SIGNE: [],
    REFUSE: ['REVISE', 'ANNULE'],
    REVISE: ['RENVOYE', 'ANNULE'],
    RENVOYE: ['ACCEPTE', 'REFUSE', 'ANNULE'],
    ANNULE: [],
  };

  getAllowedTransitions(current: string): string[] {
    return this.TRANSITIONS[current] ?? [];
  }

  isTransitionAllowed(current: string, next: string): boolean {
    const allowed = this.getAllowedTransitions(current);
    return allowed.includes(next);
  }
}
