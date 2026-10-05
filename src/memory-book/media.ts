/** Public-relative paths must pass through the app's assetUrl helper for GitHub Pages. */
export interface MemoryPhoto {
  id: string;
  src: string;
  title: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  objectPosition: string;
}

export const photos: MemoryPhoto[] = [
  {
    id: 'ocean-evening',
    src: 'memory-book/photos/ocean-evening.webp',
    title: '把黄昏留给你',
    caption: '希望往后的日子，有很多可以一起慢慢看的落日。',
    credit: 'Veronica MORENO-ALVAREZ / Unsplash',
    sourceUrl: 'https://unsplash.com/photos/ocean-waves-at-sunset-with-pink-sky-l_yA9G07D4A',
    objectPosition: '50% 50%',
  },
  {
    id: 'sunlit-book',
    src: 'memory-book/photos/sunlit-book.webp',
    title: '寻常的一页，也会发光',
    caption: '愿我们在普通的日子里，也能找到一点小小的魔法。',
    credit: 'Aaron Burden / Unsplash',
    sourceUrl: 'https://unsplash.com/photos/opened-book-on-brown-field-during-daytime-4uX_r8OhJ_o',
    objectPosition: '50% 62%',
  },
  {
    id: 'city-lights',
    src: 'memory-book/photos/city-lights.webp',
    title: '人间有一盏灯',
    caption: '愿城市再大，也有一处温暖，可以让你安心停下来。',
    credit: 'Paolo Syiaco / Unsplash',
    sourceUrl: 'https://unsplash.com/photos/bokeh-photography-of-city-lights-during-night-time-Uc8wfh1tPUk',
    objectPosition: '50% 55%',
  },
  {
    id: 'golden-path',
    src: 'memory-book/photos/golden-path.webp',
    title: '下一段路，慢慢走',
    caption: '还有很多风景没有看过，留给往后的我们。',
    credit: 'Stefano Pinotti / Unsplash',
    sourceUrl: 'https://unsplash.com/photos/sunlight-streams-through-a-forest-path-AqFtUA6WhTI',
    objectPosition: '50% 60%',
  },
  {
    id: 'night-sky',
    src: 'memory-book/photos/night-sky.webp',
    title: '给愿望留一片星空',
    caption: '今晚，所有温柔的星光，都想把祝福送给你。',
    credit: 'Nathan Anderson / Unsplash',
    sourceUrl: 'https://unsplash.com/photos/milky-way-over-mountain-landscape-at-night-L95xDkSSuWw',
    objectPosition: '50% 50%',
  },
];

export interface MemoryFilm {
  id: string;
  title: string;
  credit: string;
  sourceUrl: string;
}

// Short community reaction GIFs are the motion references, not an open-license film library.
// The production foregrounds retain the original 2002 / 1994 animation and rights attribution.
export const movies: MemoryFilm[] = [
  {
    id: 'spirit',
    title: '小马王（2002）',
    credit: '© DreamWorks Animation · 短动作来源 MrThreat / Tenor',
    sourceUrl: 'https://tenor.com/view/horses-spirit-spirit2002-spirit-stallion-of-the-cimarron-gif-14770152',
  },
  {
    id: 'lion-king',
    title: '狮子王（1994）',
    credit: '© Disney · 短动作来源 Sephirock38 / Tenor',
    sourceUrl: 'https://tenor.com/view/lion-king-simba-nala-in-love-gif-18769637',
  },
];
