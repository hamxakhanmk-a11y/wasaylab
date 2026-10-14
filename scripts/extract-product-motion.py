"""Extract the approved Mother Tonic video pass. Requires opencv-python, numpy, Pillow.
Usage: python scripts/extract-product-motion.py path/to/source.mp4
Run from the repository root. Output assets are checked in; the website needs no Python.
"""
import sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
path=Path(sys.argv[1])

cv2.setNumThreads(2)
c=cv2.VideoCapture(str(path))
configs=[(6,(375,57,581,145),[[375,72],[380,62],[396,57],[544,60],[568,65],[580,75],[579,145],[582,152],[580,170],[571,395],[566,410],[550,420],[520,426],[399,425],[375,420],[361,407],[360,388],[368,161],[371,143]]),(9,(416,74,611,152),[[416,90],[422,80],[443,75],[568,75],[593,80],[610,89],[610,153],[613,161],[610,177],[606,394],[599,407],[580,416],[548,420],[466,420],[437,414],[418,403],[413,389],[413,179],[416,157]]),(12,(304,29,473,93),[[305,40],[313,32],[334,28],[437,29],[457,33],[471,41],[471,94],[474,104],[476,291],[471,307],[459,317],[433,323],[342,324],[322,320],[309,313],[304,301],[302,108],[305,94]])]
templates=[]
for t,(x,y,r,b),points in configs:
 c.set(cv2.CAP_PROP_POS_MSEC,t*1000);_,f=c.read();templates.append((cv2.cvtColor(f[y:b,x:r],cv2.COLOR_BGR2GRAY),np.array(points,dtype=float)-[x,y]))
out=Path('static/images/wasay/mother-tonic-motion');out.mkdir(parents=True,exist_ok=True);previews=[]
for i in range(73):
 c.set(cv2.CAP_PROP_POS_MSEC,(6+i/12)*1000);_,f=c.read();g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY);best=(-1,None)
 for gray,points in templates:
  for scale in np.linspace(.85,1.18,35):
   tmp=cv2.resize(gray,None,fx=scale,fy=scale);res=cv2.matchTemplate(g[:220],tmp,cv2.TM_CCOEFF_NORMED);_,score,_,pt=cv2.minMaxLoc(res)
   if score>best[0]:best=(score,(points*scale+pt))
 points=best[1].astype(np.int32);mask=np.zeros(g.shape,np.uint8);cv2.fillPoly(mask,[points],255)
 seed=np.full(g.shape,cv2.GC_BGD,np.uint8);seed[cv2.dilate(mask,np.ones((9,9),np.uint8))>0]=cv2.GC_PR_BGD;seed[mask>0]=cv2.GC_PR_FGD;seed[cv2.erode(mask,np.ones((15,15),np.uint8))>0]=cv2.GC_FGD
 cv2.grabCut(f,seed,None,np.zeros((1,65)),np.zeros((1,65)),2,cv2.GC_INIT_WITH_MASK)
 seg=np.uint8((seed==1)|(seed==3))*255;contours,_=cv2.findContours(seg,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);contour=cv2.convexHull(max(contours,key=cv2.contourArea));seg[:]=0;cv2.drawContours(seg,[contour],-1,255,-1)
 x,y,w,h=cv2.boundingRect(contour);seg=cv2.erode(seg,np.ones((3,3),np.uint8));rgba=cv2.cvtColor(f,cv2.COLOR_BGR2RGBA);rgba[:,:,3]=cv2.GaussianBlur(seg,(3,3),.5)
 im=Image.fromarray(rgba).crop((x-2,y-2,x+w+2,y+h+2));im=im.resize((round(im.width*352/im.height),352),Image.Resampling.LANCZOS);canvas=Image.new('RGBA',(280,384));canvas.alpha_composite(im,((280-im.width)//2,(384-im.height)//2));canvas.save(out/f'{i:03}.webp',quality=88,method=6)
 if i%6==0:previews.append(canvas)
 if i%12==0:print(i,flush=True)
