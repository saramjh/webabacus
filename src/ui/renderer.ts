import type { Abacus } from "../core/abacus";
import type { RodState } from "../core/types";

// All vertical geometry shares one 24px rhythm (16px bead + 8px gap), so a
// bead's travel between its two resting positions is exactly one unit —
// short enough to read as a flick, not a scroll.
const BEAD_HEIGHT = 16;
const BEAD_GAP = 8;
const BEAD_UNIT = BEAD_HEIGHT + BEAD_GAP; // 24
const EARTH_SLOTS = 4;
const HEAVEN_TRACK_HEIGHT = BEAD_UNIT + BEAD_HEIGHT; // 40
const EARTH_TRACK_HEIGHT = (EARTH_SLOTS + 1) * BEAD_UNIT; // 120
const PLACE_MARKER_INTERVAL = 3;

interface RodElements {
  heavenBead: HTMLElement;
  earthBeads: HTMLElement[]; // index 0 = closest to the reckoning bar
}

/**
 * Only one pointer may drive the abacus at a time. Acquiring the lock on
 * pointerdown and checking ownership on every subsequent event is what
 * keeps a second finger, or the mouse moving over a different rod mid-drag,
 * from mutating state it didn't start.
 */
interface PointerLock {
  acquire(pointerId: number): boolean;
  owns(pointerId: number): boolean;
  release(): void;
}

/** Toggling a class on the frame (rather than a per-bead transition rule)
 * disables the snap transition for every bead while any drag is in
 * progress, and restores it the instant the pointer lifts. Without this,
 * a bead never catches up to a fast drag: every pointermove retargets the
 * transition before the previous one finishes, so the bead perpetually
 * eases toward a position that's already stale. */
function createPointerLock(frame: HTMLElement): PointerLock {
  let activeId: number | null = null;
  return {
    acquire(pointerId) {
      if (activeId !== null) return false;
      activeId = pointerId;
      frame.classList.add("is-dragging");
      return true;
    },
    owns(pointerId) {
      return activeId === pointerId;
    },
    release() {
      activeId = null;
      frame.classList.remove("is-dragging");
    },
  };
}

/** Active earth beads are always contiguous from the bar (position 0..count-1),
 * so an active bead's slot only depends on its own position. Inactive beads
 * are pushed flush against the far end of the rod's travel range, so their
 * slot depends on how many beads are currently active on that rod. */
function earthBeadOffset(position: number, earthCount: number): number {
  if (position < earthCount) {
    return position * BEAD_UNIT;
  }
  const inactiveGroupTop = EARTH_TRACK_HEIGHT - (EARTH_SLOTS - earthCount) * BEAD_UNIT;
  const rankInInactiveGroup = position - earthCount;
  return inactiveGroupTop + rankInInactiveGroup * BEAD_UNIT;
}

/** Whichever bead is currently nearest the pointer is the one being "grabbed" —
 * this lets a single drag gesture sweep through several beads at once, the
 * way pushing a finger up a real rod carries every bead ahead of it along.
 * Computed from the same offset formula the renderer uses, not from live
 * getBoundingClientRect() reads: querying every bead's rect on each
 * pointermove forces a synchronous layout on top of the style write that
 * just triggered it, which is what made dragging feel like it was
 * fighting the browser. */
function nearestEarthPositionFromY(relativeY: number, earthCount: number): number {
  let closestIndex = 0;
  let closestDistance = Infinity;
  for (let position = 0; position < EARTH_SLOTS; position++) {
    const center = earthBeadOffset(position, earthCount) + BEAD_HEIGHT / 2;
    const distance = Math.abs(relativeY - center);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = position;
    }
  }
  return closestIndex;
}

function makeBeadElement(className: string, label: string): HTMLElement {
  const bead = document.createElement("div");
  bead.className = className;
  bead.tabIndex = 0;
  bead.setAttribute("role", "button");
  bead.setAttribute("aria-label", label);
  return bead;
}

