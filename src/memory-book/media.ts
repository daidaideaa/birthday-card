/** Public-relative paths must pass through the app's assetUrl helper for GitHub Pages. */
export interface MemoryPhoto {
  id: string;
  src: string;
  title: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  placeholder: true;
  width: number;
  height: number;
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
    placeholder: true,
    width: 1600,
    height: 1067,
    objectPosition: '50% 50%',
  },
  {
    id: 'sunlit-book',
    src: 'memory-book/photos/sunlit-book.webp',
    title: '寻常的一页，也会发光',
    caption: '愿我们在普通的日子里，也能找到一点小小的魔法。',
    credit: 'Aaron Burden / Unsplash',
    sourceUrl: 'https://unsplash.com/photos/opened-book-on-brown-field-during-daytime-4uX_r8OhJ_o',
    placeholder: true,
    width: 1600,
    height: 1200,
    objectPosition: '50% 62%',
  },
  {
    id: 'city-lights',
    src: 'memory-book/photos/city-lights.webp',
    title: '人间有一盏灯',
    caption: '愿城市再大，也有一处温暖，可以让你安心停下来。',
    credit: 'Paolo Syiaco / Unsplash',
    sourceUrl: 'https://unsplash.com/photos/bokeh-photography-of-city-lights-during-night-time-Uc8wfh1tPUk',
    placeholder: true,
    width: 1600,
    height: 1067,
    objectPosition: '50% 55%',
  },
  {
    id: 'golden-path',
    src: 'memory-book/photos/golden-path.webp',
    title: '下一段路，慢慢走',
    caption: '还有很多风景没有看过，留给往后的我们。',
    credit: 'Stefano Pinotti / Unsplash',
    sourceUrl: 'https://unsplash.com/photos/sunlight-streams-through-a-forest-path-AqFtUA6WhTI',
    placeholder: true,
    width: 1067,
    height: 1600,
    objectPosition: '50% 60%',
  },
  {
    id: 'night-sky',
    src: 'memory-book/photos/night-sky.webp',
    title: '给愿望留一片星空',
    caption: '今晚，所有温柔的星光，都想把祝福送给你。',
    credit: 'Nathan Anderson / Unsplash',
    sourceUrl: 'https://unsplash.com/photos/milky-way-over-mountain-landscape-at-night-L95xDkSSuWw',
    placeholder: true,
    width: 1600,
    height: 1077,
    objectPosition: '50% 50%',
  },
];

export interface MemoryFilm {
  id: string;
  title: string;
  englishTitle: string;
  year: number;
  image: string;
  src: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  watchUrl: string;
  imageDelivery: 'official-remote';
  objectPosition: string;
}

// Official promotional images remain on their original hosts. They are not open-license files.
// These are the 2002 / 1994 hand-drawn films, not the later remakes or generated imitations.
export const movies: MemoryFilm[] = [
  {
    id: 'spirit',
    title: '小马王',
    englishTitle: 'Spirit: Stallion of the Cimarron',
    year: 2002,
    image: 'https://images.contentstack.io/v3/assets/blt13adb7e2033fcee5/blt2815f5291917d13f/690eacd9518443a93372835a/Spirit_PosterArt.jpg?width=800',
    src: 'https://images.contentstack.io/v3/assets/blt13adb7e2033fcee5/blt2815f5291917d13f/690eacd9518443a93372835a/Spirit_PosterArt.jpg?width=800',
    caption: '愿你一直有奔向旷野的勇气，也有不必独自面对风雨的温柔。',
    credit: '© DreamWorks Animation · Universal 官方原版海报',
    sourceUrl: 'https://www.universalpicturesathome.com/movies/spirit-stallion-of-the-cimarron',
    watchUrl: 'https://www.youtube.com/watch?v=RPJ4EQ2Eh9I',
    imageDelivery: 'official-remote',
    objectPosition: '50% 50%',
  },
  {
    id: 'lion-king',
    title: '狮子王',
    englishTitle: 'The Lion King',
    year: 1994,
    image: 'https://lumiere-a.akamaihd.net/v1/images/g_thelionking_01_fd5dcd2d.jpeg?region=0%2C0%2C1200%2C560',
    src: 'https://lumiere-a.akamaihd.net/v1/images/g_thelionking_01_fd5dcd2d.jpeg?region=0%2C0%2C1200%2C560',
    caption: '愿你无论走到哪里，都记得自己值得被爱，也值得拥有自己的辽阔。',
    credit: '© Disney · 官方原版剧照',
    sourceUrl: 'https://movies.disney.com/the-lion-king',
    watchUrl: 'https://video.disney.com/watch/the-lion-king-trailer-554364a2df54eb31138c2eaf',
    imageDelivery: 'official-remote',
    objectPosition: '50% 50%',
  },
];
