import { heroReducer, initialHeroState, planRoute, type HeroState } from "./simulation";
import { SERVICES, type ServiceId } from "./topology";

export type HeroCamera = "wide" | "node" | "profile";
/** `plate` is the art-plate hero (default); `3d` is the real-time scene, kept as an option. */
export type HeroScene = "plate" | "3d";

export interface HeroUrlState {
  fixedTime: number | null;
  camera: HeroCamera;
  scene: HeroScene;
  state: HeroState;
}

const serviceIds = new Set<string>(SERVICES.map((service) => service.id));
const isServiceId = (value: string | undefined): value is ServiceId =>
  value !== undefined && serviceIds.has(value);

const nonNegativeNumber = (value: string | null): number | null => {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

/** Parse deterministic screenshot controls without mutating location or starting a clock. */
export function parseHeroUrl(search: string, defaultTime = 0): HeroUrlState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fixedTime = nonNegativeNumber(params.get("heroTime"));
  const now = fixedTime ?? defaultTime;
  const rawCamera = params.get("heroCamera");
  const camera: HeroCamera = rawCamera === "node" || rawCamera === "profile" ? rawCamera : "wide";
  const scene: HeroScene = params.get("hero") === "3d" ? "3d" : "plate";
  const stateParam = params.get("heroState") ?? "idle";
  let state = initialHeroState;

  if (stateParam.startsWith("hover:") && isServiceId(stateParam.slice(6))) {
    state = heroReducer(state, { type: "hover", id: stateParam.slice(6) as ServiceId });
  } else if (stateParam.startsWith("request:")) {
    const elapsed = nonNegativeNumber(stateParam.slice(8));
    if (elapsed !== null) {
      state = {
        ...state,
        mode: "request",
        route: planRoute(null),
        startedAt: now - elapsed,
      };
    }
  } else if (stateParam.startsWith("failure:") && isServiceId(stateParam.slice(8))) {
    state = heroReducer(state, { type: "fail", id: stateParam.slice(8) as ServiceId, now });
  } else if (stateParam.startsWith("recover:") && isServiceId(stateParam.slice(8))) {
    const recoveryStartedAt = now - 1.75;
    const failed = heroReducer(state, {
      type: "fail",
      id: stateParam.slice(8) as ServiceId,
      now: recoveryStartedAt - 0.01,
    });
    state = heroReducer(failed, { type: "recover", now: recoveryStartedAt });
  }

  return { fixedTime, camera, scene, state };
}
