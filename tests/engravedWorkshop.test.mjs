import assert from "node:assert/strict";
import test from "node:test";
import {drawEngravedWorkshop, workshopBeltTangent, workshopDrive, workshopRoutePoint} from "../src/lib/engravedWorkshop.js";
import {engravedFraming} from "../src/lib/engravedFraming.js";
import {sceneStart} from "../src/lib/engravedTimeline.js";
import {humanoidState, HUMANOID} from "../src/lib/engravedHumanoid.js";
import {panoramaActors} from "../src/lib/engravedCast.js";

test("workshop scenes share bounded ink batches, fill their environment and keep moving",()=>{
  for(const [width,height,variant] of [[1800,360,"desktop"],[800,500,"mobile"]]){
    const camera=engravedFraming(width,height,variant);
    for(const scene of[3,5,6]){
      const capture=time=>{
        const coordinates=[];let batches=0;
        const context={save(){},restore(){},createInkPath(){return{moveTo(x,y){coordinates.push(x,y);},lineTo(x,y){coordinates.push(x,y);}};},stroke(){batches++;}};
        drawEngravedWorkshop(context,scene,sceneStart(scene)+time,camera);
        assert.equal(batches,8);
        assert.ok(coordinates.length>1500&&coordinates.length<80000);
        assert.ok(coordinates.every(Number.isFinite));
        let left=Infinity,right=-Infinity;
        for(let i=0;i<coordinates.length;i+=2){left=Math.min(left,coordinates[i]);right=Math.max(right,coordinates[i]);}
        assert.ok(left<camera.left+100&&right>camera.right-100,"the room reaches the page edges");
        return coordinates;
      };
      assert.notDeepEqual(capture(2),capture(6),"the environmental machinery changes during the chapter");
    }
  }
});

test("linked drive wheels have one tangential belt speed and rails retain route endpoints",()=>{
  for(const radius of[39.9,76,99,132])for(const direction of[-1,1]){
    const distance=(workshopDrive(5.25,radius,direction)-workshopDrive(5,radius,direction))*radius;
    assert.ok(Math.abs(distance-6.5*direction)<1e-10);
  }
  const route=[[0,0],[60,0],[60,80]];
  assert.deepEqual(workshopRoutePoint(route,0),[0,0]);
  assert.deepEqual(workshopRoutePoint(route,1),[60,80]);
  assert.deepEqual(workshopRoutePoint(route,.5),[60,10]);
  for(const crossed of[false,true])for(const side of[-1,1]){
    const a={x:80,y:160,r:92},b={x:310,y:230,r:40};
    const tangent=workshopBeltTangent(a,b,crossed,side),dx=tangent.b[0]-tangent.a[0],dy=tangent.b[1]-tangent.a[1];
    for(const [wheel,point]of[[a,tangent.a],[b,tangent.b]]){
      assert.ok(Math.abs(Math.hypot(point[0]-wheel.x,point[1]-wheel.y)-wheel.r)<1e-8);
      assert.ok(Math.abs((point[0]-wheel.x)*dx+(point[1]-wheel.y)*dy)<1e-7,"the belt is tangent at both unequal pulley rims");
    }
  }
  assert.deepEqual(panoramaActors(5,sceneStart(5)+3,engravedFraming(1800,360)),[],"asymmetric bays replace the repeated processor bodies");
});

test("robots lower their cartridge before releasing it and retreat smoothly",()=>{
  const initial=humanoidState(0),raised=humanoidState(7),placed=humanoidState(10.9),released=humanoidState(11.6),rest=humanoidState(14);
  assert.ok(raised.object[1]<initial.object[1]-110);
  assert.equal(placed.object[1],initial.object[1]);
  assert.equal(placed.grip,1,"the gripper holds until the cartridge reaches its support");
  assert.equal(released.grip,0);
  assert.deepEqual(rest.object,initial.object);
  assert.deepEqual(rest.arms.map(a=>a.wrist),initial.arms.map(a=>a.wrist));
  for(let time=8;time<14;time+=.023){
    const a=humanoidState(time),b=humanoidState(time+.001);
    assert.ok(Math.abs(a.object[1]-b.object[1])<.11);
    for(const arm of a.arms){
      const x=arm.base[0]+Math.cos(arm.q[0])*HUMANOID.upper+Math.cos(arm.q[0]+arm.q[1])*HUMANOID.forearm;
      const y=arm.base[1]+Math.sin(arm.q[0])*HUMANOID.upper+Math.sin(arm.q[0]+arm.q[1])*HUMANOID.forearm;
      assert.ok(Math.hypot(x-arm.wrist[0],y-arm.wrist[1])<1e-8);
      assert.ok(arm.q.every(Number.isFinite));
    }
  }
});
