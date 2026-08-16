import { Layer } from 'effect';
export declare const processSharedLayer: <R, E>(layer: Layer.Layer<R, E>) => Layer.Layer<R, E>;
export declare const disposeServerRuntime: () => Promise<void>;
