import { Layer } from 'effect';
export declare const processSharedLayer: <R, E>(layer: Layer.Layer<R, E, never>, runtimeKey?: string) => Layer.Layer<R, E>;
export declare const disposeServerRuntime: (runtimeKey?: string) => Promise<void>;
