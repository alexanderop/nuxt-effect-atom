import { defineNitroPlugin } from "nitropack/runtime";
import { runtimeKey } from "#effect-atom/options";
import { disposeServerRuntime } from "../process.js";
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("close", () => disposeServerRuntime(runtimeKey));
});
