const references = [
  {
    name: '幼年辛巴', stage: '01 / 父子清晨',
    image: 'https://lumiere-a.akamaihd.net/v1/images/g_thelionking_09_97af1e04.jpeg?region=0%2C0%2C1200%2C560',
    alt: 'Disney 1994 版官方剧照，右侧金黄色幼狮为辛巴，左侧为娜娜',
    details: ['金黄色毛色、浅色口鼻与胸腹', '粉色鼻头、琥珀色眼睛、深棕耳内', '额前短毛与尾梢，幼狮的圆耳和大爪'],
    note: '参照右侧的辛巴；左侧是娜娜。',
  },
  {
    name: '木法沙', stage: '02 / 父亲与星空记忆',
    image: 'https://lumiere-a.akamaihd.net/v1/images/g_thelionking_08_e0017c86.jpeg?region=0%2C0%2C1200%2C560',
    alt: 'Disney 1994 版官方剧照，木法沙与幼年辛巴在岩台上',
    details: ['厚实胸肩、宽口鼻与大爪', '浓密而宽阔的红棕鬃毛轮廓', '成熟稳重的眉眼与父亲的亲和感'],
    note: '父子清晨使用木法沙和幼年辛巴各自的资产。',
  },
  {
    name: '成年辛巴', stage: '03 / 成年归来',
    image: 'https://lumiere-a.akamaihd.net/v1/images/g_thelionking_12_d3afab6d.jpeg?region=0%2C0%2C1200%2C560',
    alt: 'Disney 1994 版官方剧照，成年辛巴站在荣耀石上',
    details: ['比木法沙更修长、年轻的体态', '较长的面部轮廓和前额鬃毛', '独立的成年辛巴造型与吼叫动作'],
    note: '成年辛巴不复用木法沙的角色稿或动作图集。',
  },
];

export function LionReference() {
  return <section className="lion-review">
    <div className="lion-intro"><div><p className="eyebrow">THE LION KING · 1994</p><h2>先核对，谁是谁。</h2><p>角色与场景对照来自 <a href="https://movies.disney.com/the-lion-king" target="_blank" rel="noreferrer">Disney 官方 1994 版电影图库</a>。</p></div><span className="asset-status">官方对照已整理 · 角色稿尚未完成</span></div>
    <div className="reference-grid">{references.map((ref) => <article key={ref.name}>
      <p className="eyebrow">{ref.stage}</p><h3>{ref.name}</h3>
      <a href={ref.image} target="_blank" rel="noreferrer"><img src={ref.image} alt={ref.alt} loading="lazy" /></a>
      <small>官方原片对照 · © Disney</small>
      <ul>{ref.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
      <p>{ref.note}</p>
    </article>)}</div>
    <div className="lion-blocker"><strong>当前制作状态</strong><p>本轮角色稿生成被图像服务的安全检查拦截，未产出可交付图稿。这里展示的是官方参考，不是已完成的重绘角色或动作图集。角色稿完成后，才进入走停、回应与吼叫样章。</p></div>
  </section>;
}
