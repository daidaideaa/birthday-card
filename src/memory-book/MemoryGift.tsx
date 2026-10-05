import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
const Journey = lazy(() => import("./Journey"));
import Pets from "./Pets";
const Cinema = lazy(() => import("./Cinema"));
import MagicObject from "./MagicObject";
import RoomScene from "./RoomScene";
import { LAST_BOOK_SPREAD } from "./bookPages";
import useMusic from "./useMusic";
import ChapterTransition, { transitionDuration, type TransitionKind } from "./ChapterTransition";
import { photos, movies } from "./media";
import { assetUrl } from "../utils/assetUrl";
import "./memory-book.css";
import "./magic-object.css";
import "./mobile-experience.css";

const chapters = ["只认识你", "两条来路", "藏起时光", "风与星光", "为你点亮"];
const ids = ["invitation", "journey", "photos", "cinema", "wish"];
const numerals = ["I", "II", "III", "IV", "V"];
const letter = [
"今晚，我想送给你一本有一点偏心的书。它记不住所有咒语，却记得你的名字；它也没有收藏整个世界，只想把一些温柔的光，留在你翻开它的时候。",
"从河南周口到天津，从北京的中国政法大学到香港科技大学，再到深圳，你走过的每一段路，都值得被认真地看见。我没有参与其中的每一天，也不会假装知道每一页故事。但如果你愿意，我想慢慢听你讲：那些让你开心的、让你骄傲的，还有偶尔觉得有一点辛苦的时刻。",
"我的那条路，从湖北武汉，经过南京的东南大学、上海交通大学，也来到了深圳。很高兴，两条各自向前的路，后来有了可以并排写下的一页。",
"所以这本书里，我留了风，留了星光，也留了几张以后可以换成我们照片的位置。希望它不只是带你回头看看，也能让你期待，前面还有多少风景值得我们慢慢发现。",
"新的一岁，愿你继续喜欢自己喜欢的事，走自己想走的路。想勇敢的时候，就向前一点；想休息的时候，也可以安心停下来。不必每一天都很厉害，你的快乐本身就很值得被放在心上。",
"等你翻到最后，那只深蓝色的蛋糕会替今晚留住一点星空。先别急着吹灭蜡烛，把那个最想实现的愿望，悄悄留给自己。",
"师宝宝，生日快乐。谢谢你出现在我的故事里。书里还留着一些空白，往后的日子，想和你一页一页地写。",
];
const media = (path: string) => /^https:\/\//.test(path) ? path : assetUrl(path);

