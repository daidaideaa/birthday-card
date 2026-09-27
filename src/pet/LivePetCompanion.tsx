import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { TeddyDog } from "./TeddyDog";
import type { ChapterId } from "../content/storyTypes";
import type { SceneCue } from "./PetCompanion";
import "./live-pets.css";

export function LivePetCompanion({chapter, celebrating, cardOpen, session, cue}: {
  chapter:ChapterId; celebrating:boolean; cardOpen:boolean; session:number; cue:SceneCue;
}) {
  const host = useRef<HTMLDivElement>(null);
  const dogs = useRef<TeddyDog[]>([]);
  const config = useRef({chapter, celebrating, cardOpen});
  config.current = {chapter, celebrating, cardOpen};
  const wake = useRef<() => void>(() => {});
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("杏杏和奶油，陪你慢慢看。");
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer:THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"}); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden","true");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32,1,.1,30);
    camera.position.set(0,1.45,6.2); camera.lookAt(0,.75,0);
    scene.add(new THREE.HemisphereLight("#fff1d9","#5b5067",2.4));
    const light = new THREE.DirectionalLight("#ffdab0",3.1);light.position.set(-3,5,4);scene.add(light);
    const pair = [new TeddyDog(true,0,renderer), new TeddyDog(true,1,renderer)];
    pair.forEach((dog,i) => { dog.root.position.x = i ? .75 : -.75; dog.root.rotation.y = i ? -.45 : .4; scene.add(dog.root); });
    dogs.current = pair;
    let disposed=false, visible=false, raf=0, previous=0, loaded=false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frames=0;
    const render = (dt:number) => { pair.forEach(dog => dog.update(dt,motion.matches || config.current.chapter === "letter"));renderer.render(scene,camera);el.dataset.frames=String(++frames); };
    const loop = (now:number) => {
      raf=0;
      if(disposed || !visible || document.hidden || !loaded) return;
      render(previous ? Math.min((now-previous)/1000,.05) : 0); previous=now;
      if(!motion.matches && config.current.chapter !== "letter") raf=requestAnimationFrame(loop);
    };
    const sync = () => {
      cancelAnimationFrame(raf);raf=0;previous=0;
      el.dataset.active=String(visible && !document.hidden && loaded);
      if (!visible || document.hidden) pair.forEach(dog=>dog.reset());
      pair.forEach(dog => dog.setMood(config.current.celebrating ? "happy" : config.current.chapter === "letter" ? "sleepy" : config.current.cardOpen ? "curious" : "welcome"));
      if(!disposed && visible && !document.hidden && loaded) raf=requestAnimationFrame(loop);
    };
    wake.current=sync;
    void Promise.all(pair.map(dog => dog.ready)).then(() => {if(!disposed){loaded=true;el.dataset.ready="true";sync();}}).catch(() => {if(!disposed)setFailed(true);});
    const resize = () => { const box=el.getBoundingClientRect();if(!box.width||!box.height)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();sync(); };
    const sizes = new ResizeObserver(resize);sizes.observe(el);
    const intersection = new IntersectionObserver(([entry]) => {visible=entry.isIntersecting;sync();});intersection.observe(el);
    const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(raf);setFailed(true);loaded=false;};
    renderer.domElement.addEventListener("webglcontextlost",lost);
    document.addEventListener("visibilitychange",sync);motion.addEventListener("change",sync);resize();
    return () => {disposed=true;cancelAnimationFrame(raf);wake.current=()=>{};intersection.disconnect();sizes.disconnect();document.removeEventListener("visibilitychange",sync);motion.removeEventListener("change",sync);renderer.domElement.removeEventListener("webglcontextlost",lost);pair.forEach(dog=>dog.dispose());dogs.current=[];renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[]);
  useEffect(()=>{wake.current();},[chapter,celebrating,cardOpen]);
  useEffect(()=>{dogs.current.forEach(dog=>dog.reset());setMessage("杏杏和奶油，陪你慢慢看。");wake.current();},[session]);
  useEffect(()=>{dogs.current.forEach(dog=>dog.react(cue.kind));wake.current();},[cue.serial,cue.kind]);
  const pet=(index:number)=>{dogs.current[index]?.pet();setMessage(index ? "奶油轻轻靠过来，想再陪你一会儿。" : "杏杏开心地抬起头，又摇了摇尾巴。");wake.current();};
  return <aside className="live-pets" aria-label="杏色与奶油色的两只泰迪" data-navigation-lock>
    <div className="live-pets-stage" ref={host}/>
    {failed && <p>杏杏和奶油在这里，陪你继续读下去。</p>}
    <div className="live-pets-touch"><button onClick={()=>pet(0)}>摸摸杏杏</button><button onClick={()=>pet(1)}>摸摸奶油</button></div>
    <p className="live-pets-caption" role="status">{message}</p>
  </aside>;
}
