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
  static void blindFrame(float x,float y,float w,float h) {
    using(var p=pen(Color.FromArgb(222,204,175),1))g.DrawRectangle(p,x+2,y+2,w,h);
    using(var p=pen(Color.FromArgb(160,135,102),.8f))g.DrawRectangle(p,x,y,w,h);
  }
  static void strokes(float y,int count) {
    for(int i=0;i<count;i++){float x=144+(i%3)*22,yy=y+i*30;
      curve(faint,.8f,x,yy,x+42,yy-3,x+82,yy+2,x+131,yy-2);
      curve(faint,.7f,x+165,yy-1,x+220,yy+2,x+280,yy-2,x+355-(i%2)*60,yy);
    }
  }
  static void page0() {
    latin("AD TE");title("只为你打开");key(384,315,.54f);
    line(294,683,474,683,faint,.8f);
    text("这一页，只认得你。",809,31);
  }
  static void page1() {
    latin("FOLIUM I");title("书有许多页，");
    blindFrame(165,310,438,404);blindFrame(181,327,406,371);
    for(int i=0;i<6;i++)line(201+i*61,749,215+i*61,749,faint,.7f);
    text("有些留白，",810,29);text("不必急着写满。",862,29);
  }
  static void page2() {
    latin("TIBI");title("这一页留给你。");
    blindFrame(159,350,450,310);
    line(211,514,557,514,Color.FromArgb(176,151,115),.6f);
    line(211,565,557,565,Color.FromArgb(176,151,115),.6f);
    dot(384,761,4,gold);line(369,761,350,761,faint,.6f);line(399,761,418,761,faint,.6f);
  }
  static void page3() {
    latin("INTER VERBA");title("万千字句里，");
    strokes(344,5);
    curve(ink,1.4f,205,587,277,562,322,590,354,581,416,601,541,576);
    line(209,613,549,613,gold,.8f);
    text("有一句，想慢慢说给你。",817,29);
  }
  static void page4() {
    latin("VERBA CONVENIUNT");title("万千字句里，");
    blindFrame(164,291,440,461);
    for(int i=0;i<3;i++){line(190,335+i*137,213,335+i*137,faint,.7f);line(555,335+i*137,578,335+i*137,faint,.7f);}
    text("轻轻叠上这一页。",839,28);
  }
  static void page5() {
    latin("PAULO PLUS");title("总想把温柔，");
    using(var b=new SolidBrush(Color.FromArgb(129,95,49)))g.FillRectangle(b,351,300,65,370);
    poly(ink,1.4f,351,300,416,300,416,670,384,647,351,670,351,300);
    for(int i=0;i<7;i++)line(362,336+i*43,405,336+i*43,Color.FromArgb(186,150,83),.7f);
    curve(ink,1.1f,383,301,400,263,418,263,434,281);dot(433,284,4,gold);
    text("在书页之间，",822,29);text("悄悄多留一点。",871,29);
  }
  static void page6() {
    latin("TENERITAS");title("多分给你一点。");
    var st=g.Save();g.TranslateTransform(385,526);g.RotateTransform(-8);
    blindFrame(-210,-114,420,228);
    line(-159,-22,157,-22,ink,.8f);line(-159,26,80,26,faint,.7f);
    g.Restore(st);
    curve(gold,1.3f,242,682,306,700,363,684,394,721);
    text("不声张，也不计数。",837,29);
  }
  static void page7() {
    latin("NOMEN AMORIS");title("原来，");
    for(int i=0;i<19;i++){float x=191+(float)random.NextDouble()*372,y=319+(float)random.NextDouble()*360;dot(x,y,.7f+(i%4)*.55f,i%3==0?ink:faint);}
    curve(ink,1.9f,261,487,278,463,300,486,326,468);
    curve(ink,1.5f,406,551,435,562,461,538);
    line(296,737,472,737,faint,.7f);
    text("有些字，自己知道归处。",824,28);
  }
  static void page8() {
    latin("AD NOMEN");title("原来，");
    line(159,459,608,459,Color.FromArgb(175,149,112),.6f);
    line(159,632,608,632,Color.FromArgb(175,149,112),.6f);
    dot(384,749,3,gold);
    text("轻触，让字句回到这里。",849,27);
  }
  static void page9() {
    latin("APERI LENITER");title("把这句话，轻轻展开。");
    blindFrame(193,343,384,278);
    poly(faint,1.1f,193,343,384,476,577,343);
    line(193,621,315,495,faint,.8f);line(577,621,457,495,faint,.8f);
    using(var b=new SolidBrush(Color.FromArgb(104,36,29)))g.FillEllipse(b,360,455,49,46);
    ellipse(367,462,34,32,gold,.8f);line(384,469,384,486,gold,.9f);
    text("不必猜，也不必寻找。",816,29);
  }
  static void page10() {
    latin("TIBI SOLI");text("这一页的温柔",153,42);
    corner(151,283,1,1);corner(617,283,-1,1);corner(151,804,1,-1);corner(617,804,-1,-1);
  }
  static void page11() {
    latin("INITIUM");title("致师宝宝");
    key(384,367,.47f);
    text("故事从这里开始。",640,43);
    line(274,762,494,762,faint,.9f);
  }
  static void endpaper() {
    latin("MEMORIA",198);text("写给师宝宝",352,44);text("的一场梦",419,44);
    line(270,570,498,570,faint,.9f);key(385,676,.34f);
  }
  static void note() {
    text("师宝宝，",252,87,"华文楷体",Color.FromArgb(12,8,5));text("愿今晚的温柔，",442,61,"华文楷体",Color.FromArgb(12,8,5));text("都向你走来。",547,61,"华文楷体",Color.FromArgb(12,8,5));
    line(299,728,469,728,faint,.8f);
  }
  public static void Build(string path) {
    Directory.CreateDirectory(path);Action[] pages={page0,page1,page2,page3,page4,page5,page6,page7,page8,page9,page10,page11,endpaper,note};
    var codec=Array.Find(ImageCodecInfo.GetImageEncoders(),c=>c.MimeType=="image/jpeg");
    using(var quality=new EncoderParameters(1)) {quality.Param[0]=new EncoderParameter(System.Drawing.Imaging.Encoder.Quality,90L);
      for(int i=0;i<14;i++)using(var bitmap=paper(i)) {
        using(g=Graphics.FromImage(bitmap)){g.SmoothingMode=SmoothingMode.AntiAlias;g.TextRenderingHint=TextRenderingHint.AntiAliasGridFit;g.CompositingQuality=CompositingQuality.HighQuality;borders(i);pages[i]();}
        bitmap.Save(Path.Combine(path,i<12?"story-page-"+i.ToString("00")+".jpg":i==12?"story-endpaper.jpg":"note-message.jpg"),codec,quality);
      }
    }
    // Contact sheet is a local review artifact, outside the production texture set.
    using(var preview=new Bitmap(W*3/2,H*5/2))using(var pg=Graphics.FromImage(preview)) {
      pg.Clear(Color.FromArgb(47,40,33));pg.InterpolationMode=InterpolationMode.HighQualityBicubic;
      for(int i=0;i<14;i++)using(var im=Image.FromFile(Path.Combine(path,i<12?"story-page-"+i.ToString("00")+".jpg":i==12?"story-endpaper.jpg":"note-message.jpg")))pg.DrawImage(im,(i%3)*W/2,(i/3)*H/2,W/2,H/2);
      preview.Save(Path.Combine(path,"..","story-pages-contact.jpg"),ImageFormat.Jpeg);
    }
  }
}
'@
Add-Type -TypeDefinition $drawingSource -ReferencedAssemblies System.Drawing
[StoryPages]::Build([System.IO.Path]::GetFullPath($OutputDirectory))
Get-ChildItem -LiteralPath $OutputDirectory -Filter 'story-page-*.jpg' | Select-Object Name, Length
