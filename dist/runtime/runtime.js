import { Atom } from "@effect/atom-vue";
import { Layer } from "effect";
import { options } from "#effect-atom/options";
const serverMemoMap = import.meta.server && options.sharedMemoMap ? Layer.makeMemoMapUnsafe() : void 0;
export const atomRuntime = serverMemoMap ? Atom.context({ memoMap: serverMemoMap }) : Atom.runtime;
