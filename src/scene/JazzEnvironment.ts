import * as THREE from "three";
import { makeGlowTexture, makeShaftTexture } from "../utils/characterPolish";

/** 暮色、远山、城市和路灯处于同一三维空间，随镜头产生自然视差。 */
export function createJazzEnvironment() {
  const group = new THREE.Group();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(45, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        zenith: { value: new THREE.Color("#1c1e45") },
        horizon: { value: new THREE.Color("#c97f96") },
        dusk: { value: new THREE.Color("#f2a674") },
      },
      vertexShader: `varying vec3 vPosition;
        void main() { vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 zenith; uniform vec3 horizon; uniform vec3 dusk;
        varying vec3 vPosition;
        void main() {
          vec3 dir = normalize(vPosition);
          float h = smoothstep(-0.01, 0.34, dir.y);
          vec3 col = mix(horizon, zenith, h);
          // Warm dusk band hugging the horizon on the sunset side.
          float band = exp(-abs(dir.y - 0.02) * 9.0) * smoothstep(0.4, -0.6, dir.x);
          col = mix(col, dusk, band * 0.55);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  group.add(sky);

  // A rising moon with a soft halo, kept clear of the viewport edge.
  const glowTexture = makeGlowTexture(96);
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({ color: "#ffeecf", toneMapped: false }),
  );
  moon.position.set(6.2, 7.6, -18);
  moon.lookAt(0, 1.5, 8);
  const moonHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: "#ffe9c4",
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  moonHalo.position.copy(moon.position);
  moonHalo.scale.setScalar(2.5);
  group.add(moon, moonHalo);

  // A scatter of early stars.
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 130;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const angle = ((i * 0.754877) % 1) * Math.PI * 2;
    const radius = 18 + ((i * 0.618034) % 1) * 16;
    starPositions[i * 3] = Math.cos(angle) * radius;
    starPositions[i * 3 + 1] = 4 + ((i * 0.381966) % 1) * 14;
    starPositions[i * 3 + 2] = -14 - ((i * 0.5) % 1) * 10;
  }
  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starPositions, 3),
  );
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: "#dfe8ff",
      size: 0.05,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(stars);

  for (let layer = 0; layer < 3; layer++) {
    const ridge = new THREE.Shape();
    ridge.moveTo(-24, -5);
    for (let i = 0; i <= 48; i++) {
      const x = i - 24;
      ridge.lineTo(x, 0.3 + layer * 0.25 + Math.sin(x * 0.32 + layer) * 0.45
        + Math.sin(x * 0.71 - layer) * 0.19);
    }
    ridge.lineTo(24, -5);
    ridge.closePath();
    const hill = new THREE.Mesh(new THREE.ShapeGeometry(ridge),
      new THREE.MeshBasicMaterial({ color: ["#625275", "#45435e", "#292f45"][layer] }));
    hill.position.z = -18 + layer * 4;
    group.add(hill);
  }

  // City bokeh: soft round lights at varied sizes instead of hard rectangles.
  const bokehCount = 240;
  const bokehGeometry = new THREE.BufferGeometry();
  const bokehPositions = new Float32Array(bokehCount * 3);
  const bokehColors = new Float32Array(bokehCount * 3);
  const palette = [
    new THREE.Color("#ffd8aa"),
    new THREE.Color("#ffc37e"),
    new THREE.Color("#f7e7c3"),
    new THREE.Color("#d9b8ff"),
  ];
  for (let i = 0; i < bokehCount; i++) {
    const x = ((i * 0.618034) % 1) * 26 - 13;
    bokehPositions[i * 3] = x;
    bokehPositions[i * 3 + 1] = -0.3 + ((i * 0.381966) % 1) * 0.78;
    bokehPositions[i * 3 + 2] = -9.6 - ((i * 0.754877) % 1) * 1.6;
    const color = palette[i % palette.length];
    bokehColors[i * 3] = color.r;
    bokehColors[i * 3 + 1] = color.g;
    bokehColors[i * 3 + 2] = color.b;
  }
  bokehGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(bokehPositions, 3),
  );
  bokehGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(bokehColors, 3),
  );
  const bokeh = new THREE.Points(
    bokehGeometry,
    new THREE.PointsMaterial({
      map: glowTexture,
      size: 0.19,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  group.add(bokeh);

  const stone = new THREE.MeshStandardMaterial({
    color: "#33324a",
    roughness: 0.46,
    metalness: 0.14,
    envMapIntensity: 1.1,
  });
  const terrace = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), stone);
  terrace.rotation.x = -Math.PI / 2;
  terrace.position.set(0, -0.012, 3.4);
  terrace.receiveShadow = true;
  group.add(terrace);
  // Follow-spot pool grounding the duet, like a stage light finding them.
  const spotPool = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 40),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: "#e8b87e",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  spotPool.rotation.x = -Math.PI / 2;
  spotPool.position.set(0.3, 0.004, 0.75);
  group.add(spotPool);
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#27263b", roughness: 0.85 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(20, 0.055, 0.055), railMaterial);
  rail.position.set(0, 0.5, -3.7);
  group.add(rail);
  for (let i = -7; i <= 7; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6), railMaterial);
    post.position.set(i * 1.3, 0.25, -3.7);
    group.add(post);
  }

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.046, 2.75, 10), railMaterial);
  pole.position.set(-1.68, 1.37, -1.5);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12),
    new THREE.MeshStandardMaterial({ color: "#fff3d8", emissive: "#ffb75a", emissiveIntensity: 2.4, roughness: 0.35 }));
  globe.position.set(-1.68, 2.77, -1.5);
  const lamp = new THREE.PointLight("#ffd5a0", 5, 7, 2);
  lamp.position.copy(globe.position);
  group.add(pole, globe, lamp);

  // Volumetric cone under the lamp plus a warm pool on the terrace.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.95, 2.7, 24, 1, true),
    new THREE.MeshBasicMaterial({
      map: makeShaftTexture(64, 128),
      color: "#ffbe78",
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  cone.position.set(-1.68, 1.4, -1.5);
  group.add(cone);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 32),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: "#ffbe78",
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(-1.68, 0.005, -1.5);
  group.add(pool);

  // Slow dust motes drifting through the lamplight.
  const moteGeometry = new THREE.BufferGeometry();
  const moteCount = 42;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = -1.68 + (((i * 0.618034) % 1) - 0.5) * 2.4;
    motePositions[i * 3 + 1] = 0.3 + ((i * 0.381966) % 1) * 2.6;
    motePositions[i * 3 + 2] = -1.5 + (((i * 0.754877) % 1) - 0.5) * 2.2;
  }
  moteGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(motePositions, 3),
  );
  const motes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({
      map: glowTexture,
      color: "#ffdca6",
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  motes.name = "lamp-motes";
  group.add(motes);
  return group;
}
