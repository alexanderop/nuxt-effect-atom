import { defineEventHandler } from "h3";
import { getEffectAtomDiagnostics } from "../diagnostics.js";
export default defineEventHandler(() => getEffectAtomDiagnostics());
