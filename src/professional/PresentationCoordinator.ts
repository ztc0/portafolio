import { createStore, type StoreApi } from "zustand/vanilla";

import type { ProfessionalLocale, ProfessionalRecordId, ProfessionalZone } from "./schema";

export const PRESENTATION_RAIL_STATE = {
  EXPANDED: "expanded",
  RETRACTED: "retracted",
} as const;

export type PresentationRailState =
  (typeof PRESENTATION_RAIL_STATE)[keyof typeof PRESENTATION_RAIL_STATE];

export const WORLD_PRESENTATION_INTENT = {
  FALLBACK: "fallback",
  READY: "ready",
  PAUSED: "paused",
  RESUMED: "resumed",
  EXITED: "exited",
} as const;

export type WorldPresentationIntent =
  (typeof WORLD_PRESENTATION_INTENT)[keyof typeof WORLD_PRESENTATION_INTENT];

export interface PresentationCoordinatorOptions {
  readonly locale: ProfessionalLocale;
  readonly currentFunctionId: ProfessionalRecordId;
  readonly currentZoneId: ProfessionalZone;
}

export interface PresentationCoordinatorState {
  readonly locale: ProfessionalLocale;
  readonly currentFunctionId: ProfessionalRecordId;
  readonly previewedFunctionId: ProfessionalRecordId | null;
  readonly selectedFunctionId: ProfessionalRecordId | null;
  readonly currentZoneId: ProfessionalZone;
  readonly railState: PresentationRailState;
}

export interface PresentationLocation {
  readonly currentFunctionId: ProfessionalRecordId;
  readonly currentZoneId: ProfessionalZone;
}

export interface PresentationCoordinator {
  readonly store: StoreApi<PresentationCoordinatorState>;
  readonly previewFunction: (functionId: ProfessionalRecordId) => void;
  readonly dismissPreview: () => void;
  readonly selectFunction: (functionId: ProfessionalRecordId, zoneId: ProfessionalZone) => void;
  readonly retractRail: () => void;
  readonly restoreRail: () => void;
  readonly getCurrentPresentation: () => PresentationLocation;
  readonly reportWorldIntent: (intent: WorldPresentationIntent) => void;
  readonly subscribeWorldIntents: (
    listener: (intent: WorldPresentationIntent) => void,
  ) => () => void;
}

export function createPresentationCoordinator({
  locale,
  currentFunctionId,
  currentZoneId,
}: PresentationCoordinatorOptions): PresentationCoordinator {
  const store = createStore<PresentationCoordinatorState>()(() => ({
    locale,
    currentFunctionId,
    previewedFunctionId: null,
    selectedFunctionId: null,
    currentZoneId,
    railState: PRESENTATION_RAIL_STATE.EXPANDED,
  }));
  const worldIntentListeners = new Set<(intent: WorldPresentationIntent) => void>();

  return {
    store,
    previewFunction: (functionId) => {
      store.setState({ previewedFunctionId: functionId });
    },
    dismissPreview: () => {
      store.setState({ previewedFunctionId: null });
    },
    selectFunction: (functionId, zoneId) => {
      store.setState({
        currentFunctionId: functionId,
        previewedFunctionId: null,
        selectedFunctionId: functionId,
        currentZoneId: zoneId,
      });
    },
    retractRail: () => {
      store.setState({ railState: PRESENTATION_RAIL_STATE.RETRACTED });
    },
    restoreRail: () => {
      store.setState({ railState: PRESENTATION_RAIL_STATE.EXPANDED });
    },
    getCurrentPresentation: () => {
      const state = store.getState();
      return {
        currentFunctionId: state.currentFunctionId,
        currentZoneId: state.currentZoneId,
      };
    },
    reportWorldIntent: (intent) => {
      for (const listener of worldIntentListeners) {
        try {
          listener(intent);
        } catch {
          // A presenter failure cannot retain a world runtime or block the remaining presenters.
        }
      }
    },
    subscribeWorldIntents: (listener) => {
      worldIntentListeners.add(listener);
      return () => {
        worldIntentListeners.delete(listener);
      };
    },
  };
}
