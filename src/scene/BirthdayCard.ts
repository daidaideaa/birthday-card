import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createArtwork } from "./cardArtwork";

export class BirthdayCard {
  root = new THREE.Group();
  coverPivot = new THREE.Group();
  constructor() {
    const paper = new THREE.MeshStandardMaterial({
      color: "#e9d8b8",
      roughness: 0.87,
    });
    const velvet = new THREE.MeshPhysicalMaterial({
      color: "#30151f",
      roughness: 0.78,
      sheen: 0.7,
      sheenColor: new THREE.Color("#8b485a"),
      sheenRoughness: 0.8,
    });
    const foil = new THREE.MeshStandardMaterial({
      color: "#d5ac62",
      roughness: 0.28,
      metalness: 0.82,
      emissive: "#967341",
      emissiveIntensity: 0.045,
    });
    const page = (y: number, parent: THREE.Group, isCover = false) => {
      const p = new THREE.Mesh(
        new RoundedBoxGeometry(4.4, 0.07, 3.1, 3, 0.022),
        isCover ? velvet : paper,
      );
      p.position.y = y;
      p.castShadow = true;
      p.receiveShadow = true;
      parent.add(p);
      // Real layered paper and gilt edges catch the side light during opening.
      for (const offset of [-0.021, 0.017]) {
        const edge = new THREE.Mesh(
          new RoundedBoxGeometry(4.393, 0.0035, 3.093, 2, 0.012),
          isCover ? foil : paper,
        );
        edge.position.y = y + offset;
        parent.add(edge);
      }
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
          roughness: kind === "cover" ? 0.68 : 0.92,
          metalness: kind === "cover" ? 0.12 : 0,
        }),
      );
      mesh.rotation.x = underside ? Math.PI / 2 : -Math.PI / 2;
      mesh.position.y = y;
      mesh.receiveShadow = true;
      parent.add(mesh);
    };
    page(0, this.root);
    face("message", 0.036, this.root);
    face("back", -0.036, this.root, true);
    this.coverPivot.position.set(0, 0.086, -1.55);
    this.root.add(this.coverPivot);
    const cover = new THREE.Group();
    cover.position.z = 1.55;
    this.coverPivot.add(cover);
    page(0, cover, true);
    face("cover", 0.036, cover);
    face("inside", -0.036, cover, true);

    // Raised metalwork responds to light independently of the printed artwork.
    const wire = (points: THREE.Vector3[], radius = 0.007) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(
          curve,
          Math.max(4, points.length * 3),
          radius,
          5,
          false,
        ),
        foil,
      );
      mesh.castShadow = true;
      cover.add(mesh);
    };
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        wire([
          new THREE.Vector3(sx * 1.7, 0.045, sz * 1.39),
          new THREE.Vector3(sx * 2.025, 0.045, sz * 1.39),
          new THREE.Vector3(sx * 2.045, 0.045, sz * 1.37),
          new THREE.Vector3(sx * 2.045, 0.045, sz * 1.05),
        ]);
        const stud = new THREE.Mesh(new THREE.OctahedronGeometry(0.027), foil);
        stud.position.set(sx * 1.99, 0.047, sz * 1.33);
        stud.scale.y = 0.3;
        cover.add(stud);
      }
    }
    const seal = new THREE.Mesh(
      new THREE.TorusGeometry(0.228, 0.0045, 5, 64),
      foil,
    );
    seal.rotation.x = -Math.PI / 2;
    seal.position.set(0, 0.041, -0.921);
    cover.add(seal);

    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 4.4, 12),
      velvet,
    );
    spine.rotation.z = Math.PI / 2;
    spine.position.set(0, 0.025, -1.55);
    this.root.add(spine);
    this.root.rotation.y = -0.08;
  }
  update(progress: number) {
    this.coverPivot.rotation.x = -progress * 2.12;
  }
}
