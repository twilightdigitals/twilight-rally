import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  send,
  evaluate,
  wait,
  socket,
  errors,
  base,
} from "./browser-session.js";
const report = [];
try {
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  for (const reduced of [false, true]) {
    await send("Emulation.setEmulatedMedia", {
      features: [
        {
          name: "prefers-reduced-motion",
          value: reduced ? "reduce" : "no-preference",
        },
      ],
    });
    await send("Page.navigate", { url: base });
    await wait(400);
    for (const quality of ["lite", "balanced", "ultra"]) {
      // Isolated renderer fixture, never the live gameplay round or its progression.
      const result = await evaluate(`(async()=>{
    const {Renderer}=await import('./src/game/render.js'),{makeRound}=await import('./src/game/physics.js');
    const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:390px;height:600px;z-index:100;background:#080f22';document.body.append(canvas);
    const renderer=new Renderer(canvas);renderer.setQuality(${JSON.stringify(quality)});
    const round=makeRound();round.ball.vx=400;round.fire.owner='player';round.fire.remaining=2;
    const start=performance.now();for(let i=0;i<120;i++)renderer.render(round,i*.02,true);
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let minX=Infinity,minY=Infinity,maxX=0,maxY=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4;if(pixels[i]>250&&pixels[i+1]>240&&pixels[i+2]>170&&pixels[i+2]<200){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
    const result={quality:${JSON.stringify(quality)},reduced:renderer.reduceMotion,trail:renderer.trail.length,radius:round.ball.radius,pixelWidth:canvas.width,coreWidth:maxX-minX,coreHeight:maxY-minY,renderMs:Math.round(performance.now()-start)};
    renderer.render(round,3,false);result.pausedTrail=renderer.trail.length;canvas.remove();return result;
   })()`);
      assert.equal(result.reduced, reduced);
      assert.equal(result.radius, 9);
      assert.ok(
        Math.abs(result.coreWidth - result.coreHeight) <= 2,
        "Portrait core is not round",
      );
      assert.ok(
        result.trail <=
          (quality === "ultra" ? 22 : quality === "lite" ? 4 : 12),
      );
      assert.equal(result.pausedTrail, 0);
      if (reduced) assert.equal(result.trail, 0);
      assert.ok(result.pixelWidth <= 780);
      report.push(result);
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "qa/effects-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "Passed Lite/Balanced/Ultra flame fixtures, reduced motion, bounded trails, DPR cap and round portrait core.",
  );
} finally {
  await send("Emulation.setEmulatedMedia", { features: [] });
  socket.close();
}
