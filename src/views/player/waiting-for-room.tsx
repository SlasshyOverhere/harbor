import { LottiePlayer } from "@/components/lottie-player";
import waitingAnim from "@/assets/lottie/wt-waiting-white.json";
import { formatNames } from "./player-utils";
import type { RoomSnapshot } from "@/lib/together/client";

export function WaitingForRoom(props: {
  isHost: boolean;
  notReady: RoomSnapshot["participants"];
  participants: RoomSnapshot["participants"];
  clientId: string;
  onStartAnyway: () => void;
  onLeave: () => void;
}) {
  const { isHost, notReady, participants, clientId, onStartAnyway, onLeave } = props;
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/72 backdrop-blur-md">
      <div className="flex max-w-sm flex-col items-center gap-5 px-8 text-center">
        <LottiePlayer data={waitingAnim} className="h-28 w-28" />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[18px] font-semibold text-white">
            {isHost ? "Waiting for everyone" : "Waiting for host"}
          </h2>
          <p className="text-[13px] text-white/60">
            {isHost
              ? notReady.length > 0
                ? `Loading on ${formatNames(notReady.map((p) => p.name))}…`
                : "Almost there…"
              : "Playback starts when everyone is loaded in."}
          </p>
        </div>
        {isHost && participants.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {participants.map((p) => (
              <span
                key={p.id}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] ${
                  p.ready
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-white/10 text-white/70"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${p.ready ? "bg-emerald-400" : "bg-white/40"}`}
                />
                {p.name}
                {p.id === clientId && " (you)"}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2.5">
          {isHost && notReady.length > 0 && (
            <button
              type="button"
              onClick={onStartAnyway}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Start anyway
            </button>
          )}
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex h-10 items-center rounded-full border border-white/25 px-5 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/45 hover:text-white"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
