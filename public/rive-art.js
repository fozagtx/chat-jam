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
  const controller = {
    instance: null,
    inputs: new Map(),
    disposed: false,
    resizeObserver: null,
  };
  let ready = false;
  let attempts = 0;
  let scheduled = false;

  const scheduleReadyCheck = () => {
    if (scheduled || controller.disposed) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const instance = controller.instance;
      if (!instance || controller.disposed || ready) return;

      if (!canvas.isConnected || !sizeCanvasToLayout(canvas)) {
        retryOrFallback();
        return;
      }

      instance.resizeToCanvas();
      requestAnimationFrame(() => {
        if (controller.disposed || ready) return;
        if (hasVisiblePixels(canvas)) {
          ready = true;
          controller.resizeObserver?.disconnect();
          onReady(controller);
          return;
        }
        retryOrFallback();
      });
    });
  };

  const retryOrFallback = () => {
    attempts += 1;
    if (attempts < 30) scheduleReadyCheck();
    else canvas.dispatchEvent(new Event('riveerror'));
  };

  if ('ResizeObserver' in window) {
    controller.resizeObserver = new ResizeObserver(scheduleReadyCheck);
    controller.resizeObserver.observe(canvas);
  }

  loadRuntime()
    .then((rive) => {
      const createInstance = () => {
        if (controller.disposed) return;
        if (!canvas.isConnected) {
          requestAnimationFrame(createInstance);
          return;
        }
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
            if (controller.disposed || !canvas.isConnected) {
              controller.instance?.cleanup();
              controller.instance = null;
              return;
            }
            controller.inputs = new Map(
              (controller.instance.stateMachineInputs(stateMachine) ?? []).map(
                (input) => [input.name, input],
              ),
            );
            instances.add(controller);
            if (reducedMotion) controller.instance.pause();
            scheduleReadyCheck();
          },
          onLoadError: () => canvas.dispatchEvent(new Event('riveerror')),
        });
      };
      createInstance();
    })
    .catch(() => canvas.dispatchEvent(new Event('riveerror')));
  canvas.addEventListener(
    'riveerror',
    () => {
      controller.disposed = true;
      controller.resizeObserver?.disconnect();
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
  controller.disposed = true;
  controller.resizeObserver?.disconnect();
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

// Join animations scale the art from 0, so size from layout boxes, not the transformed rect.
function sizeCanvasToLayout(canvas) {
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  if (!width || !height) return false;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  return true;
}

function hasVisiblePixels(canvas) {
  if (canvas.width === 0 || canvas.height === 0) return false;
  try {
    const context = canvas.getContext('2d');
    if (!context) return false;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let alpha = 3; alpha < pixels.length; alpha += 16) {
      if (pixels[alpha] > 0) return true;
    }
  } catch {
    return false;
  }
  return false;
}
