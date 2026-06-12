import type { GenerationPersistence } from "./types";

export class UnimplementedGenerationPersistence implements GenerationPersistence {
  async saveValidatedDraft(): Promise<{ tripId: string; revisionId: string }> {
    throw new Error("Generation persistence must be provided by the caller.");
  }
}
