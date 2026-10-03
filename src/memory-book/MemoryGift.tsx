import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Journey from "./Journey";
import Pets from "./Pets";
import { photos, movies } from "./media";
import { assetUrl } from "../utils/assetUrl";
import "./memory-book.css";

const chapters = ["只认识你", "两条来路", "藏起时光", "风与星光", "为你点亮"];
const ids = ["invitation", "journey", "photos", "cinema", "wish"];
const numerals = ["I", "II", "III", "IV", "V"];
const letter = [
"今晚，我想送给你一本有一点偏心的书。它记不住所有咒语，却记得你的名字；它也没有收藏整个世界，只想把一些温柔的光，留在你翻开它的时候。",
"从河南到天津，从北京到香港，再到深圳，你走过的每一段路，都值得被认真地看见。我没有参与其中的每一天，也不会假装知道每一页故事。但如果你愿意，我想慢慢听你讲：那些让你开心的、让你骄傲的，还有偶尔觉得有一点辛苦的时刻。",
"我的那条路，从武汉，经过南京和上海，也来到了深圳。很高兴，两条各自向前的路，后来有了可以并排写下的一页。",
"所以这本书里，我留了风，留了星光，也留了几张以后可以换成我们照片的位置。希望它不只是带你回头看看，也能让你期待，前面还有多少风景值得我们慢慢发现。",
"新的一岁，愿你继续喜欢自己喜欢的事，走自己想走的路。想勇敢的时候，就向前一点；想休息的时候，也可以安心停下来。不必每一天都很厉害，你的快乐本身就很值得被放在心上。",
"等你翻到最后，那只深蓝色的蛋糕会替今晚留住一点星空。先别急着吹灭蜡烛，把那个最想实现的愿望，悄悄留给自己。",
"师宝宝，生日快乐。谢谢你出现在我的故事里。书里还留着一些空白，往后的日子，想和你一页一页地写。",
];
const media = (path: string) => /^https:\/\//.test(path) ? path : assetUrl(path);

function useMusic() {
  const audio = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!audio.current) { try { audio.current = new AudioContext(); } catch { return; } }
    if (!playing) void audio.current.resume().catch(() => setPlaying(false));
    else void audio.current.suspend();
    setPlaying(!playing);
  };
  useEffect(() => {
    if (!playing) return;
    const context = audio.current;
    if (!context) return;
    let step = 0;
    const melody = [261.63,392,523.25,440,329.63,392,587.33,523.25,349.23,440,698.46,587.33,329.63,392,523.25,392];
    const note = () => {
      if (document.hidden || context.state !== "running") return;
      const now = context.currentTime;
      const frequency = melody[step++ % melody.length];
      for (const [multiple, level] of [[1,.034],[2,.009],[3,.003]]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine"; oscillator.frequency.value = frequency * multiple;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(level, now+.02);
        gain.gain.exponentialRampToValueAtTime(.0001, now+2.7);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now); oscillator.stop(now+2.8);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    };
    note();
    const timer=window.setInterval(note,1300);
    const visibility=()=>{if(document.hidden)void context.suspend();else void context.resume().catch(()=>setPlaying(false));};
    document.addEventListener("visibilitychange",visibility);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visibility);};
  },[playing]);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  return {playing,toggle};
}

