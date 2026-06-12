import { generationFailure, safeFailureFromError } from "./errors";
import type {
  AiGenerationProvider,
  GenerateTripInput,
  GenerateTripResult,
  GenerationPersistence,
  GenerationProgressEvent,
  GenerationStage,
} from "./types";
import { validateNarration, validatePlannerDraft } from "./validator";

type RunGenerationPipelineOptions = {
  provider: AiGenerationProvider;
  persistence: GenerationPersistence;
  now?: () => Date;
};

export async function runGenerationPipeline(
  input: GenerateTripInput,
  options: RunGenerationPipelineOptions,
): Promise<GenerateTripResult> {
  const now = options.now ?? (() => new Date());
  const progress = createProgressCollector(now);
  const maxRetries = input.maxPlannerRetries ?? 2;

  progress.emit("retrieval", "Using verified retrieval context for this trip.");

  let validationFeedback: string[] = [];
  let attempt = 0;
  let plannerDraft = null as Awaited<ReturnType<AiGenerationProvider["createPlannerDraft"]>> | null;

  while (attempt <= maxRetries) {
    try {
      progress.emit(attempt === 0 ? "planning" : "retrying", attempt === 0 ? "Planning a grounded draft itinerary." : "Retrying the planner with validation feedback.");
      plannerDraft = await options.provider.createPlannerDraft({
        intake: input.intake,
        retrievalContext: input.retrievalContext,
        validationFeedback,
      });
    } catch (error) {
      progress.emit("failed", "Trip generation could not complete.");
      return { ok: false, failure: safeFailureFromError(error, "planning", "Planner provider failed."), progress: progress.events };
    }

    progress.emit("validating", "Checking the draft against verified places and route data.");
    const report = validatePlannerDraft(plannerDraft, input.retrievalContext);
    if (report.ok) break;

    validationFeedback = report.retryFeedback;
    if (attempt >= maxRetries) {
      progress.emit("failed", "Trip generation could not produce a grounded draft.");
      return {
        ok: false,
        failure: generationFailure(
          "PLANNER_VALIDATION_FAILED",
          "validating",
          "Planner output could not be grounded in verified retrieval data.",
          true,
        ),
        progress: progress.events,
      };
    }

    attempt += 1;
  }

  if (!plannerDraft) {
    progress.emit("failed", "Trip generation could not produce a draft.");
    return {
      ok: false,
      failure: generationFailure("PLANNER_VALIDATION_FAILED", "planning", "Planner did not return a draft.", true),
      progress: progress.events,
    };
  }

  progress.emit("narrating", "Writing family-friendly summaries and stop tips.");
  let narratedDraft: Awaited<ReturnType<AiGenerationProvider["createNarration"]>>;
  try {
    narratedDraft = await options.provider.createNarration({
      draft: plannerDraft,
      retrievalContext: input.retrievalContext,
    });
  } catch (error) {
    progress.emit("failed", "Trip narration could not complete.");
    return { ok: false, failure: safeFailureFromError(error, "narrating", "Narrator provider failed."), progress: progress.events };
  }

  const narrationReport = validateNarration(narratedDraft);
  if (!narrationReport.ok) {
    progress.emit("failed", "Trip narration did not meet TripAI voice rules.");
    return {
      ok: false,
      failure: generationFailure(
        "NARRATION_VALIDATION_FAILED",
        "narrating",
        "Narration used language that is not advisory.",
        true,
      ),
      progress: progress.events,
    };
  }

  progress.emit("persisting", "Saving the validated draft for review.");
  try {
    const saved = await options.persistence.saveValidatedDraft({
      ownerId: input.ownerId,
      intakeId: input.intakeId,
      draft: narratedDraft,
    });
    progress.emit("succeeded", "Your draft trip is ready to review.");
    return { ok: true, ...saved, progress: progress.events };
  } catch {
    progress.emit("failed", "Trip draft could not be saved.");
    return {
      ok: false,
      failure: generationFailure("PERSISTENCE_FAILED", "persisting", "Validated trip draft could not be saved.", true),
      progress: progress.events,
    };
  }
}

function createProgressCollector(now: () => Date) {
  const events: GenerationProgressEvent[] = [];
  return {
    events,
    emit(stage: GenerationStage, message: string) {
      events.push({
        sequence: events.length + 1,
        stage,
        message,
        createdAt: now().toISOString(),
      });
    },
  };
}
