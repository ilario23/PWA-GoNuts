export default class WebWorker {
    postMessage(_msg: unknown) { }
    onmessage: ((this: Worker, ev: MessageEvent) => unknown) | null = null;
    addEventListener() { }
    removeEventListener() { }
    terminate() { }
}
