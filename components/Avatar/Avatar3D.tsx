"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group, SkinnedMesh } from "three";
import Avatar2D, { type AvatarState } from "./Avatar2D";

/**
 * Phase B avatar: a Ready Player Me rig with ARKit blendshapes.
 * Mouth is driven by a pseudo-amplitude signal while TTS plays — not
 * phoneme-accurate, but at conversational pace it reads as alive.
 *
 * Model resolution order (first that actually loads):
 *   1. NEXT_PUBLIC_RPM_AVATAR_URL (your own readyplayer.me avatar)
 *   2. /avatar/interviewer.glb (drop a GLB into public/avatar/)
 *   3. Ready Player Me's sample avatar CDN
 * If none are reachable we quietly render the 2D avatar instead of crashing —
 * errors inside the WebGL canvas can't be caught by normal error boundaries.
 */
const CANDIDATE_URLS = [
  process.env.NEXT_PUBLIC_RPM_AVATAR_URL,
  "/avatar/interviewer.glb",
  "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus%20Visemes",
].filter((u): u is string => Boolean(u));

function setMorph(mesh: SkinnedMesh, name: string, value: number) {
  const dict = mesh.morphTargetDictionary;
  const infl = mesh.morphTargetInfluences;
  if (!dict || !infl) return;
  const idx = dict[name];
  if (idx !== undefined) infl[idx] = value;
}

function getMorph(mesh: SkinnedMesh, name: string): number {
  const dict = mesh.morphTargetDictionary;
  const infl = mesh.morphTargetInfluences;
  if (!dict || !infl) return 0;
  const idx = dict[name];
  return idx !== undefined ? infl[idx] : 0;
}

function AvatarModel({ state, url }: { state: AvatarState; url: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<Group>(null);
  const blinkRef = useRef({ nextAt: 2.5, phase: 0 });

  const morphMeshes = useMemo(() => {
    const found: SkinnedMesh[] = [];
    scene.traverse((obj) => {
      const mesh = obj as SkinnedMesh;
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) found.push(mesh);
    });
    return found;
  }, [scene]);

  useFrame(({ clock, pointer }, delta) => {
    const t = clock.elapsedTime;

    // mouth: layered sines make an irregular, speech-like rhythm
    const speaking = state === "speaking";
    const target = speaking
      ? Math.max(
          0.04,
          0.22 + 0.18 * Math.sin(t * 11.3) + 0.14 * Math.sin(t * 17.7 + 1.3) + 0.06 * Math.sin(t * 5.1)
        )
      : 0;

    // blink: quick close-open every 2.5–5.5s
    const blink = blinkRef.current;
    let blinkAmount = 0;
    if (t > blink.nextAt) {
      blink.phase += delta / 0.13;
      blinkAmount = Math.sin(Math.min(blink.phase, 1) * Math.PI);
      if (blink.phase >= 1) {
        blink.phase = 0;
        blink.nextAt = t + 2.5 + Math.random() * 3;
      }
    }

    for (const mesh of morphMeshes) {
      const current = getMorph(mesh, "jawOpen");
      const next = current + (target - current) * Math.min(1, delta * 14);
      setMorph(mesh, "jawOpen", next);
      setMorph(mesh, "mouthOpen", next * 0.7);
      setMorph(mesh, "eyeBlinkLeft", blinkAmount);
      setMorph(mesh, "eyeBlinkRight", blinkAmount);
      // a hint of engagement while listening
      setMorph(mesh, "browInnerUp", state === "listening" ? 0.25 : 0);
      setMorph(mesh, "mouthSmile", state === "listening" ? 0.18 : 0.08);
    }

    // breathing + subtle parallax toward the cursor
    const group = groupRef.current;
    if (group) {
      group.position.y = -1.58 + Math.sin(t * 1.4) * 0.004;
      group.rotation.y += (pointer.x * 0.18 - group.rotation.y) * Math.min(1, delta * 2.5);
      group.rotation.x += (-pointer.y * 0.06 - group.rotation.x) * Math.min(1, delta * 2.5);
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.58, 0]}>
      <primitive object={scene} />
    </group>
  );
}

class GlbErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Probe candidate GLB URLs and return the first reachable one (null = none). */
function useResolvedModelUrl(): string | null | "checking" {
  const [resolved, setResolved] = useState<string | null | "checking">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const url of CANDIDATE_URLS) {
        try {
          const res = await fetch(url, { cache: "force-cache" });
          const type = res.headers.get("content-type") ?? "";
          // Next dev serves an HTML 404 page for missing public files
          if (res.ok && !type.includes("text/html")) {
            if (!cancelled) setResolved(url);
            return;
          }
        } catch {
          /* unreachable — try the next candidate */
        }
      }
      if (!cancelled) setResolved(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return resolved;
}

export default function Avatar3D({ state, name }: { state: AvatarState; name: string }) {
  const modelUrl = useResolvedModelUrl();

  // Not reachable (or still probing) → the 2D avatar carries the call.
  if (modelUrl === "checking" || modelUrl === null) {
    return <Avatar2D state={state} name={name} />;
  }

  return (
    <GlbErrorBoundary fallback={<Avatar2D state={state} name={name} />}>
      <div
        className={`relative h-full w-full overflow-hidden rounded-xl border bg-surface-raised transition-colors ${
          state === "listening"
            ? "border-sage/50"
            : state === "speaking"
              ? "border-accent/50 speaking-glow"
              : "border-line"
        }`}
      >
        {state === "listening" && (
          <>
            <span className="pulse-ring" />
            <span className="pulse-ring" />
            <span className="pulse-ring" />
          </>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 30% 10%, rgba(213,162,78,0.16), transparent 65%)",
          }}
        />
        <Canvas camera={{ position: [0, 0.04, 0.72], fov: 26 }} className="relative">
          <ambientLight intensity={0.55} />
          {/* warm key = the desk lamp; cool teal fill from the room */}
          <directionalLight position={[1.4, 1.8, 2]} color="#ffd9a0" intensity={1.7} />
          <directionalLight position={[-2, 0.8, -1]} color="#7fb4a8" intensity={0.5} />
          <Suspense fallback={null}>
            <AvatarModel state={state} url={modelUrl} />
          </Suspense>
        </Canvas>
        <div className="absolute bottom-3 left-3 rounded-md bg-background/70 px-2.5 py-1 font-mono text-xs tracking-wider text-foreground/90 backdrop-blur-sm">
          {name}
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-background/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              state === "speaking"
                ? "bg-accent"
                : state === "listening"
                  ? "bg-sage"
                  : state === "thinking"
                    ? "bg-accent/60"
                    : "bg-muted/60"
            }`}
          />
          <span className="text-muted">{state}</span>
        </div>
      </div>
    </GlbErrorBoundary>
  );
}
