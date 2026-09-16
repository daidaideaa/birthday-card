import * as THREE from "three";
import { createArtwork } from "./cardArtwork";
export class BirthdayCard {
  root = new THREE.Group();
  coverPivot = new THREE.Group();
  constructor() {
    const paper = new THREE.MeshStandardMaterial({
      color: "#e7d4b5",
      roughness: 0.88,
    });
    const page = (y: number, parent: THREE.Group) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.045, 3.1), paper);
      p.position.y = y;
      p.castShadow = true;
      p.receiveShadow = true;
      parent.add(p);
    };
    const face = (
      kind: "cover" | "inside" | "message" | "back",
      y: number,
      parent: THREE.Group,
      underside = false,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4.37, 3.07),
        new THREE.MeshStandardMaterial({
          map: createArtwork(kind),
          roughness: 0.93,
          metalness: 0,
        }),
      );
      mesh.rotation.x = underside ? Math.PI / 2 : -Math.PI / 2;
      mesh.position.y = y;
      mesh.receiveShadow = true;
      parent.add(mesh);
    };
    page(0, this.root);
    face("message", 0.024, this.root);
    face("back", -0.024, this.root, true);
    this.coverPivot.position.set(0, 0.061, -1.55);
    this.root.add(this.coverPivot);
    const cover = new THREE.Group();
    cover.position.z = 1.55;
    this.coverPivot.add(cover);
    page(0, cover);
    face("cover", 0.024, cover);
    face("inside", -0.024, cover, true);
    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 4.4, 12),
      paper,
    );
    spine.rotation.z = Math.PI / 2;
    spine.position.set(0, 0.018, -1.55);
    this.root.add(spine);
    this.root.rotation.y = -0.08;
  }
  update(progress: number) {
    this.coverPivot.rotation.x = -progress * 2.12;
  }
}
