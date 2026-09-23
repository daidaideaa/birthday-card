import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/** 仅不透明爵士舞台使用半分辨率后期；DOM 书信永远在此链路之外。 */
export class CinemaPost {
  private composer?: EffectComposer;
  private bloom?: UnrealBloomPass;
  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    enabled: boolean,
  ) {
    if (!enabled) return;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.35, 1.6);
    // HDR 阈值高于普通材质，只有路灯/灯点等发光表面进入 bloom。
    this.composer.addPass(this.bloom);
    this.composer.addPass(
      new ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader:
          "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){vec4 c=texture2D(tDiffuse,vUv); float edge=smoothstep(.2,.75,length(vUv-.5)); c.rgb*=vec3(1.012,1.,.985)*(1.-.085*edge);gl_FragColor=c;}",
      }),
    );
    this.composer.addPass(new OutputPass());
  }
  resize(width: number, height: number) {
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(width, height);
    this.bloom?.setSize(
      Math.max(1, width * this.renderer.getPixelRatio() * 0.5),
      Math.max(1, height * this.renderer.getPixelRatio() * 0.5),
    );
  }
  render(strength = 0.12) {
    if (this.bloom) this.bloom.strength = strength;
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.composer?.passes.forEach((pass) => pass.dispose());
    this.composer?.dispose();
  }
}
