const { PNG } = require('pngjs'); const jsQR = require('jsqr'); const fs=require('fs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const {width,height,data}=png;
// luminance stats
let lum=[];for(let i=0;i<data.length;i+=4)lum.push(0.299*data[i]+0.587*data[i+1]+0.114*data[i+2]);
lum.sort((a,b)=>a-b);console.log('lum p5/p50/p95',lum[Math.floor(lum.length*0.05)].toFixed(0),lum[Math.floor(lum.length*0.5)].toFixed(0),lum[Math.floor(lum.length*0.95)].toFixed(0));
for(const th of [null,150,170,190]){
  const d=new Uint8ClampedArray(data);
  if(th!==null)for(let i=0;i<d.length;i+=4){const l=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];const v=l>th?255:0;d[i]=d[i+1]=d[i+2]=v;}
  const r=jsQR(d,width,height,{inversionAttempts:'dontInvert'});
  console.log('threshold',th,'→',r?r.data:'FAILED');
}