export default function MemoryGift(){
  const [chapter,setChapter]=useState(()=>Math.max(0,ids.indexOf(window.location.hash.slice(1))));
  const [transition,setTransition]=useState("");
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [awake,setAwake]=useState(false);
  const [photo,setPhoto]=useState(0);
  const [movie,setMovie]=useState(0);
  const [wind,setWind]=useState(0);
  const [star,setStar]=useState<number|null>(null);
  const [wish,setWish]=useState<"lit"|"making"|"blown">("lit");
  const [celebrate,setCelebrate]=useState(0);
  const [modal,setModal]=useState<"letter"|"photo"|"credits"|null>(null);
  const [menu,setMenu]=useState(false);
  const [hidden,setHidden]=useState(document.hidden);
  const timers=useRef<number[]>([]);
  const dialog=useRef<HTMLDialogElement>(null);
  const music=useMusic();
  const currentPhoto=photos[photo];
  const currentMovie=movies[movie];
  const later=(fn:()=>void,delay:number)=>{timers.current.push(window.setTimeout(fn,delay));};
  const go=useCallback((target:number)=>{
    if(target===chapter||target<0||target>4||transition)return;
    timers.current.forEach(clearTimeout);timers.current=[];
    if(target===0)setAwake(false);
    setMenu(false);setModal(null);
    setTransition(target<chapter?"return":["book","sand","wind","star"][chapter]||"book");
    const duration=reducedMotion?90:800;
    timers.current.push(window.setTimeout(()=>{
      setChapter(target);window.history.pushState(null,"","#"+ids[target]);
      window.scrollTo({top:0,behavior:"instant"});
    },duration*.55),window.setTimeout(()=>setTransition(""),duration+500));
  },[chapter,reducedMotion,transition]);
  useEffect(()=>{
    const onHash=()=>{
      timers.current.forEach(clearTimeout);timers.current=[];
      setTransition("");setMenu(false);setModal(null);setAwake(false);
      setChapter(Math.max(0,ids.indexOf(window.location.hash.slice(1))));
    };
    const onVisibility=()=>setHidden(document.hidden);
    window.addEventListener("hashchange",onHash);document.addEventListener("visibilitychange",onVisibility);
    return()=>{timers.current.forEach(clearTimeout);window.removeEventListener("hashchange",onHash);document.removeEventListener("visibilitychange",onVisibility);};
  },[]);
  useLayoutEffect(()=>{window.scrollTo({top:0,behavior:"instant"});},[chapter]);
  useEffect(()=>{
    if(modal&&!dialog.current?.open)dialog.current?.showModal();
    if(!modal&&dialog.current?.open)dialog.current?.close();
  },[modal]);
  const openBook=()=>{
    if(transition||awake)return;
    setAwake(true);later(()=>go(1),reducedMotion?100:1500);
  };
  const blow=()=>{
    if(wish==="lit"){setWish("making");return;}
    setWish("blown");setCelebrate(n=>n+1);
  };
  return <main className={"memory-gift scene-"+chapter+(reducedMotion?" reduce-motion":"")+(hidden?" is-hidden":"")}>
    <style>{'@font-face{font-family:GiftSerif;src:url("'+assetUrl("memory-book/serif.woff")+'") format("woff");font-display:swap}'}</style>
    <header className="gift-header">
      <button className="gift-brand" onClick={()=>go(0)} aria-label="回到古书封面"><span className="brand-star">✧</span><span>写给师宝宝的一场梦<small>A LITTLE MAGIC, JUST FOR YOU</small></span></button>
      <div className="gift-tools">
        <button className={"sound-switch "+(music.playing?"is-on":"")} onClick={music.toggle} aria-label={music.playing?"关闭音乐":"开启音乐"} aria-pressed={music.playing}><span className="sound-bars"><i/><i/><i/><i/></span><span>{music.playing?"音乐已开启":"开启音乐"}</span></button>
        <button className="chapter-menu-toggle" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-label="章节目录">目录 <span>☰</span></button>
      </div>
    </header>
    {menu&&<nav className="chapter-menu" aria-label="章节目录">{chapters.map((c,i)=><button key={c} aria-current={chapter===i?"page":undefined} onClick={()=>go(i)}><span>{numerals[i]}</span>{c}<small>↗</small></button>)}<button onClick={()=>setReducedMotion(!reducedMotion)}>减少动态 <small>{reducedMotion?"已开启":"未开启"}</small></button><button onClick={()=>{setMenu(false);setModal("credits");}}>关于这份礼物 <small>✧</small></button></nav>}
    <div className="chapter-stage" aria-busy={!!transition}>
      {chapter===0&&<section className={"invitation "+(awake?"is-awake":"")} aria-label="第一章 这本书只认识你">
        <img className="invitation-art" src={assetUrl("memory-book/book.webp")} alt="烛光书房里，一本有金色花纹的古旧魔法书，旁边放着封蜡信封" fetchPriority="high"/><div className="invitation-shade"/>
        <div className="invitation-copy"><p className="eyebrow">THE FIRST PAGE OF OUR STORY</p><div className="tiny-rule"/><h1>今晚，<br/>故事只认识<span>你。</span></h1><p className="intro-lines">有一本书，等了很久。<br/>直到你来，它才有了名字。</p><button className="gold-button" onClick={openBook} disabled={awake}>{awake?"再翻开这本书":"打开这本书"}<span>✧</span></button><p className="quiet-note">一场只为你准备的，生日奇遇</p></div>
        <button className="cover-name" onClick={openBook} aria-label="触碰书封，唤醒魔法书" disabled={awake}><span className="cover-symbol">✦</span><span className="cover-recipient">{awake?"师宝宝":"献给，唯一的你"}</span><i>THE BOOK OF YOU</i><span className="cover-ornament">── ✧ ──</span></button>
        <div className="floating-dust" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{left:(9+i*5)%95+"%",top:(i*17)%92+"%",animationDelay:-(i*.7)+"s"}}/>)}</div>
      </section>}
      {chapter===1&&<section className="journey-chapter" aria-label="第二章 两条路终于同向"><Journey onComplete={()=>go(2)} reducedMotion={reducedMotion}/></section>}
      {chapter===2&&<section className="photos-chapter" aria-label="第三章 照片与书信">
        <div className="section-heading"><p className="eyebrow">CHAPTER III · LITTLE MOMENTS</p><h1>把喜欢的时刻，<em>藏进书里。</em></h1><p>有些风景，想和你慢慢看。</p></div>
        <div className="album">
          <div className="album-page album-note"><span className="page-corner"/><p className="album-label">一页风景 · 一点喜欢</p><span className="album-number">0{photo+1}</span><h2>{currentPhoto.title}</h2><p>{currentPhoto.caption}</p><div className="photo-count"><span>{String(photo+1).padStart(2,"0")}</span><i/>{String(photos.length).padStart(2,"0")}</div><button className="letter-link" onClick={()=>setModal("letter")}><span className="envelope-icon">✉</span> 有些话，只写给你 <span>↗</span></button></div>
          <div className="album-page album-image"><button className="photo-mount" key={currentPhoto.id} onClick={()=>setModal("photo")} aria-label={"放大照片："+currentPhoto.title}><img src={media(currentPhoto.src)} alt={currentPhoto.title+"，网图示意"} style={{objectPosition:currentPhoto.objectPosition}}/><span className="photo-mount-hint">轻触，放大这一刻 ↗</span></button><div className="album-controls"><button disabled={photo===0} onClick={()=>setPhoto(photo-1)} aria-label="上一张照片">←</button><span>示意照片 · 以后换成我们的</span><button disabled={photo===photos.length-1} onClick={()=>setPhoto(photo+1)} aria-label="下一张照片">→</button></div></div>
        </div>
        <div className="chapter-bottom"><span>把平凡的一天，也过成值得收藏的一页。</span><button className="text-button" onClick={()=>setModal("letter")}>打开给你的信 <b>↗</b></button><button className="text-button" onClick={()=>go(3)}>下一章 <b>→</b></button></div>
      </section>}
      {chapter===3&&<section className={"cinema-chapter film-"+movie} aria-label="第四章 风与星光">
        <div className="cinema-visual" key={currentMovie.id}>
          <img src={media(currentMovie.image)} alt={currentMovie.title+"原版官方画面"} referrerPolicy="no-referrer"/><div className="film-vignette"/>
          {movie===0&&<div className={"wind-lines wind-"+wind} key={wind} aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i} style={{top:25+i*11+"%",animationDelay:i*.17+"s"}}/>)}</div>}
          {movie===1&&<div className="movie-stars">{[0,1,2,3,4].map(i=><button key={i} className={star===i?"is-lit":""} style={{left:25+i*13+"%",top:16+(i%3)*12+"%"}} onClick={()=>setStar(i)} aria-label={"点亮第"+(i+1)+"颗星"}>✦</button>)}</div>}
        </div>
        <div className="cinema-copy"><p className="eyebrow">CHAPTER IV · THE WIND & THE STARS</p><h1>{movie===0?<>愿你自由，<br/><em>也有归处。</em></>:<>愿你勇敢，<br/><em>也一直被爱。</em></>}</h1><p>{movie===0?"把一缕风藏进书页。愿你始终有奔向远方的勇气，也有可以安心停下的地方。":"有些光，走得再远也不会熄灭。抬头的时候，希望你总能记得：你值得被温柔地爱着。"}</p><div className="film-identity"><span>{currentMovie.year}</span><div><strong>{currentMovie.title}</strong><small>原版动画 · 官方画面</small></div></div><button className="gold-button" onClick={()=>movie===0?setWind(n=>n+1):go(4)}>{movie===0?"让风吹过这一页":"把星光带到生日里"}<span>{movie===0?"〰":"✧"}</span></button><a className="official-link" href={currentMovie.watchUrl} target="_blank" rel="noreferrer">在官方页面看原作 ↗</a></div>
        <div className="film-switch"><button className={movie===0?"active":""} onClick={()=>setMovie(0)}><span>01</span> 风的方向<small>小马王</small></button><i/><button className={movie===1?"active":""} onClick={()=>setMovie(1)}><span>02</span> 星光的回答<small>狮子王</small></button>{movie===0?<button className="film-next" onClick={()=>setMovie(1)}>沿着风，看见星光 →</button>:<button className="film-next" onClick={()=>go(4)}>为你点亮 →</button>}</div>
      </section>}
      {chapter===4&&<section className={"wish-chapter wish-"+wish} aria-label="第五章 魔法星空蛋糕">
        <div className="wish-heading"><p className="eyebrow">CHAPTER V · MAKE A LITTLE WISH</p><h1>{wish==="blown"?"师宝宝，生日快乐。":wish==="making"?"这一刻，把愿望留给你。":"今晚的星光，都为你亮起。"}</h1><p>{wish==="blown"?"愿你一直勇敢，也一直被爱。":wish==="making"?"不用说出来，也不必着急。许好了，就轻轻吹灭蜡烛。":"先别急着吹灭蜡烛，把最想实现的愿望，悄悄放在心里。"}</p></div>
        <div className="cake-scene"><img src={assetUrl("memory-book/cake.webp")} alt="深蓝奶油与金色星轨装饰的生日蛋糕，月亮饰片和三根金色蜡烛"/>
          {[{x:42.2,y:15.8},{x:45.4,y:4.8},{x:49,y:11.2}].map((p,i)=><div className={"candle-light candle-"+i} key={i} style={{left:p.x+"%",top:p.y+"%"}}><i className="flame"/><i className="flame-glow"/><i className="candle-smoke"/></div>)}
          {wish==="blown"&&<div className="wish-sparkles" aria-hidden="true">{Array.from({length:15},(_,i)=><i key={i} style={{left:20+i*4+"%",animationDelay:i*.08+"s"}}>✧</i>)}</div>}
        </div>
        <div className="wish-actions">{wish!=="blown"?<button className="gold-button" onClick={blow}>{wish==="lit"?"许个愿吧":"轻轻吹灭蜡烛"}<span>✧</span></button>:<><p className="after-wish">书里还留着一些空白，想和你一页一页地写。</p><div><button className="text-button" onClick={()=>setModal("letter")}>重读给你的信 ↗</button><button className="text-button" onClick={()=>go(2)}>回看照片 ↗</button><button className="text-button" onClick={()=>setWish("lit")}>再点亮一次 ✧</button></div></>}</div>
      </section>}
      <Pets scene={chapter} quiet={modal!==null} reducedMotion={reducedMotion} celebrate={celebrate}/>
    </div>
    <footer className="gift-footer"><span className="footer-dedication">FOR YOU, AND ONLY YOU.</span><nav aria-label="故事章节">{chapters.map((c,i)=><button key={c} onClick={()=>go(i)} aria-current={i===chapter?"step":undefined} aria-label={"第"+(i+1)+"章 "+c}><span>{String(i+1).padStart(2,"0")}</span><i/>{c}</button>)}</nav><button className="footer-about" onClick={()=>setModal("credits")} aria-label="关于这份礼物">✧</button></footer>
    {!!transition&&<div className={"chapter-transition transition-"+transition} aria-hidden="true"><div className="turning-paper"/><div className="transition-thread"/><span className="transition-star">✦</span></div>}
    <dialog ref={dialog} className={"gift-dialog modal-"+modal} onCancel={()=>setModal(null)} onClose={()=>setModal(null)} onClick={event=>{if(event.target===event.currentTarget)setModal(null);}}>
      <div className="dialog-content"><button className="dialog-close" onClick={()=>setModal(null)} aria-label="关闭">×</button>
        {modal==="letter"&&<article className="letter-paper"><p className="eyebrow">SOME WORDS, JUST FOR YOU</p><span className="letter-stamp">✧</span><h2>亲爱的师宝宝：</h2>{letter.map(p=><p key={p}>{p}</p>)}<p>愿你一直勇敢，也一直被爱。</p><p className="letter-signature">生日快乐呀 ♡</p><small className="draft-note">书信暂拟，之后可以换成我想亲口对你说的话。</small><button className="letter-continue" onClick={()=>{setModal(null);go(3);}}>把这封信收好，去看看风与星光 →</button></article>}
        {modal==="photo"&&<figure className="full-photo"><img src={media(currentPhoto.src)} alt={currentPhoto.title}/><figcaption>{currentPhoto.title}<small>示意照片 · {currentPhoto.credit}</small></figcaption></figure>}
        {modal==="credits"&&<article className="credits-paper"><p className="eyebrow">ABOUT THIS LITTLE GIFT</p><h2>为你，留一点魔法。</h2><p>一本只认识你的书，两条在深圳汇合的路，一封慢慢读的信，还有今晚的星空。</p><p>相册暂用5张风景网图，之后可以换成我们的照片。书信是暂拟文字；旅程只记录已经知道的地点，没有补写年份和往事。</p><h3>画面与声音</h3><p>古书、星空蛋糕与两只二维泰迪为本项目生成的原创画稿。音乐为本项目合成的轻柔钟琴旋律。两部电影保留官方原版画面与官方观看入口，电影版权属于各权利人。</p>{movies.map(m=><p key={m.id}><a href={m.sourceUrl} target="_blank" rel="noreferrer">{m.title} · {m.credit} ↗</a></p>)}<h3>示意照片</h3>{photos.map(p=><p key={p.id}><a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.title} · {p.credit} ↗</a></p>)}<button className="letter-continue" onClick={()=>setReducedMotion(!reducedMotion)}>{reducedMotion?"恢复完整动态":"使用减少动态效果"}</button></article>}
      </div>
    </dialog>
  </main>;
}
