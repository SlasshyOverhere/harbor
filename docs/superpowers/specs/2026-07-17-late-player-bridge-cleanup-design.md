# Late Player Bridge Cleanup

## Problem

When the user leaves the player while an asynchronous player bridge is still being created, the completed bridge can outlive `PlayerView`. With mpv, this leaves audio and the native video surface running behind the current page.

## Design

Keep the fix inside the shared player-bridge lifecycle. After asynchronous bridge selection completes, check whether the owning effect was cancelled. If it was, immediately destroy the newly created bridge and return without attaching it.

Do not change navigation, profile switching, Rust commands, casting, or normal player teardown. Existing mounted-player behavior remains unchanged.

## Cross-platform behavior

The lifecycle hook is shared by Windows, macOS, and Linux and runs before platform-specific bridge attachment. The same cleanup rule therefore applies to every local playback engine and platform.

## Testing

Add a focused regression test for the late-resolution lifecycle: cancellation before bridge creation finishes must destroy the resolved bridge exactly once and must not attach it. Preserve the normal path where an active bridge is attached and later destroyed during cleanup.

Run the focused test, `vp check` for changed files, and `vp run typecheck` because the change is TypeScript.