export default function MemoryGift(){
  const [chapter,setChapter]=useState(()=>Math.max(0,ids.indexOf(window.location.hash.slice(1))));
  const [transition,setTransition]=useState<TransitionKind|"">("");
  const [chromeVisible,setChromeVisible]=useState(true);
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [awake,setAwake]=useState(false);
  const [bookPage,setBookPage]=useState(0);
  const [bookTurning,setBookTurning]=useState(false);
  const [readingSide,setReadingSide]=useState<'spread'|'left'|'right'>('spread');
  const [photo,setPhoto]=useState(0);
  const [wish,setWish]=useState<"lit"|"making"|"blown">("lit");
  const [celebrate,setCelebrate]=useState(0);
  const [modal,setModal]=useState<"letter"|"photo"|"credits"|null>(null);
  const [menu,setMenu]=useState(false);
  const [hidden,setHidden]=useState(document.hidden);
  const timers=useRef<number[]>([]);
  const dialog=useRef<HTMLDialogElement>(null);
  const music=useMusic(chapter);
  const currentPhoto=photos[photo];
  const go=useCallback((target:number)=>{
    if(target===chapter||target<0||target>4||transition)return;
    timers.current.forEach(clearTimeout);timers.current=[];
    if(target===0){setAwake(false);setBookPage(0);setReadingSide('spread');}
    setMenu(false);setModal(null);
    const kind:TransitionKind=target<chapter?"return":(["book","sand","wind","star"] as const)[chapter]||"book";
    setTransition(kind);
    const duration=reducedMotion?100:transitionDuration(kind);
    timers.current.push(window.setTimeout(()=>{
      const enter=()=>{flushSync(()=>setChapter(target));window.history.pushState(null,"","#"+ids[target]);window.scrollTo({top:0,behavior:"instant"});};
      if(!reducedMotion&&document.startViewTransition)document.startViewTransition(enter);
      else enter();
    },duration*.5),window.setTimeout(()=>setTransition(""),duration));
  },[chapter,reducedMotion,transition]);
  useEffect(()=>{
    let idle=0;
    const schedule=()=>{clearTimeout(idle);if(!menu&&!modal)idle=window.setTimeout(()=>setChromeVisible(false),4800);};
    const reveal=()=>{setChromeVisible(true);schedule();};
    schedule();
    window.addEventListener("pointermove",reveal,{passive:true});
    window.addEventListener("pointerdown",reveal,{passive:true});
    window.addEventListener("keydown",reveal);window.addEventListener("focusin",reveal);
    return()=>{clearTimeout(idle);window.removeEventListener("pointermove",reveal);window.removeEventListener("pointerdown",reveal);window.removeEventListener("keydown",reveal);window.removeEventListener("focusin",reveal);};
  },[chapter,menu,modal]);
  useEffect(()=>{
    const onHash=()=>{
      timers.current.forEach(clearTimeout);timers.current=[];
      setTransition("");setMenu(false);setModal(null);setAwake(false);setBookPage(0);setReadingSide('spread');
      setChapter(Math.max(0,ids.indexOf(window.location.hash.slice(1))));
    };
    const onVisibility=()=>setHidden(document.hidden);
    window.addEventListener("hashchange",onHash);document.addEventListener("visibilitychange",onVisibility);
    return()=>{timers.current.forEach(clearTimeout);window.removeEventListener("hashchange",onHash);document.removeEventListener("visibilitychange",onVisibility);};
  },[]);
  useLayoutEffect(()=>{window.scrollTo({top:0,behavior:"instant"});},[chapter]);
  useEffect(()=>{
    if(chapter===0)void import('./Journey');
    if(chapter===2)void import('./Cinema');
  },[chapter]);
  useEffect(()=>{
    if(modal&&!dialog.current?.open)dialog.current?.showModal();
    if(!modal&&dialog.current?.open)dialog.current?.close();
  },[modal]);
  const openBook=()=>{
    if(transition||bookTurning)return;
    if(awake){if(bookPage<LAST_BOOK_SPREAD)setBookPage(value=>value+1);else go(1);return;}
    setAwake(true);
  };
  const blow=()=>{
    if(wish==="lit"){setWish("making");return;}
    setWish("blown");setCelebrate(n=>n+1);
  };
  return <main className={"memory-gift scene-"+chapter+(readingSide!=='spread'&&chapter===0?' is-book-reading':'')+(reducedMotion?" reduce-motion":"")+(hidden?" is-hidden":"")+(transition?" is-transitioning":"")+(!chromeVisible&&!menu&&!modal?" chrome-resting":"")}>
    <style>{'@font-face{font-family:GiftSerif;src:url("'+assetUrl("memory-book/serif.woff")+'") format("woff");font-display:swap}'}</style>
    <header className="gift-header">
      <button className="gift-brand" onClick={()=>go(0)} aria-label="回到古书封面"><span className="brand-star">✧</span><span>写给师宝宝的一场梦</span></button>
      <div className="gift-tools">
        <button className={"sound-switch "+(music.playing?"is-on":"")} onClick={music.toggle} aria-label={music.playing?"关闭音乐":"开启音乐"} aria-pressed={music.playing}><span className="sound-bars"><i/><i/><i/><i/></span><span>{music.playing?"音乐已开启":"开启音乐"}</span></button>
        <button className="chapter-menu-toggle" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-label="章节目录">目录 <span>☰</span></button>
      </div>
    </header>
    {menu&&<nav className="chapter-menu" aria-label="章节目录">{chapters.map((c,i)=><button key={c} aria-current={chapter===i?"page":undefined} onClick={()=>go(i)}><span>{numerals[i]}</span>{c}<small>↗</small></button>)}<button onClick={()=>setReducedMotion(!reducedMotion)}>减少动态 <small>{reducedMotion?"已开启":"未开启"}</small></button><button onClick={()=>{setMenu(false);setModal("credits");}}>关于这份礼物 <small>✧</small></button></nav>}
    <div className="chapter-stage" aria-busy={!!transition} inert={!!transition}>
      <div className="chapter-content" key={chapter}>
      {chapter===0&&<section className={"invitation "+(awake?"is-awake":"")} aria-label="第一章 这本书只认识你">
        <RoomScene active={!hidden&&!modal&&!menu&&!transition}/>
        <MagicObject kind="book" open={awake} pageIndex={bookPage} onPageChange={setBookPage} onTurningChange={setBookTurning} onReadingChange={setReadingSide} reducedMotion={reducedMotion} onOpen={()=>{setAwake(value=>!value);setBookPage(0);setReadingSide('spread');}}/>
        <div className="invitation-copy" data-pet-obstacle><p className="eyebrow">序 · 为你启封</p><div className="tiny-rule"/><h1>今晚，<br/>故事只认识<span>你。</span></h1><p className="intro-lines">有一本书，等了很久。<br/>直到你来，它才有了名字。</p></div>
        <div className="invitation-actions" data-pet-obstacle><button className="gold-button" disabled={bookTurning} onClick={openBook}>{!awake?"打开这本书":bookPage<LAST_BOOK_SPREAD?"翻到下一页":"跟着书页出发"}<span>{awake&&bookPage<LAST_BOOK_SPREAD?"→":"✧"}</span></button><p className="quiet-note">{awake?bookPage<LAST_BOOK_SPREAD?"慢慢翻，这里的偏爱，只写给你。":"师宝宝，接下来，让故事带你出发。":"一场只为你准备的，生日奇遇"}</p></div>
      </section>}
      {chapter===1&&<section className="journey-chapter" aria-label="第二章 两条路终于同向"><Suspense fallback={<p className="chapter-loading">沙粒正在汇集成故事…</p>}><Journey onComplete={()=>go(2)} reducedMotion={reducedMotion} active={!modal&&!menu&&!transition&&!hidden}/></Suspense></section>}
      {chapter===2&&<section className="photos-chapter" aria-label="第三章 照片与书信">
        <div className="section-heading"><p className="eyebrow">CHAPTER III · LITTLE MOMENTS</p><h1>把喜欢的时刻，<em>藏进书里。</em></h1><p>有些风景，想和你慢慢看。</p></div>
        <div className="album">
          <div className="album-page album-note"><span className="page-corner"/><p className="album-label">一页风景 · 一点喜欢</p><span className="album-number">0{photo+1}</span><h2>{currentPhoto.title}</h2><p>{currentPhoto.caption}</p><div className="photo-count"><span>{String(photo+1).padStart(2,"0")}</span><i/>{String(photos.length).padStart(2,"0")}</div><button className="letter-link" onClick={()=>setModal("letter")}><span className="envelope-icon">✉</span> 有些话，只写给你 <span>↗</span></button></div>
          <div className="album-page album-image"><button className="photo-mount" key={currentPhoto.id} onClick={()=>setModal("photo")} aria-label={"放大照片："+currentPhoto.title}><img src={media(currentPhoto.src)} alt={currentPhoto.title+"，网图示意"} style={{objectPosition:currentPhoto.objectPosition}}/><span className="photo-mount-hint">轻触，放大这一刻 ↗</span></button><div className="album-controls"><button disabled={photo===0} onClick={()=>setPhoto(photo-1)} aria-label="上一张照片">←</button><span>示意照片 · 以后换成我们的</span><button disabled={photo===photos.length-1} onClick={()=>setPhoto(photo+1)} aria-label="下一张照片">→</button></div></div>
        </div>
        <div className="chapter-bottom"><span>把平凡的一天，也过成值得收藏的一页。</span><button className="text-button" onClick={()=>setModal("letter")}>打开给你的信 <b>↗</b></button><button className="text-button" onClick={()=>go(3)}>下一章 <b>→</b></button></div>
      </section>}
      {chapter===3&&<Suspense fallback={<p className="chapter-loading">风正把这一页轻轻吹开…</p>}><Cinema reducedMotion={reducedMotion} muted={!music.playing} active={!modal&&!menu&&!transition&&!hidden} onComplete={()=>go(4)}/></Suspense>}
      {chapter===4&&<section className={"wish-chapter wish-"+wish} aria-label="第五章 魔法星空蛋糕">
        <RoomScene finale active={!hidden&&!modal&&!menu&&!transition}/>
        <div className="wish-heading" data-pet-obstacle><p className="eyebrow">终章 · 为你点亮</p><h1>{wish==="blown"?"师宝宝，生日快乐。":wish==="making"?"这一刻，把愿望留给你。":"今晚的星光，都为你亮起。"}</h1><p>{wish==="blown"?"愿你一直勇敢，也一直被爱。":wish==="making"?"不用说出来，也不必着急。许好了，就轻轻吹灭蜡烛。":"先别急着吹灭蜡烛，把最想实现的愿望，悄悄放在心里。"}</p></div>
        <MagicObject kind="cake" extinguished={wish==="blown"} reducedMotion={reducedMotion}/>
        <div className="wish-actions" data-pet-obstacle>{wish!=="blown"?<button className="gold-button" onClick={blow}>{wish==="lit"?"许个愿吧":"轻轻吹灭蜡烛"}<span>✧</span></button>:<><p className="after-wish">书里还留着一些空白，想和你一页一页地写。</p><div><button className="text-button" onClick={()=>setModal("letter")}>重读给你的信 ↗</button><button className="text-button" onClick={()=>go(2)}>回看照片 ↗</button><button className="text-button" onClick={()=>setWish("lit")}>再点亮一次 ✧</button></div></>}</div>
      </section>}
      </div>
      <Pets scene={chapter} quiet={modal!==null||menu||chapter===3||(chapter===0&&readingSide!=='spread')} transitioning={!!transition} reducedMotion={reducedMotion} celebrate={celebrate}/>
    </div>
    <footer className="gift-footer"><span className="footer-dedication">只为你，慢慢展开。</span><nav aria-label="故事章节">{chapters.map((c,i)=><button key={c} onClick={()=>go(i)} aria-current={i===chapter?"step":undefined} aria-label={"第"+(i+1)+"章 "+c}><span>{String(i+1).padStart(2,"0")}</span><i/>{c}</button>)}</nav><button className="footer-about" onClick={()=>setModal("credits")} aria-label="关于这份礼物">✧</button></footer>
    {!!transition&&<ChapterTransition kind={transition} reducedMotion={reducedMotion} photo={media(currentPhoto.src)}/>}
    <dialog ref={dialog} className={"gift-dialog modal-"+modal} onCancel={()=>setModal(null)} onClose={()=>setModal(null)} onClick={event=>{if(event.target===event.currentTarget)setModal(null);}}>
      <div className="dialog-content"><button className="dialog-close" onClick={()=>setModal(null)} aria-label="关闭">×</button>
        {modal==="letter"&&<article className="letter-paper"><p className="eyebrow">SOME WORDS, JUST FOR YOU</p><span className="letter-stamp">✧</span><h2>亲爱的师宝宝：</h2>{letter.map(p=><p key={p}>{p}</p>)}<p>愿你一直勇敢，也一直被爱。</p><p className="letter-signature">生日快乐呀 ♡</p><small className="draft-note">书信暂拟，之后可以换成我想亲口对你说的话。</small><button className="letter-continue" onClick={()=>{setModal(null);go(3);}}>把这封信收好，去看看风与星光 →</button></article>}
        {modal==="photo"&&<figure className="full-photo"><img src={media(currentPhoto.src)} alt={currentPhoto.title}/><figcaption>{currentPhoto.title}<small>示意照片 · {currentPhoto.credit}</small></figcaption></figure>}
        {modal==="credits"&&<article className="credits-paper"><p className="eyebrow">ABOUT THIS LITTLE GIFT</p><h2>为你，留一点魔法。</h2><p>一本只认识你的书，两条在深圳汇合的路，一封慢慢读的信，还有今晚的星空。</p><p>相册暂用5张风景网图，之后可以换成我们的照片。书信是暂拟文字；旅程只记录已经知道的地点，没有补写年份和往事。</p><h3>画面与声音</h3><p>古书和星空蛋糕由 Blender 建模，支持实时转动、翻页与烛火；二维泰迪拥有分层连续动作。沙画使用开源 SandKit，地图轮廓来自 Natural Earth。音乐为本项目合成的钢琴泛音、轻钟与柔和和声。</p><p>电影章将《小马王》《狮子王》的原版角色短动作分离后，融入新的旷野与星空，重新编排为这一页祝福。电影角色与原画版权属于各权利人，背景和场景编排为本项目制作。</p>{movies.map(m=><p key={m.id}><a href={m.sourceUrl} target="_blank" rel="noreferrer">{m.title} · {m.credit} ↗</a></p>)}<h3>示意照片</h3>{photos.map(p=><p key={p.id}><a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.title} · {p.credit} ↗</a></p>)}<button className="letter-continue" onClick={()=>setReducedMotion(!reducedMotion)}>{reducedMotion?"恢复完整动态":"使用减少动态效果"}</button></article>}
      </div>
    </dialog>
  </main>;
}
