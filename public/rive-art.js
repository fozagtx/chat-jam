let runtimePromise;
let reducedMotion = false;
const instances = new Set();

function configureRuntime(rive) {
  rive.RuntimeLoader.setWasmUrl('/rive/rive.wasm');
  rive.RuntimeLoader.setWasmFallbackUrl('/rive/rive_fallback.wasm');
  rive.RuntimeLoader.setWasmThreadsUrl(null);
  return rive;
}

function loadRuntime() {
  if (window.rive) {
    return Promise.resolve(configureRuntime(window.rive));
  }
  if (!runtimePromise) {
    runtimePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/rive/rive.js';
      script.onload = () => {
        if (!window.rive) {
          reject(new Error('Rive runtime did not initialize'));
          return;
        }
        resolve(configureRuntime(window.rive));
      };
      script.onerror = () => reject(new Error('Rive runtime could not load'));
      document.head.append(script);
    });
  }
  return runtimePromise;
}

export function attachRiveArt(
  canvas,
  source,
  artboard,
  stateMachine,
  onReady = () => {},
) {
  const controller = { instance: null, inputs: new Map() };
  loadRuntime()
    .then((rive) => {
      if (!canvas.isConnected) return;
      controller.instance = new rive.Rive({
        src: source,
        canvas,
        artboard,
        stateMachines: stateMachine,
        layout: new rive.Layout({
          fit: rive.Fit.Contain,
          alignment: rive.Alignment.Center,
        }),
        autoplay: true,
        onLoad: () => {
          controller.instance.resizeDrawingSurfaceToCanvas();
          controller.inputs = new Map(
            (controller.instance.stateMachineInputs(stateMachine) ?? []).map((input) => [
              input.name,
              input,
            ]),
          );
          instances.add(controller);
          if (reducedMotion) controller.instance.pause();
          onReady(controller);
        },
        onLoadError: () => canvas.dispatchEvent(new Event('riveerror')),
      });
    })
    .catch(() => canvas.dispatchEvent(new Event('riveerror')));
  canvas.addEventListener(
    'riveerror',
    () => {
      controller.instance?.cleanup();
      controller.instance = null;
      instances.delete(controller);
    },
    { once: true },
  );
  return controller;
}

export function triggerRive(controller, input) {
  if (!reducedMotion) controller?.inputs.get(input)?.fire();
}

export function disposeRive(controller) {
  if (!controller) return;
  controller.instance?.cleanup();
  instances.delete(controller);
}

export function setRiveReducedMotion(enabled) {
  reducedMotion = Boolean(enabled);
  for (const controller of instances) {
    if (reducedMotion) controller.instance.pause();
    else controller.instance.play();
  }
}