function attachHeavenInteraction(
  section: HTMLElement,
  bead: HTMLElement,
  abacus: Abacus,
  rodIndex: number,
  lock: PointerLock,
): void {
  // A plain tap always toggles the bead — there's only one, so there's no
  // "which resting slot did you mean" ambiguity to resolve from position
  // alone (mapping tap position to nearest resting slot is a no-op, since
  // a tap on the bead always lands on the slot it's already in). Only once
  // the drag clears a small threshold, in the direction away from where it
  // started, does it act as an explicit set instead of a toggle.
  const DRAG_THRESHOLD = BEAD_UNIT / 2;
  let dragStartY = 0;
  let dragStartState = false;
  let changedDuringDrag = false;
  // The frame is rendered at native size and scaled down via CSS transform
  // to fit the viewport (see fitFrameToViewport). event.clientY arrives in
  // real, post-scale screen pixels, but BEAD_UNIT and DRAG_THRESHOLD are
  // native-size constants — captured once per gesture (not re-measured on
  // every pointermove) and divided out so the two stay in the same units.
  let dragScale = 1;

  const setHeaven = (desired: boolean) => {
    if (abacus.getRods()[rodIndex].heaven !== desired) {
      abacus.toggleHeaven(rodIndex);
    }
  };

  section.addEventListener("pointerdown", (event) => {
    if (!lock.acquire(event.pointerId)) return;
    section.setPointerCapture(event.pointerId);
    event.preventDefault();
    dragScale = section.offsetWidth > 0 ? section.getBoundingClientRect().width / section.offsetWidth : 1;
    dragStartY = event.clientY;
    dragStartState = abacus.getRods()[rodIndex].heaven;
    changedDuringDrag = false;
  });
  section.addEventListener("pointermove", (event) => {
    if (!lock.owns(event.pointerId)) return;
    const delta = (event.clientY - dragStartY) / dragScale; // positive = moving down, toward the bar
    if (!dragStartState && delta > DRAG_THRESHOLD) {
      setHeaven(true);
      changedDuringDrag = true;
    } else if (dragStartState && delta < -DRAG_THRESHOLD) {
      setHeaven(false);
      changedDuringDrag = true;
    }
  });
  const endDrag = (event: PointerEvent) => {
    if (!lock.owns(event.pointerId)) return;
    if (!changedDuringDrag) {
      setHeaven(!dragStartState);
    }
    lock.release();
  };
  section.addEventListener("pointerup", endDrag);
  section.addEventListener("pointercancel", endDrag);

  bead.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      abacus.toggleHeaven(rodIndex);
    }
  });
}

function attachEarthInteraction(
  section: HTMLElement,
  earthBeads: HTMLElement[],
  abacus: Abacus,
  rodIndex: number,
  lock: PointerLock,
): void {
  // The bead touched at the moment contact lands is the only thing this
  // gesture is ever about, from start to release. On a real rod, your
  // finger is physically only ever touching that one bead — dragging
  // further can carry it (and everything between it and the bar, or
  // between it and the far end) home, but it can never reach out and
  // move some OTHER bead just because your finger's Y position happens
  // to pass where that bead currently rests. So the grabbed bead's
  // position is captured once and every subsequent decision is bounded
  // by it — never re-derived from "whichever bead is nearest now".
  let dragStartY = 0;
  let grabbedPosition = 0;
  const DRAG_THRESHOLD = BEAD_UNIT / 2;
  // Same native-vs-screen-pixel mismatch as attachHeavenInteraction: the
  // frame can be scaled down to fit the viewport, so every screen-space
  // measurement (the initial tap position, and every drag delta) has to be
  // divided by the gesture's scale before it's compared against the
  // native-unit geometry in earthBeadOffset/nearestEarthPositionFromY.
  // Left unscaled, the error grows with distance from the bar — exactly
  // why only the bead or two nearest the beam kept registering correctly
  // once enough rods shrank the frame below its native size.
  let dragScale = 1;

  section.addEventListener("pointerdown", (event) => {
    if (!lock.acquire(event.pointerId)) return;
    section.setPointerCapture(event.pointerId);
    event.preventDefault();
    const rect = section.getBoundingClientRect();
    dragScale = section.offsetWidth > 0 ? rect.width / section.offsetWidth : 1;
    dragStartY = event.clientY;
    const relativeY = (event.clientY - rect.top) / dragScale;
    const startCount = abacus.getRods()[rodIndex].earth;
    grabbedPosition = nearestEarthPositionFromY(relativeY, startCount);
    // Immediate tap feedback — identical to a plain click: toggle exactly
    // the grabbed bead, based on its own current state, before any drag
    // has even happened.
    const tapTarget = grabbedPosition < startCount ? grabbedPosition : grabbedPosition + 1;
    if (tapTarget !== startCount) {
      abacus.setEarth(rodIndex, tapTarget);
    }
  });
  section.addEventListener("pointermove", (event) => {
    if (!lock.owns(event.pointerId)) return;
    const delta = (event.clientY - dragStartY) / dragScale; // positive = moving away from the bar
    const current = abacus.getRods()[rodIndex].earth;
    const raiseTarget = grabbedPosition + 1; // grabbed bead + everything toward the bar
    const lowerTarget = grabbedPosition; // grabbed bead + everything away from the bar
    if (delta < -DRAG_THRESHOLD && current !== raiseTarget) {
      abacus.setEarth(rodIndex, raiseTarget);
    } else if (delta > DRAG_THRESHOLD && current !== lowerTarget) {
      abacus.setEarth(rodIndex, lowerTarget);
    }
  });
  const release = (event: PointerEvent) => {
    if (lock.owns(event.pointerId)) lock.release();
  };
  section.addEventListener("pointerup", release);
  section.addEventListener("pointercancel", release);

  earthBeads.forEach((bead, position) => {
    bead.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const currentEarth = abacus.getRods()[rodIndex].earth;
        const newCount = position < currentEarth ? position : position + 1;
        abacus.setEarth(rodIndex, newCount);
      }
    });
  });
}

