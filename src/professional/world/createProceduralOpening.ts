import type * as Three from "three";

export interface ProceduralOpeningOptions {
  readonly three: typeof Three;
  readonly scene: Three.Scene;
}

export interface ProceduralOpening {
  readonly detach: () => void;
  readonly resources: readonly (Three.Material | Three.BufferGeometry)[];
}

export function createProceduralOpening({
  three,
  scene,
}: ProceduralOpeningOptions): ProceduralOpening {
  const root = new three.Group();
  const disposableResources: Array<Three.Material | Three.BufferGeometry> = [];

  const groundMaterial = new three.MeshStandardMaterial({ color: 0x312b24, roughness: 1 });
  const woodMaterial = new three.MeshStandardMaterial({ color: 0x5a3827, roughness: 0.9 });
  const emberMaterial = new three.MeshStandardMaterial({
    color: 0xe58b3a,
    emissive: 0x8f2c12,
    emissiveIntensity: 1.8,
    roughness: 0.7,
  });
  const cabinMaterial = new three.MeshStandardMaterial({ color: 0x42352c, roughness: 0.95 });
  disposableResources.push(groundMaterial, woodMaterial, emberMaterial, cabinMaterial);

  const groundGeometry = new three.CircleGeometry(16, 40);
  const ground = new three.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);
  disposableResources.push(groundGeometry);

  const fireGeometry = new three.ConeGeometry(0.72, 1.7, 6);
  const fire = new three.Mesh(fireGeometry, emberMaterial);
  fire.position.set(0, 0.85, 0);
  root.add(fire);
  disposableResources.push(fireGeometry);

  for (const rotation of [-0.8, 0.8]) {
    const logGeometry = new three.CylinderGeometry(0.16, 0.2, 2.2, 8);
    const log = new three.Mesh(logGeometry, woodMaterial);
    log.position.y = 0.2;
    log.rotation.z = Math.PI / 2;
    log.rotation.y = rotation;
    root.add(log);
    disposableResources.push(logGeometry);
  }

  const cabinGeometry = new three.BoxGeometry(3.5, 2.4, 2.8);
  const cabin = new three.Mesh(cabinGeometry, cabinMaterial);
  cabin.position.set(-3.8, 1.2, -2.8);
  root.add(cabin);
  disposableResources.push(cabinGeometry);

  const roofGeometry = new three.ConeGeometry(2.8, 1.6, 4);
  const roof = new three.Mesh(roofGeometry, woodMaterial);
  roof.position.set(-3.8, 3.15, -2.8);
  roof.rotation.y = Math.PI / 4;
  root.add(roof);
  disposableResources.push(roofGeometry);

  const zoneCueGeometry = new three.RingGeometry(2.8, 2.9, 32);
  const zoneCueMaterial = new three.MeshBasicMaterial({
    color: 0xe5a24b,
    transparent: true,
    opacity: 0.42,
  });
  const zoneCue = new three.Mesh(zoneCueGeometry, zoneCueMaterial);
  zoneCue.rotation.x = -Math.PI / 2;
  zoneCue.position.y = 0.02;
  root.add(zoneCue);
  disposableResources.push(zoneCueGeometry, zoneCueMaterial);

  const ambient = new three.AmbientLight(0x9bb4d1, 1.35);
  const fireLight = new three.PointLight(0xff9b4a, 24, 18, 2);
  fireLight.position.set(0, 2.2, 0);
  root.add(ambient, fireLight);
  scene.add(root);
  scene.fog = new three.Fog(0x201b18, 8, 27);

  return {
    detach: () => {
      scene.remove(root);
      scene.fog = null;
    },
    resources: disposableResources,
  };
}
