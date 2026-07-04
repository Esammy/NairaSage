/** Open the wealth quick-chat drawer with an optional prefilled prompt (client only). */

export const OPEN_WEALTH_COACH_EVENT = "nairasage-open-coach";

export type OpenWealthCoachDetail = { prompt?: string };

export function openWealthCoach(prompt?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_WEALTH_COACH_EVENT, {
      detail: { prompt } satisfies OpenWealthCoachDetail,
    })
  );
}
