export {
  getPrimaryRecord,
  getPrimaryStep,
  lookupPrimaryQuery,
  hydratePrimaryFromProfessionalLesson,
  registerPrimaryRecord,
  upsertPrimaryQueryCache,
  normalizeQueryFingerprint,
  validatePartDuration,
  listPrimaryLessonIds,
  __resetPrimaryStoreForTests,
} from "./primaryStore";

export {
  boardTextToOps,
  cursorToActions,
  buildPrimaryStepsFromLesson,
} from "./hydrateSteps";

export { mapConsoleTarget } from "../professional_mode/normalizeLesson";

export {
  stageInteraction,
  getStagingEntry,
  listStaging,
  updateStagingStatus,
  hydrateStagingFromRemote,
} from "./secondaryStore";

export {
  upsertThirdQa,
  getThirdQa,
  getThirdQaByStagingId,
  listThirdQa,
  lookupThirdQa,
  thirdToPayload,
  hydrateThirdFromRemote,
  createThirdQaId,
  __resetThirdStoreForTests,
} from "./thirdStore";

export {
  inspectPendingStaging,
  promoteStagingToThird,
  promoteStagingToPrimary,
  rejectStaging,
  stagingToReviewCard,
} from "./promote";

import "./seedPrimaryDemo";
import "./seedCsaL1Cache";
