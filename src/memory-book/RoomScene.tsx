import { useId } from 'react';
import { assetUrl } from '../utils/assetUrl';
import './room-scene.css';

/** Separate exterior, architectural alpha plate and foreground share one projection. */
export default function RoomScene({ finale = false, active = true }: { finale?: boolean; active?: boolean }) {
  const id = useId().replace(/:/g, '');
  const plate = assetUrl(`memory-book/${finale ? 'window-night' : 'wizard-study'}-layer.webp`);
  return <div className={`room-scene${finale ? ' room-scene--finale' : ''}${!active ? ' room-scene--paused' : ''}`} aria-hidden="true">
    {!finale && <img className="room-desktop" src={assetUrl('memory-book/library-cinema.webp')} alt="" fetchPriority="high"/>}
    <svg className="room-portrait" viewBox="0 0 1024 1536" preserveAspectRatio="none">
      <defs>
        <clipPath id={`${id}-outside`}><rect x="270" y="0" width="680" height="850"/></clipPath>
        <clipPath id={`${id}-table`}><path d="M0 1010H1024V1536H0Z"/></clipPath>
        <clipPath id={`${id}-curtain`}><path d="M110 0H315L255 645L283 990H110Z M933 0H1024V1002H972L950 673Z"/></clipPath>
        <radialGradient id={`${id}-warm`}><stop stopColor="#ffc06a" stopOpacity=".21"/><stop offset="1" stopColor="#df964b" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-haze`} x2="1" y2=".2"><stop stopColor="#b7cbe2" stopOpacity="0"/><stop offset=".6" stopColor="#b7cbe2" stopOpacity=".1"/><stop offset="1" stopColor="#b7cbe2" stopOpacity="0"/></linearGradient>
      </defs>
      <rect width="1024" height="1536" fill="#121a26"/>
      <g clipPath={`url(#${id}-outside)`}>
        <image className="room-distance" href={assetUrl('memory-book/window-distance.webp')} x="160" y="-65" width="830" height="970" preserveAspectRatio="xMidYMid slice"/>
        <ellipse className="room-cloud" cx="370" cy="315" rx="420" ry="135" fill={`url(#${id}-haze)`}/>
      </g>
      <image href={plate} width="1024" height="1536"/>
      <g clipPath={`url(#${id}-table)`} className="room-table"><image href={plate} x="-5" y="-5" width="1034" height="1551"/></g>
      {finale && <g clipPath={`url(#${id}-curtain)`} className="room-curtain"><image href={plate} width="1024" height="1536"/></g>}
      <ellipse className="room-candle-light" cx="85" cy="1020" rx="405" ry="475" fill={`url(#${id}-warm)`}/>
      <g className="room-flame" transform={finale ? 'translate(59 780)' : 'translate(94 725)'}><ellipse rx="6" ry="28" fill="#ffe7b9" opacity=".8"/></g>
    </svg>
    <div className="room-moonbeam"/><div className="room-contact"/><div className="room-grade"/>
    <div className="room-motes">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ left: `${16 + i * 8}%`, top: `${18 + (i * 19) % 58}%`, animationDelay: `${-i * 2.7}s` }}/>)}</div>
  </div>;
}