const RESET_SWIPE_RATIO = 0.6; // fraction of the frame's rendered width a swipe must cross

/**
 * The real-world gesture: pinch the frame between the rails above and below
 * the beam and drag straight across to snap every bead home at once. Here,
 * starting the drag anywhere in the beam's horizontal band — not just
 * exactly on one rod's bar element, since a real swipe doesn't aim for a
 * 40px target — and carrying it far enough horizontally does the same
 * thing. Unlike a bead drag, nothing is set until the threshold is crossed,
 * so the existing snap transition is left alone and the whole abacus
 * animates back to zero together instead of jumping.
 */
function attachResetSwipe(frame: HTMLElement, abacus: Abacus, lock: PointerLock): void {
  let startX = 0;
  let triggered = false;

  const withinBarBand = (clientY: number): boolean => {
    const anyBar = frame.querySelector(".reckoning-bar");
    if (!anyBar) return false;
    const rect = anyBar.getBoundingClientRect();
    return clientY >= rect.top && clientY <= rect.bottom;
  };

  frame.addEventListener("pointerdown", (event) => {
    if (!withinBarBand(event.clientY)) return;
    if (!lock.acquire(event.pointerId)) return;
    frame.setPointerCapture(event.pointerId);
    // This gesture doesn't set live state while tracking, so it doesn't
    // need — and shouldn't keep — the drag lock's transition-suppression.
    frame.classList.remove("is-dragging");
    event.preventDefault();
    startX = event.clientX;
    triggered = false;
  });

  frame.addEventListener("pointermove", (event) => {
    if (!lock.owns(event.pointerId) || triggered) return;
    const frameWidth = frame.getBoundingClientRect().width;
    if (Math.abs(event.clientX - startX) >= frameWidth * RESET_SWIPE_RATIO) {
      triggered = true;
      abacus.reset();
    }
  });

  const endSwipe = (event: PointerEvent) => {
    if (lock.owns(event.pointerId)) lock.release();
  };
  frame.addEventListener("pointerup", endSwipe);
  frame.addEventListener("pointercancel", endSwipe);
}

function buildRodDOM(
  abacus: Abacus,
  rodIndex: number,
  rodCount: number,
  lock: PointerLock,
): { rod: HTMLElement; elements: RodElements } {
  const rod = document.createElement("div");
  rod.className = "rod";

  const heavenSection = document.createElement("div");
  heavenSection.className = "heaven-section";
  heavenSection.style.height = `${HEAVEN_TRACK_HEIGHT}px`;
  const heavenBead = makeBeadElement("bead heaven-bead", `${rodIndex}번째 자리 윗알`);
  heavenSection.appendChild(heavenBead);

  const bar = document.createElement("div");
  bar.className = "reckoning-bar";
  const placeFromRight = rodCount - 1 - rodIndex;
  if (placeFromRight % PLACE_MARKER_INTERVAL === 0) {
    bar.classList.add("marked");
  }

  const earthSection = document.createElement("div");
  earthSection.className = "earth-section";
  earthSection.style.height = `${EARTH_TRACK_HEIGHT}px`;
  const earthBeads: HTMLElement[] = [];
  for (let position = 0; position < EARTH_SLOTS; position++) {
    const earthBead = makeBeadElement("bead earth-bead", `${rodIndex}번째 자리 아랫알 ${position + 1}`);
    earthSection.appendChild(earthBead);
    earthBeads.push(earthBead);
  }

  attachHeavenInteraction(heavenSection, heavenBead, abacus, rodIndex, lock);
  attachEarthInteraction(earthSection, earthBeads, abacus, rodIndex, lock);

  rod.append(heavenSection, bar, earthSection);
  return { rod, elements: { heavenBead, earthBeads } };
}

