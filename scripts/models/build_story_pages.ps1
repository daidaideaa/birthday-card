param([string]$OutputDirectory = (Join-Path $PSScriptRoot '../../.asset-build/memory-book/masters/textures'))

$ErrorActionPreference = 'Stop'

# Original, deterministic pen-and-ink artwork. No external pictures, generated
# lettering, campus claims or inferred dates. Windows GDI+ renders real Chinese.
Add-Type -AssemblyName System.Drawing
$drawingSource = @'
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;

public static class StoryPages {
  const int W=768, H=1024;
  static Graphics g;
  static Random random;
  static Color ink=Color.FromArgb(38,25,16), faint=Color.FromArgb(96,72,46), gold=Color.FromArgb(118,79,30), blue=Color.FromArgb(49,64,82);
  // Screen-space page width is often only 200 px. Preserve ink after mipmapping
  // and strong practical scene lighting instead of treating this as print artwork.
  static Pen pen(Color c,float w=1.35f) { var p=new Pen(c,Math.Max(1.5f,w*1.7f)); p.StartCap=LineCap.Round;p.EndCap=LineCap.Round;p.LineJoin=LineJoin.Round;return p; }
  static void line(float x,float y,float X,float Y,Color c,float w=1.35f) { using(var p=pen(c,w))g.DrawLine(p,x,y,X,Y); }
  static void ellipse(float x,float y,float w,float h,Color c,float sw=1.3f) { using(var p=pen(c,sw))g.DrawEllipse(p,x,y,w,h); }
  static void dot(float x,float y,float r,Color c) { using(var b=new SolidBrush(c))g.FillEllipse(b,x-r,y-r,r*2,r*2); }
  static void curve(Color c,float width,params float[] a) { var ps=new PointF[a.Length/2];for(int i=0;i<ps.Length;i++)ps[i]=new PointF(a[i*2],a[i*2+1]);using(var p=pen(c,width))g.DrawCurve(p,ps,.45f); }
  static void poly(Color c,float width,params float[] a) { var ps=new PointF[a.Length/2];for(int i=0;i<ps.Length;i++)ps[i]=new PointF(a[i*2],a[i*2+1]);using(var p=pen(c,width))g.DrawLines(p,ps); }
  static void bez(Color c,float width,float x,float y,float x1,float y1,float x2,float y2,float X,float Y) { using(var p=pen(c,width))g.DrawBezier(p,x,y,x1,y1,x2,y2,X,Y); }
  static void text(string t,float y,float size,string font="华文楷体",Color? color=null, bool center=true,float x=0) {
    using(var f=new Font(font,size,font=="Georgia"?FontStyle.Regular:FontStyle.Bold,GraphicsUnit.Pixel))using(var b=new SolidBrush(color ?? ink))using(var format=new StringFormat()) {
      format.Alignment=center?StringAlignment.Center:StringAlignment.Near;
      format.LineAlignment=StringAlignment.Near;
      g.DrawString(t,f,b,new RectangleF(x,y,center?W:W-x-66,140),format);
    }
  }
  static void latin(string t,float y=78) { text(t,y,13,"Georgia",faint); }
  static void title(string t){ text(t,137,46);line(330,209,438,209,faint,.8f);dot(384,209,2,gold); }
  static void star(float x,float y,float r,Color c) { line(x-r,y,x+r,y,c,1.1f);line(x,y-r,x,y+r,c,1.1f);line(x-r*.5f,y-r*.5f,x+r*.5f,y+r*.5f,c,.7f);line(x+r*.5f,y-r*.5f,x-r*.5f,y+r*.5f,c,.7f); }
  static void waves(float x,float y,float width,int n) { for(int i=0;i<n;i++){float xx=x+(i%3)*13;curve(i%3==0?ink:faint,.85f,xx,y+i*10,xx+width*.23f,y+i*10-2,xx+width*.53f,y+i*10+3,xx+width*.82f,y+i*10-1,xx+width,y+i*10+1);} }
  static void hatch(float x,float y,float w,float h,int n) { for(int i=0;i<n;i++){float a=x+(float)random.NextDouble()*w,b=y+(float)random.NextDouble()*h;line(a,b,a+5+(float)random.NextDouble()*10,b-2,faint,.65f);} }
  static void corner(float x,float y,float dx,float dy) {line(x,y,x+dx*36,y,faint,.65f);line(x,y,x,y+dy*40,faint,.65f);dot(x,y,1.4f,gold);}
  static Bitmap paper(int page) {
    var bmp=new Bitmap(W,H,PixelFormat.Format24bppRgb);random=new Random(3911+page*1709);
    var d=bmp.LockBits(new Rectangle(0,0,W,H),ImageLockMode.WriteOnly,PixelFormat.Format24bppRgb);var data=new byte[d.Stride*H];
    for(int y=0;y<H;y++)for(int x=0;x<W;x++) {
      double e=Math.Min(Math.Min(x,W-1-x),Math.Min(y,H-1-y));
      double edge=18*Math.Exp(-e/23), cloudy=2.1*Math.Sin(x*.016+page)*Math.Cos(y*.014)+1.8*Math.Sin(y*.009+x*.008);
      double grain=(random.NextDouble()-.5)*6, fibre=(x%23==0?.6:0);
      int i=y*d.Stride+x*3;
      data[i]=(byte)Math.Max(0,Math.Min(255,160-edge+cloudy+grain-fibre));
      data[i+1]=(byte)Math.Max(0,Math.Min(255,190-edge*.77+cloudy+grain-fibre));
      data[i+2]=(byte)Math.Max(0,Math.Min(255,210-edge*.58+cloudy+grain-fibre));
    }
    System.Runtime.InteropServices.Marshal.Copy(data,0,d.Scan0,data.Length);bmp.UnlockBits(d);return bmp;
  }
  static void borders(int page) {
    // Frayed paper flecks and one quiet archival rule, never a decorative flower frame.
    for(int i=0;i<340;i++) { float x=(float)random.NextDouble()*W,y=(float)random.NextDouble()*H;
      using(var b=new SolidBrush(Color.FromArgb(random.Next(8,23),120,82,47)))g.FillEllipse(b,x,y,.7f+random.Next(2),.6f+random.Next(2)); }
    corner(48,47,1,1);corner(720,47,-1,1);corner(48,976,1,-1);corner(720,976,-1,-1);
    text((page+1).ToString("00"),939,14,"Georgia",faint);
    line(352,928,416,928,faint,.6f);
  }
  static void wing(float x,float y,bool right) {
    float dir=right?1:-1;
    curve(ink,1.5f,x,y,x+dir*24,y-39,x+dir*77,y-81,x+dir*125,y-103);
    curve(ink,1.2f,x+dir*125,y-103,x+dir*110,y-56,x+dir*61,y-8,x,y);
    for(int i=0;i<10;i++) {float t=i/9f;float ax=x+dir*(10+t*101),ay=y-7-t*81;
      curve(ink,.9f,ax,ay,ax+dir*12,ay+3,ax+dir*(23-t*13),ay+17+t*18);
      line(ax+dir*4,ay+5,ax+dir*19,ay+15+t*15,faint,.6f);
    }
  }
  static void key(float cx,float cy,float s=1) {
    var st=g.Save();g.TranslateTransform(cx,cy);g.ScaleTransform(s,s);g.RotateTransform(-24);
    wing(0,-13,false);wing(0,-13,true);ellipse(-23,-34,46,46,ink,2);ellipse(-13,-24,26,26,faint,1);
    line(0,12,0,126,ink,4);line(4,15,4,128,faint,.8f);poly(ink,3,0,119,25,119,25,103,36,103,36,130,0,130);g.Restore(st);
  }
  static void page0() {
    latin("LIBER MEMORIAE  ·  AD TE");title("只为你打开");key(384,397,1.2f);
    ellipse(236,274,296,296,faint,.65f);star(550,305,9,gold);star(207,488,6,faint);
    text("师宝宝",665,58);text("每一段走过的路",780,28);text("都值得被温柔收藏",828,28);
  }
  static void page1() {
    latin("I.  ITINERA EIUS");title("她的来路");
    // A winding river and three stops; this is a narrative route, not a geographic map.
    curve(ink,1.8f,131,311,234,340,285,398,410,424,462,505,606,544);
    curve(faint,1.1f,123,329,219,360,271,419,398,444,449,529,601,563);
    curve(faint,.7f,139,315,236,346,286,405,407,429,458,512,605,550);
    for(int i=0;i<8;i++){line(134+i*13,365+i*5,157+i*13,358+i*5,faint,.7f);line(464+i*12,568+i*3,476+i*12,564+i*3,faint,.7f);}
    float[,] stops={{191,331},{371,416},{553,532}};
    for(int i=0;i<3;i++){dot(stops[i,0],stops[i,1],5,ink);ellipse(stops[i,0]-12,stops[i,1]-12,24,24,faint,.8f);}
    text("河南周口",267,27,"华文楷体",ink,false,113);text("天津",364,29,"华文楷体",ink,false,360);
    text("北京",572,27,"华文楷体",ink,false,510);text("中国政法大学",618,29,"华文楷体",ink,false,407);
    text("河南周口 → 天津",754,28);text("北京 · 中国政法大学",806,30);
    latin("Flumen memoriam servat.",874);
  }
  static void buildings(float x,float baseline,int[] heights,int unit=25) {
    for(int i=0;i<heights.Length;i++){float X=x+i*unit,h=heights[i];poly(ink,1,X,baseline,X,baseline-h,X+unit-6,baseline-h,X+unit-6,baseline);for(int j=1;j<(int)(h/14);j++)line(X+5,baseline-j*14,X+unit-12,baseline-j*14,faint,.6f);}
  }
  static void page2() {
    latin("II.  INTER MONTES ET MARE");title("山海之间");
    curve(faint,1.2f,101,462,163,415,202,436,270,366,326,409,387,372,457,445,524,403,658,463);
    curve(faint,.7f,112,472,175,429,207,448,274,380,325,420,387,384,451,453,534,418,650,470);
    buildings(132,532,new int[]{41,54,71,52,102,71,61,38},23);buildings(446,532,new int[]{44,55,88,61,70,46},24);
    waves(105,546,551,5);line(413,412,413,540,ink,1.6f);poly(ink,1.3f,409,420,349,512,409,503);poly(ink,1.1f,419,447,459,513,419,508);curve(ink,1.5f,362,539,387,550,439,550,459,535);line(361,534,459,534,ink,1.5f);
    hatch(146,595,445,33,32);star(592,328,8,gold);
    text("香港 · 香港科技大学",736,31);text("↓",790,26,"宋体",faint);text("深圳",841,31);
  }
  static void page3() {
    latin("III.  UNDE INCEPIT");title("他的起点");
    // River city impression, without inventing a particular campus.
    buildings(109,496,new int[]{33,54,79,44,29,52,93,58,40,49,34,21,45,60,32,39,27,34,31},28);
    curve(ink,1.1f,101,504,232,496,380,501,505,490,667,503);
    for(int i=0;i<8;i++) waves(117+i*12,520+i*15,504-i*25,1);
    curve(ink,1.7f,197,610,285,642,415,633,540,606);poly(ink,1.3f,526,600,542,606,532,620);
    dot(194,609,6,ink);dot(543,604,6,ink);text("武汉",314,34,"华文楷体",ink,false,139);text("南京",368,34,"华文楷体",ink,false,497);
    text("湖北武汉",746,31);text("↓",795,25,"宋体",faint);text("南京 · 东南大学",846,31);
  }
  static void page4() {
    latin("IV.  VERSUS MERIDIEM");title("向南而行");
    // An invented bridge engraving, intentionally no recognizable campus gate.
    line(120,493,648,493,ink,2);line(120,502,648,502,faint,1);
    poly(ink,2,236,566,236,332,248,319,260,332,260,566);poly(ink,2,509,566,509,351,521,338,533,351,533,566);
    curve(ink,1.8f,111,449,247,334,382,451,521,353,655,455);
    for(int i=0;i<28;i++){float x=120+i*19;float y=x<247?334+(247-x)*.84f:(x<383?334+(x-247)*.86f:(x<521?451-(x-383)*.7f:353+(x-521)*.77f));line(x,y,x,491,faint,.8f);}
    waves(124,576,514,4);ellipse(218,669,18,18,ink);ellipse(530,669,18,18,ink);curve(ink,1.1f,241,678,360,686,425,675,529,678);poly(ink,1,519,670,529,678,518,685);
    text("上海 · 上海交通大学",751,31);text("↓",800,25,"宋体",faint);text("深圳",850,31);
  }
  static void page5() {
    latin("V.  DUAE VIAE, UNA LUX");title("在深圳并肩");
    // Two independent paths retain their identity and form a soft knot.
    curve(ink,2.5f,182,300,186,383,309,450,408,525,410,567,376,574,343,549,367,506,425,481,543,398,581,307);
    curve(gold,2.3f,179,303,159,392,268,469,370,534,393,567,424,556,438,530,409,498,369,478,296,447,229,385);
    curve(ink,2.2f,408,524,475,579,517,639,522,690);curve(gold,2.1f,370,534,414,589,435,650,433,701);
    ellipse(166,283,25,25,faint,.8f);ellipse(570,283,25,25,faint,.8f);
    star(482,387,9,gold);star(296,640,6,faint);
    text("深圳",727,41);text("两条各自走来的路",800,29);text("从这里开始并肩",850,29);
  }
  static void feather(float cx,float cy,float scale=1) {
    var state=g.Save();g.TranslateTransform(cx,cy);g.ScaleTransform(scale,scale);g.RotateTransform(28);
    bez(ink,1.7f,-1,122,-13,44,13,-90,6,-175);
    curve(ink,1.1f,3,-172,-45,-110,-61,-32,-31,40,-4,87,14,41,41,-37,36,-107,3,-172);
    for(int i=0;i<21;i++){float y=-147+i*10;float span=37*(float)Math.Sin((i+2)*Math.PI/26);line(0,y,-span-2,y-25,ink,.75f);line(1,y,span*.75f,y-31,faint,.75f);}
    line(-1,88,-3,127,ink,2);g.Restore(state);
  }
  static void page6() {
    latin("VI.  EPISTOLA TIBI");title("写给你");
    var state=g.Save();g.TranslateTransform(335,520);g.RotateTransform(-8);
    poly(ink,1.5f,-150,-74,150,-74,150,93,-150,93,-150,-74);poly(ink,1.2f,-150,-74,0,28,150,-74);poly(faint,1,-150,93,-28,6);poly(faint,1,150,93,28,6);g.Restore(state);
    feather(487,397,.95f);ellipse(416,565,41,40,gold,2);line(426,584,447,584,gold,1.4f);line(439,574,439,594,gold,1);
    text("你走过的每一段路，",730,28);text("都值得被看见。",774,28);
    text("愿往后的日子里，有热爱，",834,25);text("也有被偏爱的安心。",874,25);
  }
  static void frame(float x,float y,float w,float h,float rotation) {
    var state=g.Save();g.TranslateTransform(x,y);g.RotateTransform(rotation);
    using(var b=new SolidBrush(Color.FromArgb(90,246,232,210)))g.FillRectangle(b,0,0,w,h);
    using(var p=pen(ink,1.2f))g.DrawRectangle(p,0,0,w,h);
    using(var p=pen(faint,.8f))g.DrawRectangle(p,12,13,w-24,h-47);
    line(6,6,27,6,faint,.7f);line(w-6,h-6,w-25,h-6,faint,.7f);g.Restore(state);
  }
  static void page7() {
    latin("VII.  LUCEM RETINERE");title("把光留住");
    line(131,311,644,292,ink,1.3f);frame(168,329,204,251,-11);frame(406,321,202,249,10);
    line(199,302,199,338,ink,4);line(484,296,484,335,ink,4);
    // Contact print tray with a small unexposed strip; no invented photograph.
    poly(ink,1.4f,228,642,561,642,587,703,205,703,228,642);poly(faint,1,241,653,547,653,566,688,222,688,241,653);
    poly(ink,1,302,661,483,662,499,680,292,680,302,661);hatch(240,706,278,18,23);
    text("有些瞬间，",791,32);text("值得慢慢收藏。",846,32);
  }
  static void page8() {
    latin("VIII.  VENTUS RESPONDET");title("风会回答");
    curve(ink,1.8f,115,366,243,329,417,345,589,315,625,339,569,366,422,382);
    curve(faint,1.3f,159,410,300,380,462,390,600,368);curve(ink,1.1f,285,438,415,418,542,425,647,401);
    curve(ink,1.3f,112,573,248,539,364,565,520,517,651,537);curve(faint,1.1f,99,608,235,573,355,602,503,552,665,573);
    for(int i=0;i<34;i++){float x=128+i*15,y=636+13*(float)Math.Sin(i*.4);curve(ink,.8f,x,y,x+4,y-24,x+19,y-47);line(x+7,y-28,x-3,y-42,faint,.7f);}
    hatch(139,682,465,30,45);star(162,454,7,gold);
    text("愿你保有出发的勇气，",794,29);text("也保有自由的方向。",848,29);
  }
  static void page9() {
    latin("IX.  SUB STELLIS");title("星光作伴");
    // Antique astronomer's field sketch; circles are faint pencil construction marks.
    ellipse(170,276,428,428,faint,.9f);ellipse(185,291,398,398,faint,.45f);
    using(var p=pen(faint,.65f)){p.DashPattern=new float[]{2,8};g.DrawEllipse(p,249,355,270,270);}
    for(int i=0;i<36;i++){double a=i*Math.PI/18;float R=214;line(384+(float)Math.Cos(a)*R,490+(float)Math.Sin(a)*R,384+(float)Math.Cos(a)*(R-(i%3==0?13:5)),490+(float)Math.Sin(a)*(R-(i%3==0?13:5)),faint,.6f);}
    float[] xy={246,466,311,389,359,450,440,413,500,514,428,574,316,600,359,450};poly(ink,.9f,xy);
    for(int i=0;i<xy.Length-2;i+=2)star(xy[i],xy[i+1],i%4==0?8:5,gold);
    random=new Random(234);for(int i=0;i<57;i++){float x=208+(float)random.NextDouble()*352,y=318+(float)random.NextDouble()*340;if((x-384)*(x-384)+(y-490)*(y-490)<34000)dot(x,y,i%5==0?1.5f:.7f,ink);}
    // Crescent, with paper-coloured cutout, belongs to the engraving itself.
    using(var b=new SolidBrush(ink))g.FillEllipse(b,476,332,35,35);using(var b=new SolidBrush(Color.FromArgb(210,190,160)))g.FillEllipse(b,487,327,30,30);
    text("愿你抬头时，",789,31);text("总能看见属于自己的光。",845,29);
  }
  static void candle(float x,float baseY,float h,float w) {
    poly(ink,1.4f,x-w/2,baseY,x-w/2,baseY-h,x+w/2,baseY-h,x+w/2,baseY);
    ellipse(x-w/2,baseY-h-4,w,8,ink,1);line(x,baseY-h-4,x,baseY-h-20,ink,1.2f);
    curve(gold,1.7f,x,baseY-h-21,x-9,baseY-h-40,x+2,baseY-h-65,x+10,baseY-h-39,x,baseY-h-21);
    curve(gold,.7f,x,baseY-h-26,x-3,baseY-h-40,x+2,baseY-h-49);
    curve(faint,1,x-w/2+4,baseY-h+5,x-w/2+5,baseY-h+35,x-w/2+11,baseY-h+47,x-w/2+13,baseY-h+14);
    for(int i=0;i<3;i++)line(x+w/2-4-i*3,baseY-6,x+w/2-4-i*3,baseY-h+14,faint,.5f);
  }
  static void page10() {
    latin("X.  VOTUM IN LUMINE");title("许一个心愿");
    candle(259,609,178,34);candle(384,609,238,37);candle(509,609,142,32);
    ellipse(195,611,378,62,ink,1.4f);ellipse(208,621,352,39,faint,.75f);curve(ink,1.3f,204,648,233,675,533,675,565,649);
    for(int i=0;i<24;i++) {float a=i*(float)Math.PI/12;line(384+(float)Math.Cos(a)*168,647+(float)Math.Sin(a)*21,384+(float)Math.Cos(a)*172,650+(float)Math.Sin(a)*22,faint,.7f);}
    star(182,410,8,gold);star(584,378,9,gold);star(524,295,5,faint);star(284,296,6,faint);
    text("把想说的话，",791,31);text("轻轻交给烛光。",847,31);
  }
  static void page11() {
    latin("XI.  FELIX DIES NATALIS");title("生日快乐");
    // Small midnight-blue patisserie study, with restrained gold flecks.
    var fill=Color.FromArgb(43,58,78);
    using(var b=new SolidBrush(fill)){g.FillRectangle(b,240,462,288,151);g.FillEllipse(b,240,569,288,82);g.FillEllipse(b,240,421,288,82);}
    ellipse(240,421,288,82,ink,1.8f);curve(faint,1.1f,243,463,304,491,387,501,470,489,526,462);
    for(int i=0;i<23;i++){float x=246+i*12;float y=461+35*(float)Math.Sin(i*Math.PI/22);ellipse(x-3,y-5,9,12,Color.FromArgb(160,150,119),1.1f);}
    ellipse(215,611,338,69,ink,1.2f);curve(ink,1.4f,219,649,268,685,503,685,548,649);
    for(int i=0;i<14;i++){float x=257+i*18,y=539+(i%3)*17;line(x,y,x+2,y+4,gold,2);}
    star(356,555,11,gold);star(444,584,7,gold);star(314,601,6,gold);
    candle(323,454,82,12);candle(386,452,114,13);candle(447,453,80,12);
    star(195,425,8,gold);star(558,352,10,gold);star(606,521,5,faint);
    text("师宝宝",737,49);text("愿这一岁，明亮、自在，",823,28);text("被爱包围。",870,29);
  }
  public static void Build(string path) {
    Directory.CreateDirectory(path);Action[] pages={page0,page1,page2,page3,page4,page5,page6,page7,page8,page9,page10,page11};
    var codec=Array.Find(ImageCodecInfo.GetImageEncoders(),c=>c.MimeType=="image/jpeg");
    using(var quality=new EncoderParameters(1)) {quality.Param[0]=new EncoderParameter(System.Drawing.Imaging.Encoder.Quality,90L);
      for(int i=0;i<12;i++)using(var bitmap=paper(i)) {
        using(g=Graphics.FromImage(bitmap)){g.SmoothingMode=SmoothingMode.AntiAlias;g.TextRenderingHint=TextRenderingHint.AntiAliasGridFit;g.CompositingQuality=CompositingQuality.HighQuality;borders(i);pages[i]();}
        bitmap.Save(Path.Combine(path,"story-page-"+i.ToString("00")+".jpg"),codec,quality);
      }
    }
    // Contact sheet is a local review artifact, outside the production texture set.
    using(var preview=new Bitmap(W*3/2,H*4/2))using(var pg=Graphics.FromImage(preview)) {
      pg.Clear(Color.FromArgb(47,40,33));pg.InterpolationMode=InterpolationMode.HighQualityBicubic;
      for(int i=0;i<12;i++)using(var im=Image.FromFile(Path.Combine(path,"story-page-"+i.ToString("00")+".jpg")))pg.DrawImage(im,(i%3)*W/2,(i/3)*H/2,W/2,H/2);
      preview.Save(Path.Combine(path,"..","story-pages-contact.jpg"),ImageFormat.Jpeg);
    }
  }
}
'@
Add-Type -TypeDefinition $drawingSource -ReferencedAssemblies System.Drawing
[StoryPages]::Build([System.IO.Path]::GetFullPath($OutputDirectory))
Get-ChildItem -LiteralPath $OutputDirectory -Filter 'story-page-*.jpg' | Select-Object Name, Length
