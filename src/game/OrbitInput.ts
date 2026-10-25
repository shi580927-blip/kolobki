import type { Vector3 } from "three";
import type { CameraRig } from "./CameraRig";

/** Middle drag on the scene, or one captured pointer in the right look pad. */
export class OrbitInput {
  constructor(
    element: HTMLElement,
    rig: CameraRig,
    position: () => Vector3,
    onOrbit: () => void,
    primaryDrag = false,
  ) {
    let active: number | null = null,
      lastX = 0,
      lastY = 0;
    const release = () => {
      const pointer = active;
      active = null;
      if (pointer !== null && element.hasPointerCapture(pointer))
        element.releasePointerCapture(pointer);
      element.style.cursor = "";
    };
    element.addEventListener("pointerdown", (event) => {
      if (
        (!primaryDrag && (event.pointerType !== "mouse" || event.button !== 1)) ||
        (primaryDrag && event.button !== 0) ||
        active !== null
      )
        return;
      event.preventDefault();
      active = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      element.setPointerCapture(active);
      element.style.cursor = "grabbing";
      rig.beginOrbit(position());
      onOrbit();
    });
    element.addEventListener("pointermove", (event) => {
      if (event.pointerId !== active) return;
      if (!(event.buttons & (primaryDrag ? 1 : 4))) {
        release();
        return;
      }
      event.preventDefault();
      const height = Math.max(1, element.getBoundingClientRect().height);
      rig.orbit(
        (event.clientX - lastX) / height,
        (event.clientY - lastY) / height,
      );
      lastX = event.clientX;
      lastY = event.clientY;
    });
    element.addEventListener("pointerup", (event) => {
      if (event.pointerId === active && event.button === (primaryDrag ? 0 : 1)) release();
    });
    element.addEventListener("pointercancel", (event) => {
      if (event.pointerId === active) release();
    });
    element.addEventListener("lostpointercapture", (event) => {
      if (event.pointerId === active) release();
    });
    element.addEventListener("mousedown", (event) => {
      if (event.button === 1) event.preventDefault();
    });
    element.addEventListener("auxclick", (event) => {
      if (event.button === 1) event.preventDefault();
    });
    addEventListener("blur", release);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) release();
    });
  }
}
