import { blendMark, morphProgress } from "./engravedTransition.js";
import { PROTEIN_NATIVE } from "./engravedForms.js";

// An illustrative Gaussian envelope around C-alpha coordinates, with a cutaway.
// It is not an atomistic solvent surface or a docking calculation.
let cached;
const mix=(a,b,t)=>a+(b-a)*t;
// The geometry worker supplies its completed mesh before this scene arrives.
export function installMoleculeMesh(mesh) { cached=mesh; }
export function moleculeMesh() {
  if(cached)return cached;
  const step=17, sigma=27, level=.72, core=PROTEIN_NATIVE.slice(0,70);
  const low=[0,1,2].map(axis=>Math.floor((Math.min(...PROTEIN_NATIVE.map(p=>p[axis]))-65)/step)*step);
  const size=[0,1,2].map(axis=>Math.ceil((Math.max(...PROTEIN_NATIVE.map(p=>p[axis]))+65-low[axis])/step)+1);
  const [nx,ny,nz]=size, index=(x,y,z)=>x+nx*(y+ny*z), density=new Float32Array(nx*ny*nz);
  const point=id=>[low[0]+id%nx*step,low[1]+Math.floor(id/nx)%ny*step,low[2]+Math.floor(id/(nx*ny))*step];
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const p=[low[0]+x*step,low[1]+y*step,low[2]+z*step];let sum=0;
    for(const a of core){const d=(p[0]-a[0])**2+(p[1]-a[1])**2+(p[2]-a[2])**2;if(d<18000)sum+=Math.exp(-d/(2*sigma*sigma));}
    density[index(x,y,z)]=sum;
  }
  const vertices=[],triangles=[],weld=new Map();
  const vertex=(a,b)=>{
    const key=Math.min(a,b)+":"+Math.max(a,b);if(weld.has(key))return weld.get(key);
    const u=(level-density[a])/(density[b]-density[a]),p=point(a),q=point(b),id=vertices.length;
    vertices.push(p.map((v,k)=>mix(v,q[k],u)));weld.set(key,id);return id;
  };
  const triangle=(a,b,c)=>{
    const p=vertices[a],q=vertices[b],r=vertices[c],u=q.map((v,k)=>v-p[k]),v=r.map((n,k)=>n-p[k]);
    const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],center=p.map((n,k)=>(n+q[k]+r[k])/3),gradient=[0,0,0];
    for(const atom of core){const d=center.map((n,k)=>n-atom[k]),weight=Math.exp(-d.reduce((sum,n)=>sum+n*n,0)/(2*sigma*sigma));for(let k=0;k<3;k++)gradient[k]+=d[k]*weight;}
    if(normal.reduce((sum,n,k)=>sum+n*gradient[k],0)<0)[b,c]=[c,b];
    triangles.push([a,b,c]);
  };
  const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const cube=[index(x,y,z),index(x+1,y,z),index(x+1,y+1,z),index(x,y+1,z),index(x,y,z+1),index(x+1,y,z+1),index(x+1,y+1,z+1),index(x,y+1,z+1)];
    if(cube.every(id=>density[id]>=level)||cube.every(id=>density[id]<level))continue;
    for(const tet of tets){
      const inside=tet.map(i=>cube[i]).filter(id=>density[id]>=level),outside=tet.map(i=>cube[i]).filter(id=>density[id]<level);
      if(inside.length===1)triangle(...outside.map(id=>vertex(inside[0],id)));
      else if(inside.length===3)triangle(...inside.map(id=>vertex(outside[0],id)));
      else if(inside.length===2){const [a,b]=inside,[c,d]=outside,ac=vertex(a,c),ad=vertex(a,d),bc=vertex(b,c),bd=vertex(b,d);triangle(ac,ad,bd);triangle(ac,bd,bc);}
    }
  }
  const edgeMap=new Map(),edges=[];
  triangles.forEach((tri,face)=>{for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3],key=Math.min(a,b)+":"+Math.max(a,b);if(edgeMap.has(key))edges[edgeMap.get(key)].faces.push(face);else{edgeMap.set(key,edges.length);edges.push({a,b,faces:[face]});}}});
  // Lighting and native centroids do not change under the core's uniform breath.
  const shade=new Uint8Array(triangles.length),centers=new Float64Array(triangles.length*3);
  triangles.forEach(([ia,ib,ic],face)=>{
    const a=vertices[ia],b=vertices[ib],c=vertices[ic];
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,n=Math.hypot(nx,ny,nz)||1;
    const light=Math.max(0,Math.min(1,(-nx*.42-ny*.48+nz*.77)/n));shade[face]=Math.round((1-light)*15);
    for(let axis=0;axis<3;axis++)centers[face*3+axis]=(a[axis]+b[axis]+c[axis])/3;
  });
  cached={vertices,triangles,edges,shade,centers};return cached;
}
export function moleculePoint(edge,along,unused,state,out=new Float64Array(3)) {
  const mesh=moleculeMesh(),e=mesh.edges[Math.max(0,Math.min(mesh.edges.length-1,Math.round(edge)))],p=state.surface?.positions;
  for(let k=0;k<3;k++)out[k]=p?mix(p[e.a*3+k],p[e.b*3+k],along):mix(mesh.vertices[e.a][k],mesh.vertices[e.b][k],along);
  return out;
}
const cutaway=(x,y,z)=>z>45 && ((x-62)/88)**2+((y+5)/108)**2<1;
export function prepareMolecule(state,view) {
  const mesh=moleculeMesh(),positions=new Float64Array(mesh.vertices.length*3),projected=new Float64Array(positions.length);
  // The receptor stays fully structured while the separate chain folds around it.
  const opacity=1, breath=1+.005*Math.sin((state.time||0)*.9)*(1-state.progress);
  for(let i=0;i<mesh.vertices.length;i++){
    const x=mesh.vertices[i][0]*breath,y=mesh.vertices[i][1]*breath,z=mesh.vertices[i][2]*breath;
    positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;
    const rx=x*view.cy+z*view.sy,rz=-x*view.sy+z*view.cy,ry=y*view.ct-rz*view.st,depth=y*view.st+rz*view.ct,perspective=1600/(1600-depth)*view.zoom;
    projected[i*3]=700+rx*perspective;projected[i*3+1]=400+ry*perspective+(view.offsetY||0);projected[i*3+2]=depth;
  }
  const visible=new Uint8Array(mesh.triangles.length),shade=mesh.shade,depth=new Float32Array(140*80);depth.fill(-Infinity);
  for(let face=0;face<mesh.triangles.length;face++){
    const [ia,ib,ic]=mesh.triangles[face],a=ia*3,b=ib*3,c=ic*3;
    const area=(projected[b]-projected[a])*(projected[c+1]-projected[a+1])-(projected[b+1]-projected[a+1])*(projected[c]-projected[a]);
    if(area<=.001||cutaway(mesh.centers[face*3]*breath,mesh.centers[face*3+1]*breath,mesh.centers[face*3+2]*breath))continue;
    visible[face]=1;
    const minX=Math.max(0,Math.floor(Math.min(projected[a],projected[b],projected[c])/10)),maxX=Math.min(139,Math.ceil(Math.max(projected[a],projected[b],projected[c])/10));
    const minY=Math.max(0,Math.floor(Math.min(projected[a+1],projected[b+1],projected[c+1])/10)),maxY=Math.min(79,Math.ceil(Math.max(projected[a+1],projected[b+1],projected[c+1])/10));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const px=x*10+5,py=y*10+5,wa=((projected[b]-px)*(projected[c+1]-py)-(projected[b+1]-py)*(projected[c]-px))/area,wb=((projected[c]-px)*(projected[a+1]-py)-(projected[c+1]-py)*(projected[a]-px))/area,wc=1-wa-wb;
      if(wa>=-.04&&wb>=-.04&&wc>=-.04)depth[y*140+x]=Math.max(depth[y*140+x],wa*projected[a+2]+wb*projected[b+2]+wc*projected[c+2]);
    }
  }
  return {mesh,positions,projected,visible,shade,depth,opacity};
}
export function moleculeOcclusion(surface,x,y,z) {
  const col=Math.max(0,Math.min(139,Math.floor(x/10))),row=Math.max(0,Math.min(79,Math.floor(y/10)));
  const p=surface.dissolve||0, remaining=1-p*p*(3-2*p);
  return z<surface.depth[row*140+col]-9 ? 1-surface.opacity*.96*remaining : 1;
}
export const MOLECULE_SHADES = Object.freeze(Array.from({length:16},(_,i)=>{const value=Math.round(232-i*2.5);return `rgb(${value},${value},${value})`;}));
// Fragment centroids take the same curved route as the ink; each face shrinks
// away as it reaches a target moon stroke, leaving no stationary outer shell.
export function dissolveMoleculeTriangle(surface,face,progress,target,out=new Float64Array(6),work=[new Float64Array(6),new Float64Array(6),new Float64Array(6)]) {
  const triangle=surface.mesh.triangles[face],p=surface.projected,seed=(face*.61803398875)%1;
  const offset=((face*73)%Math.floor(target.field.length/target.stride))*target.stride,from=work[0],to=work[1],flow=work[2];
  from.fill(0);to.fill(0);
  for(const vertex of triangle){from[0]+=p[vertex*3]/3;from[1]+=p[vertex*3+1]/3;}
  to[0]=target.field[offset];to[1]=target.field[offset+1];
  blendMark(from,to,progress,seed,flow);
  const t=morphProgress(progress,seed),u=Math.min(1,t/.85),shrink=1-u*u*(3-2*u),angle=Math.sin(Math.PI*t)*.48,c=Math.cos(angle),s=Math.sin(angle);
  triangle.forEach((vertex,i)=>{const x=(p[vertex*3]-from[0])*shrink,y=(p[vertex*3+1]-from[1])*shrink;out[i*2]=flow[0]+x*c-y*s;out[i*2+1]=flow[1]+x*s+y*c;});
  return out;
}
export function drawMolecule(context,surface,opacity,target=null) {
  opacity*=surface.opacity;if(opacity<=0)return;
  const paths=Array.from({length:16},()=>new Path2D()),p=surface.projected;
  const dissolving=target&&(surface.dissolve||0)>0,fragment=new Float64Array(6),work=[new Float64Array(6),new Float64Array(6),new Float64Array(6)];
  surface.mesh.triangles.forEach((triangle,face)=>{
    if(!surface.visible[face])return;const path=paths[surface.shade[face]];
    if(dissolving){dissolveMoleculeTriangle(surface,face,surface.dissolve,target,fragment,work);path.moveTo(fragment[0],fragment[1]);path.lineTo(fragment[2],fragment[3]);path.lineTo(fragment[4],fragment[5]);}
    else triangle.forEach((vertex,index)=>{if(index)path.lineTo(p[vertex*3],p[vertex*3+1]);else path.moveTo(p[vertex*3],p[vertex*3+1]);});
  });
  context.globalAlpha=opacity*.93;
  for(let i=0;i<paths.length;i++){context.fillStyle=MOLECULE_SHADES[i];context.fill(paths[i]);}
  context.globalAlpha=1;
}
