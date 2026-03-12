import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sun, Moon } from "lucide-react";
import { gsap } from "gsap";
import fontData from "./font.json";
import earthMaskSrc from "./texture.js";

type ResponsiveLayout = {
  fov: number;
  cameraZ: number;
  globeScale: number;
  ringScale: number;
  minDistance: number;
  maxDistance: number;
  rotateSpeed: number;
  zoomSpeed: number;
  autoRotateSpeed: number;
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const themeArcRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const themeTransitionRef = useRef({
    value: 0,
    from: 0,
    to: 0,
    sweep: 1,
  });
  const themeTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const isFirstThemeRun = useRef(true);

  useEffect(() => {
    const target = isDarkMode ? 1 : 0;
    themeTimelineRef.current?.kill();
    const transition = themeTransitionRef.current;
    const current = transition.value;
    transition.from = current;
    transition.to = target;
    transition.sweep = isFirstThemeRun.current ? 1 : 0;

    const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
    if (isFirstThemeRun.current) {
      transition.value = target;
      transition.from = target;
      transition.to = target;
      transition.sweep = 1;
    } else {
      transition.sweep = -0.12;
      tl.to(
        transition,
        {
          sweep: 1.12,
          duration: 1.48,
          ease: "sine.inOut",
        },
        0,
      ).to(
        transition,
        {
          value: target,
          duration: 1.34,
          ease: "sine.inOut",
        },
        0.08,
      );
    }

    const arcEl = themeArcRef.current;
    if (arcEl && !isFirstThemeRun.current) {
      gsap.set(arcEl, {
        opacity: 0,
        rotate: isDarkMode ? -168 : 168,
        scale: 1.05,
      });

      tl.to(arcEl, {
        opacity: 0.46,
        duration: 0.34,
        ease: "sine.out",
      }, 0)
        .to(
          arcEl,
          {
            rotate: isDarkMode ? 52 : -52,
            scale: 1.095,
            duration: 1.42,
            ease: "sine.inOut",
          },
          0,
        )
        .to(
          arcEl,
          {
            opacity: 0,
            duration: 0.42,
            ease: "sine.out",
          },
          0.92,
        );
    }
    tl.call(() => {
      transition.value = target;
      transition.from = target;
      transition.to = target;
      transition.sweep = 1;
    });

    themeTimelineRef.current = tl;
    isFirstThemeRun.current = false;

    return () => {
      tl.kill();
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (!containerRef.current) return;
    let isDisposed = false;
    const initialRect = containerRef.current.getBoundingClientRect();
    const initialWidth = Math.max(1, Math.floor(initialRect.width));
    const initialHeight = Math.max(1, Math.floor(initialRect.height));

    // Scene Setup
    const scene = new THREE.Scene();
    const initialBg = new THREE.Color("#f7f7f7");
    scene.background = initialBg.clone();
    scene.fog = new THREE.Fog(initialBg.clone(), 4, 10);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      initialWidth / initialHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 5);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.touchAction = "none";
    containerRef.current.appendChild(renderer.domElement);

    // CSS2D Renderer
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(initialWidth, initialHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    containerRef.current.appendChild(labelRenderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, containerRef.current);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.7;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8;
    controls.enablePan = false;
    controls.target.set(0, 0, 0);
    controls.minDistance = 2.5;
    controls.maxDistance = 8;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;

    const getResponsiveLayout = (width: number): ResponsiveLayout => {
      if (width < 420) {
        return {
          fov: 60,
          cameraZ: 6.5,
          globeScale: 0.74,
          ringScale: 0.8,
          minDistance: 4.7,
          maxDistance: 11.8,
          rotateSpeed: 0.52,
          zoomSpeed: 0.62,
          autoRotateSpeed: 0.5,
        };
      }

      if (width < 768) {
        return {
          fov: 56,
          cameraZ: 6.1,
          globeScale: 0.82,
          ringScale: 0.86,
          minDistance: 4.3,
          maxDistance: 10.9,
          rotateSpeed: 0.55,
          zoomSpeed: 0.66,
          autoRotateSpeed: 0.56,
        };
      }

      if (width < 1200) {
        return {
          fov: 50,
          cameraZ: 5.5,
          globeScale: 0.92,
          ringScale: 0.94,
          minDistance: 3.5,
          maxDistance: 9.4,
          rotateSpeed: 0.66,
          zoomSpeed: 0.75,
          autoRotateSpeed: 0.7,
        };
      }

      return {
        fov: 45,
        cameraZ: 5,
        globeScale: 1,
        ringScale: 1,
        minDistance: 2.8,
        maxDistance: 8.4,
        rotateSpeed: 0.7,
        zoomSpeed: 0.8,
        autoRotateSpeed: 0.8,
      };
    };

    // Groups
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const textRingGroup = new THREE.Group();
    scene.add(textRingGroup);

    const earthMaskTexture = new THREE.TextureLoader().load(earthMaskSrc);
    earthMaskTexture.wrapS = THREE.RepeatWrapping;
    earthMaskTexture.wrapT = THREE.ClampToEdgeWrapping;
    earthMaskTexture.minFilter = THREE.LinearMipmapLinearFilter;
    earthMaskTexture.magFilter = THREE.LinearFilter;
    earthMaskTexture.generateMipmaps = true;
    earthMaskTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    earthMaskTexture.needsUpdate = true;

    // 1. The Main Globe (ShaderMaterial)
    const globeGeometry = new THREE.SphereGeometry(1.4, 128, 128);
    const globeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        themeFrom: { value: 0.0 },
        themeTo: { value: 0.0 },
        themeSweep: { value: 1.0 },
        themeSweepSoftness: { value: 0.095 },
        themeSweepFromRight: { value: 1.0 },
        earthMask: { value: earthMaskTexture },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float themeFrom;
        uniform float themeTo;
        uniform float themeSweep;
        uniform float themeSweepSoftness;
        uniform float themeSweepFromRight;
        uniform sampler2D earthMask;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          float sweepUv = mix(vUv.x, 1.0 - vUv.x, themeSweepFromRight);
          float keepFromMix = smoothstep(
            themeSweep - themeSweepSoftness,
            themeSweep + themeSweepSoftness,
            sweepUv
          );
          float localThemeProgress = mix(themeTo, themeFrom, keepFromMix);

          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
          
          vec3 lightBase = vec3(0.98, 0.98, 0.98);
          vec3 lightRim = vec3(1.0, 1.0, 1.0);
          
          vec3 darkBase = vec3(0.05, 0.05, 0.05);
          vec3 darkRim = vec3(0.3, 0.3, 0.3);
          
          vec3 baseColor = mix(lightBase, darkBase, localThemeProgress);
          vec3 rimColor = mix(lightRim, darkRim, localThemeProgress);
          
          vec3 finalColor = mix(baseColor, rimColor, fresnel * 0.8);
          
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          float diff = max(dot(normal, lightDir), 0.0);
          finalColor -= vec3(0.05) * (1.0 - diff);

          vec2 maskUv = vec2(fract(vUv.x), vUv.y);
          float landMask = texture2D(earthMask, maskUv).r;
          float landEdge = max(fwidth(landMask), 0.015);
          float land = smoothstep(0.5 - landEdge, 0.5 + landEdge, landMask);

          vec2 grid = vUv * vec2(360.0, 180.0);
          vec2 cell = fract(grid) - 0.5;
          float dist = length(cell);
          float dotAA = max(fwidth(dist), 0.01);
          float dot = 1.0 - smoothstep(0.29 - dotAA, 0.29 + dotAA, dist);
          float mapDots = land * dot;

          vec3 mapDotColor = mix(vec3(0.07), vec3(0.93), localThemeProgress);
          finalColor = mix(finalColor, mapDotColor, mapDots * 0.95);
          
          gl_FragColor = vec4(finalColor, 0.98);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      extensions: { derivatives: true },
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globe);

    // 3. City Markers
    const cities = [
      { name: "London", lat: 51.5072, lon: -0.1276 },
      { name: "New York", lat: 40.7128, lon: -74.006 },
      { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
      { name: "Sydney", lat: -33.8688, lon: 151.2093 },
    ];

    const latLonToVector3 = (lat: number, lon: number, radius: number) => {
      // Match SphereGeometry UV convention used by the earth mask shader.
      const u = THREE.MathUtils.euclideanModulo(lon + 180, 360) / 360;
      const v = THREE.MathUtils.clamp((lat + 90) / 180, 0, 1);
      const phi = u * Math.PI * 2;
      const theta = (1 - v) * Math.PI;
      return new THREE.Vector3(
        -(radius * Math.cos(phi) * Math.sin(theta)),
        radius * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
      );
    };

    const cityLabels: { label: CSS2DObject; anchorLocal: THREE.Vector3 }[] = [];

    cities.forEach((city) => {
      const div = document.createElement("div");
      div.className = "city-label-container transition-opacity duration-300";
      div.innerHTML = `
        <div class="city-name">${city.name}</div>
        <div class="city-arrow"></div>
        <div class="city-dot"></div>
      `;

      const label = new CSS2DObject(div);
      const anchorLocal = latLonToVector3(city.lat, city.lon, 1.405);
      const labelLocal = anchorLocal.clone().normalize().multiplyScalar(1.455);
      label.position.copy(labelLocal);
      globeGroup.add(label);

      cityLabels.push({ label, anchorLocal });
    });

    const applyResponsiveLayout = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const layout = getResponsiveLayout(width);

      camera.aspect = width / height;
      camera.fov = layout.fov;
      const offset = camera.position.clone().sub(controls.target);
      if (offset.lengthSq() < 0.0001) {
        offset.set(0, 0, 1);
      }
      offset.setLength(layout.cameraZ);
      camera.position.copy(controls.target.clone().add(offset));
      camera.updateProjectionMatrix();

      globeGroup.scale.setScalar(layout.globeScale);
      textRingGroup.scale.setScalar(layout.ringScale);

      controls.minDistance = layout.minDistance;
      controls.maxDistance = layout.maxDistance;
      controls.rotateSpeed = layout.rotateSpeed;
      controls.zoomSpeed = layout.zoomSpeed;
      controls.autoRotateSpeed = layout.autoRotateSpeed;
      controls.update();

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.5 : 2));
      renderer.setSize(width, height, false);
      labelRenderer.setSize(width, height);
    };

    // 4. Orbiting Text Ring
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const loader = new FontLoader();

    try {
      const font = loader.parse(fontData);
      const baseText = "Vercel Ship 2026 . ";
      const radius = 1.9;
      const charMap = new Map<
        string,
        { geometry: THREE.BufferGeometry; width: number }
      >();

      let baseWidth = 0;
      const chars = [];

      for (let i = 0; i < baseText.length; i++) {
        const char = baseText[i];
        if (!charMap.has(char)) {
          if (char === " ") {
            charMap.set(char, {
              geometry: new THREE.BufferGeometry(),
              width: 0.04,
            });
          } else {
            const geometry = new TextGeometry(char, {
              font: font,
              size: 0.06,
              depth: 0.002,
              curveSegments: 4,
              bevelEnabled: false,
            });
            geometry.computeBoundingBox();
            const width =
              geometry.boundingBox!.max.x - geometry.boundingBox!.min.x;

            const xOffset = -0.5 * width;
            const yOffset =
              -0.5 *
              (geometry.boundingBox!.max.y - geometry.boundingBox!.min.y);
            geometry.translate(xOffset, yOffset, 0);

            charMap.set(char, { geometry, width: width + 0.015 }); // Add letter spacing
          }
        }
        const charData = charMap.get(char)!;
        chars.push({ char, ...charData });
        baseWidth += charData.width;
      }

      const circumference = Math.PI * 2 * radius;
      const repeatCount = Math.max(1, Math.floor(circumference / baseWidth));
      const extraSpace = circumference - baseWidth * repeatCount;
      const spacingPerChar = extraSpace / (chars.length * repeatCount);

      let currentAngle = 0;

      for (let r = 0; r < repeatCount; r++) {
        for (let i = 0; i < chars.length; i++) {
          const { char, geometry, width } = chars[i];

          const charAngle = currentAngle - width / 2 / radius;

          if (char !== " ") {
            const mesh = new THREE.Mesh(geometry, textMaterial);
            mesh.position.x = Math.cos(charAngle) * radius;
            mesh.position.z = Math.sin(charAngle) * radius;

            // Lay flat on XZ plane
            mesh.rotation.x = -Math.PI / 2;
            // Rotate to face outward
            mesh.rotation.z = -charAngle + Math.PI / 2;

            textRingGroup.add(mesh);
          }

          currentAngle -= (width + spacingPerChar) / radius;
        }
      }
    } catch (err) {
      console.error("Failed to parse font:", err);
    }

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const lightBg = new THREE.Color("#f7f7f7");
    const darkBg = new THREE.Color("#0a0a0a");
    const lightDot = new THREE.Color(0x111111);
    const darkDot = new THREE.Color(0xeeeeee);
    applyResponsiveLayout();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.1); // Cap delta to 0.1s
      const { value: currentThemeProgress, from, to, sweep } = themeTransitionRef.current;

      if (scene.background instanceof THREE.Color) {
        scene.background.lerpColors(lightBg, darkBg, currentThemeProgress);
      }
      if (scene.fog) {
        scene.fog.color.lerpColors(lightBg, darkBg, currentThemeProgress);
      }
      globeMaterial.uniforms.themeFrom.value = from;
      globeMaterial.uniforms.themeTo.value = to;
      globeMaterial.uniforms.themeSweep.value = sweep;
      textMaterial.color.lerpColors(lightDot, darkDot, currentThemeProgress);

      // Orbiting text motion
      textRingGroup.rotation.y += 0.1 * delta;

      // Keep text ring tilted slightly for better view
      textRingGroup.rotation.x = 0.1;
      textRingGroup.rotation.z = 0.05;

      controls.update();

      const cameraPos = camera.position;
      cityLabels.forEach(({ label, anchorLocal }) => {
        const worldAnchor = anchorLocal.clone().applyMatrix4(globeGroup.matrixWorld);
        const normal = worldAnchor.clone().normalize();
        const viewDir = cameraPos.clone().sub(worldAnchor).normalize();

        if (normal.dot(viewDir) < 0.1) {
          label.element.style.opacity = "0";
        } else {
          label.element.style.opacity = "1";
        }
      });

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => applyResponsiveLayout();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      themeTimelineRef.current?.kill();
      earthMaskTexture.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      textMaterial.dispose();
      if (containerRef.current) {
        if (containerRef.current.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
        if (containerRef.current.contains(labelRenderer.domElement)) {
          containerRef.current.removeChild(labelRenderer.domElement);
        }
      }
      scene.clear();
    };
  }, []);

  return (
    <div
      className={`theme-container relative w-full h-[100dvh] min-h-screen overflow-hidden ${isDarkMode ? "dark" : ""}`}
    >
      <div ref={themeArcRef} className="theme-arc absolute inset-[-72%] pointer-events-none z-30" />

      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors backdrop-blur-md cursor-pointer"
      >
        {isDarkMode ? (
          <Sun className="w-5 h-5 text-white" />
        ) : (
          <Moon className="w-5 h-5 text-black" />
        )}
      </button>

      <div ref={containerRef} className="absolute inset-0 cursor-move z-0" />

      {/* Center Logo Overlay */}
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-10">
        <div className="ship-text-overlay">
          <span className="mr-3 text-[clamp(2rem,7vw,5rem)]">▲</span>
          <span className="tracking-widest text-[clamp(2.8rem,11vw,7rem)]">
            SHIP
          </span>
        </div>
      </div>

      <style>{`
        .theme-container {
          --label-bg: #000;
          --label-text: #fff;
          --overlay-scanline: #111;
          background-color: #f7f7f7;
          transition: background-color 1.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .theme-arc {
          opacity: 0;
          transform-origin: 100% 0%;
          background: conic-gradient(
            from 0deg at 100% 0%,
            rgba(0, 0, 0, 0) 0deg 322deg,
            rgba(0, 0, 0, 0.68) 336deg,
            rgba(0, 0, 0, 0.16) 350deg,
            rgba(0, 0, 0, 0) 360deg
          );
          mix-blend-mode: multiply;
          filter: blur(8px) saturate(118%);
          will-change: opacity, transform;
        }
        .theme-container.dark {
          --label-bg: #fff;
          --label-text: #000;
          --overlay-scanline: #eee;
          background-color: #0a0a0a;
        }
        .theme-container.dark .theme-arc {
          mix-blend-mode: screen;
          background: conic-gradient(
            from 0deg at 100% 0%,
            rgba(255, 255, 255, 0) 0deg 322deg,
            rgba(255, 255, 255, 0.82) 336deg,
            rgba(255, 255, 255, 0.18) 350deg,
            rgba(255, 255, 255, 0) 360deg
          );
        }

        .city-label-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: -12px;
        }
        .city-name {
          background: var(--label-bg);
          color: var(--label-text);
          font-size: clamp(9px, 1.1vw, 11px);
          padding: clamp(3px, 0.55vw, 4px) clamp(5px, 0.8vw, 6px);
          border-radius: 2px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          white-space: nowrap;
          letter-spacing: 0.05em;
          transition: background-color 1.25s ease-in-out, color 1.25s ease-in-out;
        }
        .city-arrow {
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid var(--label-bg);
          margin-bottom: 2px;
          transition: border-top-color 1.25s ease-in-out;
        }
        .city-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--label-bg);
          transition: background-color 1.25s ease-in-out;
        }
        @media (max-width: 640px) {
          .city-label-container {
            margin-top: -10px;
          }
          .city-arrow {
            border-left-width: 3px;
            border-right-width: 3px;
            border-top-width: 3px;
          }
          .city-dot {
            width: 3px;
            height: 3px;
          }
        }
        
        .ship-text-overlay {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: bold;
          color: var(--label-bg);
          display: flex;
          align-items: center;
          transition: color 1.25s ease-in-out;
          
          /* Scanline effect */
          background: repeating-linear-gradient(
            to bottom,
            var(--overlay-scanline),
            var(--overlay-scanline) 4px,
            transparent 4px,
            transparent 7px
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0px 4px 24px rgba(255,255,255,0.8));
        }
        
        .theme-container.dark .ship-text-overlay {
          filter: drop-shadow(0px 4px 24px rgba(0,0,0,0.8));
        }
      `}</style>
    </div>
  );
}
