import * as THREE from "three";

/** 暮色、远山、城市和路灯处于同一三维空间，随镜头产生自然视差。 */
export function createJazzEnvironment() {
  const group = new THREE.Group();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(45, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        zenith: { value: new THREE.Color("#22234f") },
        horizon: { value: new THREE.Color("#b87b96") },
      },
      vertexShader: `varying vec3 vPosition;
        void main() { vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 zenith; uniform vec3 horizon;
        varying vec3 vPosition;
        void main() { float h = smoothstep(-0.01, 0.32, normalize(vPosition).y);
          gl_FragColor = vec4(mix(horizon, zenith, h), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  group.add(sky);

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

  const lights = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.035, 0.016),
    new THREE.MeshBasicMaterial({ color: "#ffd8aa", toneMapped: false }),
    260,
  );
  const transform = new THREE.Object3D();
  for (let i = 0; i < 260; i++) {
    const x = ((i * 0.618034) % 1) * 26 - 13;
    transform.position.set(x, -0.3 + ((i * 0.381966) % 1) * 0.72, -9.6);
    transform.scale.setScalar(0.55 + (i % 5) * 0.17);
    transform.updateMatrix();
    lights.setMatrixAt(i, transform.matrix);
  }
  group.add(lights);

  const stone = new THREE.MeshStandardMaterial({ color: "#4a4659", roughness: 0.96 });
  const terrace = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), stone);
  terrace.rotation.x = -Math.PI / 2;
  terrace.position.set(0, -0.012, 2.8);
  terrace.receiveShadow = true;
  group.add(terrace);
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
  return group;
}