function applyRodState(elements: RodElements, state: RodState): void {
  const heavenY = state.heaven ? HEAVEN_TRACK_HEIGHT - BEAD_HEIGHT : 0;
  elements.heavenBead.style.setProperty("--y", `${heavenY}px`);
  elements.heavenBead.classList.toggle("active", state.heaven);

  elements.earthBeads.forEach((bead, position) => {
    const active = position < state.earth;
    bead.style.setProperty("--y", `${earthBeadOffset(position, state.earth)}px`);
    bead.classList.toggle("active", active);
  });
}

/** Renders the frame at its natural size, then scales the whole thing down
 * uniformly to fit whatever space is actually available — so it never gets
 * clipped by a small viewport or a device rotation, and never needs its own
 * scrollbar just to be seen. */
function fitFrameToViewport(viewport: HTMLElement, frame: HTMLElement): () => void {
  const recompute = () => {
    frame.style.transform = "none";
    const nativeWidth = frame.offsetWidth;
    const nativeHeight = frame.offsetHeight;
    if (nativeWidth === 0 || nativeHeight === 0) return;
    // Measured against the document's layout viewport rather than an
    // ancestor's clientWidth (the wrapping elements are content-sized flex
    // children, so measuring an ancestor would circularly report the
    // frame's own width back) and rather than window.innerWidth/innerHeight
    // (on mobile browsers these shift when an on-screen keyboard opens for
    // the rod-count input; documentElement.clientWidth/Height stay tied to
    // the actual layout viewport regardless).
    const root = document.documentElement;
    const bodyStyle = window.getComputedStyle(document.body);
    const horizontalPadding = parseFloat(bodyStyle.paddingLeft) + parseFloat(bodyStyle.paddingRight);
    const availableWidth = root.clientWidth - horizontalPadding;
    const availableHeight = Math.max(160, root.clientHeight - viewport.getBoundingClientRect().top - 24);
    const scale = Math.min(1, availableWidth / nativeWidth, availableHeight / nativeHeight);
    frame.style.transform = `scale(${scale})`;
    viewport.style.height = `${nativeHeight * scale}px`;
  };

  recompute();
  window.addEventListener("resize", recompute);
  window.addEventListener("orientationchange", recompute);
  return () => {
    window.removeEventListener("resize", recompute);
    window.removeEventListener("orientationchange", recompute);
  };
}

export function mountAbacus(container: HTMLElement, abacus: Abacus): () => void {
  container.innerHTML = "";

  const valueDisplay = document.createElement("div");
  valueDisplay.className = "value-display";

  const frame = document.createElement("div");
  frame.className = "abacus-frame";
  const lock = createPointerLock(frame);

  const viewport = document.createElement("div");
  viewport.className = "abacus-viewport";
  viewport.appendChild(frame);

  const rodCount = abacus.getRodCount();
  const rodElements: RodElements[] = [];
  for (let i = 0; i < rodCount; i++) {
    const { rod, elements } = buildRodDOM(abacus, i, rodCount, lock);
    frame.appendChild(rod);
    rodElements.push(elements);
  }
  attachResetSwipe(frame, abacus, lock);

  container.append(valueDisplay, viewport);

  const render = (rods: ReadonlyArray<RodState>) => {
    rods.forEach((state, i) => applyRodState(rodElements[i], state));
    valueDisplay.textContent = abacus.getValue().toString();
  };

  const unsubscribe = abacus.onChange(render);
  render(abacus.getRods());
  const stopFitting = fitFrameToViewport(viewport, frame);

  return () => {
    unsubscribe();
    stopFitting();
  };
}
