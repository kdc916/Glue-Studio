"""Create multi-resolution ICO PNG assets using Python stdlib."""
import math,struct,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent/'assets'
ROOT.mkdir(parents=True,exist_ok=True)
def pixels(n):
 scale=512/n;out=bytearray(n*n*4)
 for y0 in range(n):
  y=(y0+.5)*scale
  for x0 in range(n):
   x=(x0+.5)*scale
   dx=x-min(max(x,66),446);dy=y-min(max(y,66),446)
   col=(0,0,0,0)
   if math.hypot(dx,dy)<=49:
    col=(17,32,45,255) if math.hypot(dx,dy)<42 else (57,105,113,255)
    gx,gy=x-142,y-243;r=math.hypot(gx,gy);a=math.degrees(math.atan2(gy,gx))
    if 79<r<118 and not -57<a<18:col=(109,228,193,255)
    if 142<x<225 and 246<y<284:col=(109,228,193,255)
    if 218<x<251 and 259<y<330:col=(109,228,193,255)
    for tx in range(3):
     for ty in range(3):
      px,py=270+tx*62,130+ty*65
      if px<=x<=px+51 and py<=y<=py+51:
       col=(36,64,74,255)
       if min(x-px,px+51-x,y-py,py+51-y)<2:col=(75,122,125,255)
       if math.hypot(x-px-26,y-py-26)<5+((tx+ty)%3)*3:col=(248,119+15*ty,48,255)
    if 108<x<404 and 394<y<407:col=(109,228,193,255)
   out[(y0*n+x0)*4:(y0*n+x0)*4+4]=bytes(col)
 return out
def png(raw,n):
 def chunk(k,data):return struct.pack('>I',len(data))+k+data+struct.pack('>I',zlib.crc32(k+data)&0xffffffff)
 rows=b''.join(b'\0'+raw[i*n*4:(i+1)*n*4] for i in range(n))
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',n,n,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b'')
sizes=(16,24,32,48,64,128,256)
images=[png(pixels(n),n) for n in sizes];offset=6+16*len(sizes);directory=bytearray()
for n,data in zip(sizes,images):
 directory.extend(struct.pack('<BBBBHHII',n if n<256 else 0,n if n<256 else 0,0,0,1,32,len(data),offset));offset+=len(data)
(ROOT/'icon.ico').write_bytes(struct.pack('<HHH',0,1,len(sizes))+directory+b''.join(images))
(ROOT/'icon.png').write_bytes(png(pixels(256),256))
print('Icon generated',ROOT/'icon.ico')
