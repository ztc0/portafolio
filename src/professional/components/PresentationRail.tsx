import { useState, useSyncExternalStore, type KeyboardEvent } from "react";

import {
  PRESENTATION_RAIL_STATE,
  type PresentationCoordinator,
  type PresentationCoordinatorState,
} from "../PresentationCoordinator";
import { getPresentationSession } from "../presentationSession";
import type { ProfessionalLocale, ProfessionalRecordId, ProfessionalZone } from "../schema";

export interface PresentationRailFunction {
  readonly id: ProfessionalRecordId;
  readonly zoneId: ProfessionalZone;
  readonly href: string;
  readonly label: string;
}

export interface PresentationRailProps {
  readonly locale: ProfessionalLocale;
  readonly functions: readonly [PresentationRailFunction, ...PresentationRailFunction[]];
  readonly railLabel: string;
  readonly navigationLabel: string;
  readonly retractLabel: string;
  readonly restoreLabel: string;
  readonly sessionHostId: string;
}

export function PresentationRail({
  locale,
  functions,
  railLabel,
  navigationLabel,
  retractLabel,
  restoreLabel,
  sessionHostId,
}: PresentationRailProps) {
  const initialFunction = functions[0];
  const [fallbackState] = useState(() =>
    createRailFallbackState(locale, initialFunction.id, initialFunction.zoneId),
  );
  const coordinator = getCoordinatorForHost(
    sessionHostId,
    locale,
    initialFunction.id,
    initialFunction.zoneId,
  );
  const state = useSyncExternalStore(
    coordinator ? coordinator.store.subscribe : subscribeToFallback,
    coordinator ? coordinator.store.getState : () => fallbackState,
    () => fallbackState,
  );
  const isExpanded = state.railState === PRESENTATION_RAIL_STATE.EXPANDED;

  function markHydrated(element: HTMLElement | null) {
    if (element) {
      element.dataset.hydrated = "true";
    }
  }

  function dismissPreviewOnEscape(event: KeyboardEvent<HTMLAnchorElement>) {
    if (event.key === "Escape") {
      coordinator?.dismissPreview();
    }
  }

  return (
    <aside
      ref={markHydrated}
      className="presentation-rail"
      data-presentation-rail
      aria-label={railLabel}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls="presentation-rail-navigation"
        onClick={isExpanded ? coordinator?.retractRail : coordinator?.restoreRail}
      >
        {isExpanded ? retractLabel : restoreLabel}
      </button>
      {isExpanded ? (
        <nav id="presentation-rail-navigation" aria-label={navigationLabel}>
          <ul>
            {functions.map((functionEntry) => (
              <li key={functionEntry.id}>
                <a
                  href={functionEntry.href}
                  aria-current={
                    state.selectedFunctionId === functionEntry.id ? "location" : undefined
                  }
                  data-previewed={
                    state.previewedFunctionId === functionEntry.id ? "true" : undefined
                  }
                  onFocus={() => coordinator?.previewFunction(functionEntry.id)}
                  onKeyDown={dismissPreviewOnEscape}
                  onClick={() =>
                    coordinator?.selectFunction(functionEntry.id, functionEntry.zoneId)
                  }
                >
                  {functionEntry.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </aside>
  );
}

function getCoordinatorForHost(
  sessionHostId: string,
  locale: ProfessionalLocale,
  currentFunctionId: ProfessionalRecordId,
  currentZoneId: ProfessionalZone,
): PresentationCoordinator | null {
  if (typeof document === "undefined") {
    return null;
  }

  const host = document.getElementById(sessionHostId);
  return host ? getPresentationSession(host, { locale, currentFunctionId, currentZoneId }) : null;
}

function subscribeToFallback() {
  return () => undefined;
}

function createRailFallbackState(
  locale: ProfessionalLocale,
  currentFunctionId: ProfessionalRecordId,
  currentZoneId: ProfessionalZone,
): PresentationCoordinatorState {
  return {
    locale,
    currentFunctionId,
    previewedFunctionId: null,
    selectedFunctionId: null,
    currentZoneId,
    railState: PRESENTATION_RAIL_STATE.EXPANDED,
  };
}
