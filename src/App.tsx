import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sun, Moon } from 'lucide-react';
import fontData from './font.json';
// @ts-ignore
import earthImageSrc from './earth-water.png';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const targetThemeProgress = useRef(0);

  useEffect(() => {
    targetThemeProgress.current = isDarkMode ? 1 : 0;
  }, [isDarkMode]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    const initialBg = new THREE.Color('#f7f7f7');
    scene.background = initialBg.clone();
    scene.fog = new THREE.Fog(initialBg.clone(), 4, 10);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // CSS2D Renderer
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    containerRef.current.appendChild(labelRenderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, labelRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 8;

    // Groups
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    
    const textRingGroup = new THREE.Group();
    scene.add(textRingGroup);

    // 1. The Main Globe (ShaderMaterial)
    const globeGeometry = new THREE.SphereGeometry(1.4, 128, 128);
    const globeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        themeProgress: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float themeProgress;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
          
          vec3 lightBase = vec3(0.98, 0.98, 0.98);
          vec3 lightRim = vec3(1.0, 1.0, 1.0);
          
          vec3 darkBase = vec3(0.05, 0.05, 0.05);
          vec3 darkRim = vec3(0.3, 0.3, 0.3);
          
          vec3 baseColor = mix(lightBase, darkBase, themeProgress);
          vec3 rimColor = mix(lightRim, darkRim, themeProgress);
          
          vec3 finalColor = mix(baseColor, rimColor, fresnel * 0.8);
          
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          float diff = max(dot(normal, lightDir), 0.0);
          finalColor -= vec3(0.05) * (1.0 - diff);
          
          gl_FragColor = vec4(finalColor, 0.98);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globe);

    // 2. Earth Map Dots
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    
    // Generate procedural dots if image fails, but try image first
    const createDots = (imageData?: ImageData) => {
      const dots = [];
      if (imageData) {
        for (let y = 0; y < imageData.height; y += 6) {
          for (let x = 0; x < imageData.width; x += 6) {
            const index = (y * imageData.width + x) * 4;
            const r = imageData.data[index];
            const a = imageData.data[index + 3];
            // Check if pixel is dark (r < 128) and opaque (a > 128)
            if (r < 128 && a > 128) {
              const lat = 90 - (y / imageData.height) * 180;
              const lon = (x / imageData.width) * 360 - 180;
              dots.push({ lat, lon });
            }
          }
        }
      }
      
      // Fallback if no dots were generated (e.g. image was all white or transparent)
      if (dots.length === 0) {
        console.warn("No dots generated from image, using fallback");
        for (let i = 0; i < 2000; i++) {
          const lat = Math.random() * 180 - 90;
          const lon = Math.random() * 360 - 180;
          dots.push({ lat, lon });
        }
      } else {
        console.log(`Generated ${dots.length} dots from image`);
      }
      
      const dotGeometry = new THREE.CircleGeometry(0.006, 6);
      const instancedMesh = new THREE.InstancedMesh(dotGeometry, dotMaterial, dots.length);
      
      const dummy = new THREE.Object3D();
      const radius = 1.405;
      
      dots.forEach((dot, i) => {
        const phi = (90 - dot.lat) * (Math.PI / 180);
        const theta = (dot.lon + 180) * (Math.PI / 180);
        
        dummy.position.x = -(radius * Math.sin(phi) * Math.cos(theta));
        dummy.position.z = (radius * Math.sin(phi) * Math.sin(theta));
        dummy.position.y = (radius * Math.cos(phi));
        
        dummy.lookAt(0, 0, 0);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      });
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      globeGroup.add(instancedMesh);
    };

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        createDots();
        return;
      }
      ctx.drawImage(image, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        createDots(imageData);
      } catch (e) {
        console.warn("Canvas tainted or getImageData failed. Using fallback dots.", e);
        createDots();
      }
    };
    image.onerror = () => {
      console.warn("Failed to load earth map image. Using fallback dots.");
      createDots();
    };
    image.src = earthImageSrc;

    // 3. City Markers
    const cities = [
      { name: 'London', lat: 51.5072, lon: -0.1276 },
      { name: 'New York', lat: 40.7128, lon: -74.0060 },
      { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
      { name: 'Sydney', lat: -33.8688, lon: 151.2093 }
    ];

    const cityLabels: { label: CSS2DObject, pos: THREE.Vector3 }[] = [];

    cities.forEach(city => {
      const div = document.createElement('div');
      div.className = 'city-label-container transition-opacity duration-300';
      div.innerHTML = `
        <div class="city-name">${city.name}</div>
        <div class="city-arrow"></div>
        <div class="city-dot"></div>
      `;
      
      const label = new CSS2DObject(div);
      
      const phi = (90 - city.lat) * (Math.PI / 180);
      const theta = (city.lon + 180) * (Math.PI / 180);
      const radius = 1.4;
      
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = (radius * Math.sin(phi) * Math.sin(theta));
      const y = (radius * Math.cos(phi));
      
      label.position.set(x, y, z);
      globeGroup.add(label);
      
      cityLabels.push({ label, pos: new THREE.Vector3(x, y, z) });
    });

    // 4. Orbiting Text Ring
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const loader = new FontLoader();
    
    try {
      const font = loader.parse(fontData);
      const baseText = "vercel ship 26   ";
      const radius = 1.9;
      const charMap = new Map<string, { geometry: THREE.BufferGeometry, width: number }>();
      
      let baseWidth = 0;
      const chars = [];
      
      for (let i = 0; i < baseText.length; i++) {
        const char = baseText[i];
        if (!charMap.has(char)) {
          if (char === ' ') {
            charMap.set(char, { geometry: new THREE.BufferGeometry(), width: 0.04 });
          } else {
            const geometry = new TextGeometry(char, {
              font: font,
              size: 0.06,
              depth: 0.002,
              curveSegments: 4,
              bevelEnabled: false
            });
            geometry.computeBoundingBox();
            const width = geometry.boundingBox!.max.x - geometry.boundingBox!.min.x;
            
            const xOffset = -0.5 * width;
            const yOffset = -0.5 * (geometry.boundingBox!.max.y - geometry.boundingBox!.min.y);
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
      const extraSpace = circumference - (baseWidth * repeatCount);
      const spacingPerChar = extraSpace / (chars.length * repeatCount);
      
      let currentAngle = 0;
      
      for (let r = 0; r < repeatCount; r++) {
        for (let i = 0; i < chars.length; i++) {
          const { char, geometry, width } = chars[i];
          
          const charAngle = currentAngle - (width / 2) / radius;
          
          if (char !== ' ') {
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
    let currentThemeProgress = 0;
    
    const lightBg = new THREE.Color('#f7f7f7');
    const darkBg = new THREE.Color('#0a0a0a');
    const lightDot = new THREE.Color(0x111111);
    const darkDot = new THREE.Color(0xeeeeee);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      
      // Theme Interpolation
      const lerpFactor = 1.0 - Math.exp(-delta * 3.0);
      currentThemeProgress = THREE.MathUtils.lerp(currentThemeProgress, targetThemeProgress.current, lerpFactor);
      
      if (scene.background instanceof THREE.Color) {
        scene.background.lerpColors(lightBg, darkBg, currentThemeProgress);
      }
      if (scene.fog) {
        scene.fog.color.lerpColors(lightBg, darkBg, currentThemeProgress);
      }
      globeMaterial.uniforms.themeProgress.value = currentThemeProgress;
      dotMaterial.color.lerpColors(lightDot, darkDot, currentThemeProgress);
      textMaterial.color.lerpColors(lightDot, darkDot, currentThemeProgress);

      // Rotations
      globeGroup.rotation.y += 0.2 * delta;
      textRingGroup.rotation.y += 0.1 * delta;
      
      // Keep text ring tilted slightly for better view
      textRingGroup.rotation.x = 0.1;
      textRingGroup.rotation.z = 0.05;
      
      controls.update();
      
      const cameraPos = camera.position;
      cityLabels.forEach(({ label }) => {
        const worldPos = new THREE.Vector3();
        label.getWorldPosition(worldPos);
        
        const normal = worldPos.clone().normalize();
        const viewDir = cameraPos.clone().sub(worldPos).normalize();
        
        if (normal.dot(viewDir) < 0.1) {
          label.element.style.opacity = '0';
        } else {
          label.element.style.opacity = '1';
        }
      });
      
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
        containerRef.current.removeChild(labelRenderer.domElement);
      }
      scene.clear();
    };
  }, []);

  return (
    <div className={`theme-container relative w-full h-screen overflow-hidden transition-colors duration-1000 ${isDarkMode ? 'dark bg-[#0a0a0a]' : 'bg-[#f7f7f7]'}`}>
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors backdrop-blur-md cursor-pointer"
      >
        {isDarkMode ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-black" />}
      </button>

      <div ref={containerRef} className="absolute inset-0 cursor-move z-0" />
      
      {/* Center Logo Overlay */}
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-10">
        <div className="ship-text-overlay">
          <span className="text-[3rem] md:text-[5rem] mr-4">▲</span> 
          <span className="text-[4rem] md:text-[7rem] tracking-widest">SHIP</span>
        </div>
      </div>

      <style>{`
        .theme-container {
          --label-bg: #000;
          --label-text: #fff;
          --overlay-scanline: #111;
        }
        .theme-container.dark {
          --label-bg: #fff;
          --label-text: #000;
          --overlay-scanline: #eee;
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
          font-size: 11px;
          padding: 4px 6px;
          border-radius: 2px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          white-space: nowrap;
          letter-spacing: 0.05em;
          transition: background-color 1s ease-in-out, color 1s ease-in-out;
        }
        .city-arrow {
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid var(--label-bg);
          margin-bottom: 2px;
          transition: border-top-color 1s ease-in-out;
        }
        .city-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--label-bg);
          transition: background-color 1s ease-in-out;
        }
        
        .ship-text-overlay {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: bold;
          color: var(--label-bg);
          display: flex;
          align-items: center;
          transition: color 1s ease-in-out;
          
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
