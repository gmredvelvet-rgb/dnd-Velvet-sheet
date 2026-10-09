/** Shared motion direction. Every sheet owns its effects, listeners and animation lifetime. */
const mounted = new WeakMap();
const INTERACTIVE = "button, [role='button'], .nav-item, .inv-slot, .pd-slot, .stat, .skill-row, .save-row, .spell-entry, .feature-entry";

export function motionSnapshot(hp = {}, level = 0) {
  const value = Number(hp.value) || 0;
  const max = Math.max(0, Number(hp.max) || 0);
  const pct = max ? Math.max(0, Math.min(100, value / max * 100)) : 0;
  const health = !max ? "unknown" : value <= 0 ? "zero" : pct <= 10 ? "critical" : pct <= 25 ? "wounded" : "healthy";
  return { value, max, pct, health, level: Number(level) || 0 };
}

export function mountSheetMotion(element, { snapshot, previous, enter = false, labels = {} } = {}) {
  const root = element.matches?.(".dnd-sheet") ? element : element.querySelector(".dnd-sheet");
  if (!root) return { destroy() {} };
  mounted.get(root)?.destroy();
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const abort = new view.AbortController();
  const media = view.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = view.matchMedia("(hover: hover) and (pointer: fine)");
  const animations = new Set();
  const decorations = new Set();
  let destroyed = false, inView = true, frame = 0, pointer = null;
  snapshot ??= motionSnapshot();
  root.dataset.health = snapshot.health;

  function decorate(parent, className) {
    if (!parent) return null;
    const node = doc.createElement("span");
    node.className = className;
    node.setAttribute("aria-hidden", "true");
    parent.append(node);
    decorations.add(node);
    return node;
  }
  function removeDecoration(node) {
    node?.remove();
    decorations.delete(node);
  }
  function animate(node, frames, options) {
    if (!node?.animate || root.dataset.motion !== "active") return;
    const animation = node.animate(frames, { easing: "cubic-bezier(.2,.7,.2,1)", ...options });
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    return animation;
  }
  function resetPointer() {
    pointer = null;
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    root.classList.remove("motion-pointer");
    root.style.removeProperty("--portrait-drift-x");
    root.style.removeProperty("--portrait-drift-y");
  }
  function updateActivity() {
    const active = !destroyed && !media.matches && !doc.hidden && inView && root.isConnected;
    root.dataset.motion = media.matches ? "reduced" : active ? "active" : "paused";
    if (!active) {
      resetPointer();
      // Cancel transient effects on preference changes; pause them when a window is hidden.
      for (const animation of animations) media.matches ? animation.cancel() : animation.pause();
      if (media.matches) for (const node of decorations) if (node.matches(".motion-hit, .motion-impact")) removeDecoration(node);
    } else for (const animation of animations) if (animation.playState === "paused") animation.play();
  }

  const portrait = root.querySelector(".portrait-wrap");
  const atmosphere = decorate(portrait, "motion-atmosphere");
  if (atmosphere) {
    decorate(atmosphere, "motion-aura motion-aura-gold");
    decorate(atmosphere, "motion-aura motion-aura-blue");
    decorate(atmosphere, "motion-orbit");
    // Seven preallocated CSS motes: no spawn timer or particle accumulation.
    for (let i = 0; i < 7; i++) {
      const mote = decorate(atmosphere, "motion-mote");
      mote.style.setProperty("--mote-x", `${12 + i * 12}%`);
      mote.style.setProperty("--mote-drift", `${(i % 2 ? 1 : -1) * (12 + i * 3)}px`);
      mote.style.setProperty("--mote-duration", `${7 + i % 4}s`);
      mote.style.setProperty("--mote-delay", `${-i * 1.7}s`);
    }
  }
  const spotlight = decorate(root, "motion-spotlight");
  decorate(root.querySelector(".char-level-diamond"), "motion-crown");
  const header = root.querySelector(".sheet-masthead");
  const status = doc.createElement("span");
  status.className = "sheet-health-status";
  status.dataset.health = snapshot.health;
  status.textContent = labels[snapshot.health] ?? "";
  status.hidden = !status.textContent;
  header?.append(status);
  decorations.add(status);
  updateActivity();

  const observer = view.IntersectionObserver ? new view.IntersectionObserver(entries => {
    inView = entries[0]?.isIntersecting ?? false;
    updateActivity();
  }) : null;
  observer?.observe(root);
  doc.addEventListener("visibilitychange", updateActivity, { signal: abort.signal });
  media.addEventListener("change", updateActivity, { signal: abort.signal });

  root.addEventListener("pointermove", event => {
    if (root.dataset.motion !== "active" || !finePointer.matches || event.pointerType !== "mouse") return;
    pointer = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = view.requestAnimationFrame(() => {
      frame = 0;
      if (!pointer || destroyed) return;
      const box = root.getBoundingClientRect();
      const x = pointer.x - box.left, y = pointer.y - box.top;
      spotlight.style.transform = `translate3d(${x - 180}px, ${y - 180}px, 0)`;
      root.style.setProperty("--portrait-drift-x", `${(x / Math.max(1, box.width) - .5) * 4}px`);
      root.style.setProperty("--portrait-drift-y", `${(y / Math.max(1, box.height) - .5) * 3}px`);
      root.classList.add("motion-pointer");
    });
  }, { passive: true, signal: abort.signal });
  root.addEventListener("pointerleave", resetPointer, { signal: abort.signal });
  root.addEventListener("click", event => {
    if (root.dataset.motion !== "active" || event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const target = event.target.closest(INTERACTIVE);
    if (!target || target.disabled || !root.contains(target)) return;
    // Use a light overlay rather than changing transforms owned by rolls or drag-and-drop.
    removeDecoration(target.querySelector(":scope > .motion-hit"));
    const hit = decorate(target, "motion-hit");
    hit.addEventListener("animationend", () => removeDecoration(hit), { once: true, signal: abort.signal });
  }, { signal: abort.signal });

  if (enter) {
    const groups = [root.querySelector(".aaa-sidebar, .velvet-sidebar"), portrait, header];
    groups.forEach((node, index) => animate(node, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 480, delay: index * 65, fill: "backwards" }));
    root.querySelectorAll(".tab.active .attr-quick-box, .tab.active .stat, .tab.active .progression-card").forEach((node, index) => {
      animate(node, [{ opacity: 0, translate: "0 8px" }, { opacity: 1, translate: "0 0" }], { duration: 360, delay: 130 + index * 24, fill: "backwards" });
    });
  }
  const impact = previous && (snapshot.level > previous.level ? "ascension" : snapshot.value !== previous.value ? snapshot.value < previous.value ? "damage" : "heal" : null);
  if (impact && root.dataset.motion === "active") {
    const light = decorate(portrait, `motion-impact motion-impact-${impact}`);
    const badge = root.querySelector(".char-level-diamond");
    if (impact === "ascension") animate(badge, [{ scale: 1 }, { scale: 1.12, offset: .35 }, { scale: 1 }], { duration: 900 });
    light?.addEventListener("animationend", () => removeDecoration(light), { once: true, signal: abort.signal });
    const fill = root.querySelector(".hp-fill");
    if (fill && impact !== "ascension") animate(fill, [{ width: `${previous.pct}%` }, { width: `${snapshot.pct}%` }], { duration: impact === "damage" ? 480 : 700 });
  }

  const controller = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      abort.abort();
      observer?.disconnect();
      resetPointer();
      animations.forEach(animation => animation.cancel());
      animations.clear();
      decorations.forEach(node => node.remove());
      decorations.clear();
      delete root.dataset.motion;
      delete root.dataset.health;
      mounted.delete(root);
    }
  };
  mounted.set(root, controller);
  return controller;
}
