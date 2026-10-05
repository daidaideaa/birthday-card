import * as THREE from 'three';
import type { BookMechanism } from './bookPages';

export type MechanismTriggers = Record<BookMechanism, number>;

function inkMap(lines: Array<{ text: string; y: number; size: number }>, width = 768, height = 1024) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#24180f';
  lines.forEach(line => { ctx.font = `bold ${line.size}px STKaiti, KaiTi, SimSun, serif`; ctx.fillText(line.text, width / 2, line.y); });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function printedPlane(texture: THREE.Texture, width: number, depth: number) {
  // Diffuse ink has no white specular sheen over the dark printed strokes.
  const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

/** Physical paper fittings remain children of the six live leaf hinges. */
export function createBookMechanisms(model: THREE.Group, leaves: THREE.Object3D[]) {
  const progress: Record<BookMechanism, number> = { name: 0, veil: 0, ink: 0, note: 0 };
  const observed: MechanismTriggers = { name: 0, veil: 0, ink: 0, note: 0 };
  let inkHasEntered = false;
  const name = printedPlane(inkMap([{ text: '师宝宝', y: 556, size: 110 }]), 2.36, 3.12);
  name.name = 'Name_revealing_ink'; name.position.set(1.2, .034, 0); leaves[0]?.add(name);
  const reveal = { value: 0 };
  name.material.onBeforeCompile = shader => {
    shader.uniforms.uNameReveal = reveal;
    shader.fragmentShader = 'uniform float uNameReveal;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= smoothstep(vMapUv.x - 0.055, vMapUv.x + 0.055, uNameReveal);');
  };
  name.material.customProgramCacheKey = () => 'private-name-ink-v9';

  const vellum = new THREE.Group(); vellum.name = 'Transparent_paper_hinge'; vellum.position.set(.23, .041, 0); leaves[2]?.add(vellum);
  const translucent = new THREE.MeshStandardMaterial({ color: 0xd6c4a2, roughness: .96, metalness: 0, transparent: true, opacity: .50, depthWrite: false, side: THREE.DoubleSide });
  translucent.envMapIntensity = .12;
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.93, .008, 2.44, 12, 1, 16), translucent);
  sheet.position.x = .965; sheet.castShadow = true; sheet.receiveShadow = true; vellum.add(sheet);
  const vellumInk = printedPlane(inkMap([{ text: '这一句', y: 440, size: 84 }, { text: '偏向你。', y: 590, size: 84 }]), 1.87, 2.39);
  vellumInk.position.set(.965, .008, 0); vellum.add(vellumInk);
  const vellumEdge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(.015, .006, -1.21), new THREE.Vector3(1.915, .006, -1.21),
    new THREE.Vector3(1.915, .006, 1.21), new THREE.Vector3(.015, .006, 1.21),
  ]), new THREE.LineBasicMaterial({ color: 0x9e8662, transparent: true, opacity: .65 }));
  vellum.add(vellumEdge);

  const bookmark = new THREE.Group(); bookmark.name = 'Copper_bookmark_and_slip'; leaves[3]?.add(bookmark);
  const brass = new THREE.MeshStandardMaterial({ color: 0x765330, roughness: .62, metalness: .70 });
  brass.envMapIntensity = .38;
  const strip = new THREE.Mesh(new THREE.BoxGeometry(.10, .012, 2.63), brass);
  strip.position.set(2.14, .04, -.02); strip.castShadow = true; strip.receiveShadow = true; bookmark.add(strip);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(.032, .005, 5, 20), brass);
  eye.rotation.x = -Math.PI / 2; eye.position.set(2.14, .047, -1.39); bookmark.add(eye);
  const slip = new THREE.Mesh(new THREE.BoxGeometry(.61, .013, 1.07), new THREE.MeshStandardMaterial({ color: 0xcdb58d, roughness: .99 }));
  slip.position.set(1.17, .039, .24); slip.rotation.y = -.10; slip.castShadow = true; slip.receiveShadow = true; bookmark.add(slip);
  const slipInk = printedPlane(inkMap([{ text: '留给你', y: 510, size: 145 }]), .58, 1.04);
  slipInk.position.set(1.17, .048, .24); slipInk.rotation.z = -.10; bookmark.add(slipInk);

  const gatheredInk = new THREE.Group(); gatheredInk.name = 'Ink_returning_to_its_place'; leaves[4]?.add(gatheredInk);
  const characters = [...'偏爱也有名字。'].map((character, index, all) => {
    const mesh = printedPlane(inkMap([{ text: character, y: 66, size: 102 }], 128, 128), .25, .29);
    const destination = new THREE.Vector3(1.2 + (index - (all.length - 1) / 2) * .258, .037, .17);
    const origin = new THREE.Vector3(.44 + ((index * 3) % 7) * .22, .044, -.51 + ((index * 5) % 7) * .16);
    gatheredInk.add(mesh);
    return { mesh, origin, destination };
  });

  const note = model.getObjectByName('FoldedNoteRoot');
  const topFold = model.getObjectByName('NoteTopFold');
  const bottomFold = model.getObjectByName('NoteBottomFold');
  model.updateMatrixWorld(true);
  // The copper tongue and seal travel with the bottom flap instead of floating over the message.
  if (bottomFold) ['Note_copper_tab', 'Note_wax_dot'].forEach(id => { const fitting = model.getObjectByName(id); if (fitting) bottomFold.attach(fitting); });

  return {
    update(page: number, triggers: MechanismTriggers, dt: number, reduced: boolean, settled: boolean) {
      (Object.keys(progress) as BookMechanism[]).forEach(id => {
        if (triggers[id] !== observed[id]) { observed[id] = triggers[id]; progress[id] = 0; }
        const active = id === 'name' ? page === 0 : id === 'veil' ? page === 2 : id === 'ink' ? page === 4 : page === 5;
        if (id === 'ink' && active && settled) inkHasEntered = true;
        if (active && settled && (observed[id] > 0 || (id === 'ink' && inkHasEntered))) progress[id] = reduced ? 1 : Math.min(1, progress[id] + dt / (id === 'note' ? 1.6 : 1.3));
      });
      name.visible = page === 0 && settled; reveal.value = THREE.MathUtils.smoothstep(progress.name, 0, 1) * 1.06;
      vellum.visible = page === 2 && settled;
      bookmark.visible = page === 3 && settled;
      vellum.rotation.z = THREE.MathUtils.lerp(.48, .009, THREE.MathUtils.smoothstep(progress.veil, 0, 1));
      gatheredInk.visible = page === 4 && settled;
      characters.forEach(({ mesh, origin, destination }, index) => {
        const phase = THREE.MathUtils.smoothstep(progress.ink, index * .055, .65 + index * .05);
        mesh.position.lerpVectors(origin, destination, phase);
        mesh.rotation.z = (1 - phase) * Math.sin(index * 6.7) * .38;
        mesh.material.opacity = .22 + .78 * phase;
      });
      if (note) note.visible = page === 5 && settled;
      if (topFold) topFold.rotation.x = -2.03 * THREE.MathUtils.smoothstep(progress.note, .12, 1);
      if (bottomFold) bottomFold.rotation.x = 2.03 * THREE.MathUtils.smoothstep(progress.note, 0, .88);
    },
  };
}
