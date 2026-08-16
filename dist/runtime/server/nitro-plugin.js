import { defineNitroPlugin } from "nitropack/runtime";
import { disposeServerRuntime } from "../process.js";
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("close", disposeServerRuntime);
});
