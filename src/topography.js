// The original claim map's hillshade / contour treatment, shared by every local map.
// Bounds follow game coordinates: smaller z is north (the top of the map).
export function topographyPixels({width,height,bounds,heightAt,waterAt}) {
  const {x0,x1,z0,z1}=bounds, dx=(x1-x0)/width,dz=(z1-z0)/height;
  const heights=new Float32Array(width*height),pixels=new Uint8ClampedArray(width*height*4);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++)heights[j*width+i]=heightAt(x0+i*dx,z0+j*dz);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++) {
    const k=j*width+i,h=heights[k],x=x0+i*dx,z=z0+j*dz;
    const hl=heights[j*width+Math.max(0,i-1)],hr=heights[j*width+Math.min(width-1,i+1)];
    const hu=heights[Math.max(0,j-1)*width+i],hd=heights[Math.min(height-1,j+1)*width+i];
    const shade=Math.max(.55,Math.min(1.25,1+((hl-hr)+(hu-hd))*1.6));
    const water=waterAt(x,z),e=Math.min(1,Math.max(0,(h-(water??0))/16));
    let r=236-e*50,g=218-e*60,b=180-e*70;
    // Always-on 2 m contours, including Easy mode; there is no overlay toggle.
    if(Math.floor(h/2)!==Math.floor(hr/2)||Math.floor(h/2)!==Math.floor(hd/2)){r-=40;g-=40;b-=40;}
    if(water!==null&&water!==undefined&&water-h>.02){r=96;g=140;b=160;}
    pixels[k*4]=r*shade;pixels[k*4+1]=g*shade;pixels[k*4+2]=b*shade;pixels[k*4+3]=255;
  }
  return pixels;
}
export function topographyCanvas(options) {
  const c=document.createElement('canvas');c.width=options.width;c.height=options.height;
  const ctx=c.getContext('2d'),img=ctx.createImageData(c.width,c.height);
  img.data.set(topographyPixels(options));ctx.putImageData(img,0,0);return c;
}
