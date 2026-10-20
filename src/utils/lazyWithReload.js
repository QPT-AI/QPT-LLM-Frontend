import { lazy } from "react";
import { isChunkLoadError, reloadForNewBuild } from "./staleBuild";

// React.lazy that reloads the page once when the chunk is gone after a deploy.
// The returned component also exposes `preload()` so callers can warm the chunk.
export function lazyWithReload(load) {
  let pending = null;
  const preload = () => {
    pending ??= load().catch((error) => {
      pending = null;
      if (isChunkLoadError(error) && reloadForNewBuild()) {
        return new Promise(() => {}); // page is reloading; never resolve
      }
      throw error;
    });
    return pending;
  };
  const Component = lazy(preload);
  Component.preload = preload;
  return Component;
}
