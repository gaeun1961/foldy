const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const repo='D:/_개발/3. Foldy(도형 학습 도우미)',front=path.join(repo,'frontend');
const root='D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/9. flow3',out=path.join(root,'browser');
const codeDir=__dirname,abs=p=>'/@fs/'+p.replaceAll('\\','/');
async function main(){
 const {createServer}=await import(pathToFileURL(path.join(front,'node_modules/vite/dist/node/index.js')));
 const {default:react}=await import(pathToFileURL(path.join(front,'node_modules/@vitejs/plugin-react/dist/index.js')));
 const {chromium}=require('D:/_개발/foldy-bench-tools/html-review/node_modules/playwright-core');
 const samples=['H01','A04','C01'].map(id=>({id,image:'http://localhost:8768/assets/'+id}));
 const imports=`import React from 'react';import {createRoot} from 'react-dom/client';import {Viewer,netCheck} from '${abs(path.join(front,'src/viewer/index.ts'))}';import {polyhedronOf} from '${abs(path.join(front,'src/viewer/polyhedra.ts'))}';import {suggestShapes} from '${abs(path.join(front,'src/ui/suggestBoxes.ts'))}';\n`;
 fs.writeFileSync(path.join(out,'main.tsx'),imports+`const samples=${JSON.stringify(samples)};\n`+fs.readFileSync(path.join(codeDir,'flow3_browser_body.txt'),'utf8'));
 fs.writeFileSync(path.join(out,'index.html'),'<meta charset="utf-8"><style>body{margin:0;background:#f2eee6;font:20px sans-serif}article{width:1080px;margin:10px;padding:10px;background:white}h2,p{margin:8px}.viewer{width:1080px;height:720px;position:relative;overflow:hidden}.viewer>div{width:100%;height:100%}</style><h1>실제 Viewer 첫 프레임 실험</h1><main></main><script type="module" src="/main.tsx"></script>');
 const server=await createServer({root:out,configFile:false,cacheDir:path.join(out,'.vite'),plugins:[react()],server:{port:5194,strictPort:true,fs:{allow:[out,front]}},resolve:{alias:{'three/addons':path.join(front,'node_modules/three/examples/jsm'),react:path.join(front,'node_modules/react'),'react-dom':path.join(front,'node_modules/react-dom'),three:path.join(front,'node_modules/three')}},optimizeDeps:{noDiscovery:true,include:['react','react-dom/client','react/jsx-runtime']}});await server.listen();
 let browser;try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1120,height:900}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
 await page.goto('http://localhost:5194');await page.waitForFunction(()=>window.runWave,null,{timeout:60000});
 const waves=[];
 for(const arm of (process.env.FLOW3_ARMS||'corrected0shot,corrected2shot').split(',')){
  const wave=await page.evaluate(arm=>window.runWave(arm),arm);waves.push(wave); fs.writeFileSync(path.join(root,'browser-runtime.json'),JSON.stringify({scope:'actual Viewer onReady; software WebGL; 3 concurrent',waves,errors},null,2));
  for(const r of wave.results){const file=path.join(out,`${arm}-${r.id}.png`);try{await page.evaluate(id=>document.getElementById('case-'+id).scrollIntoView(),r.id);await page.screenshot({path:file,timeout:10000});r.screenshot=file;}catch(e){r.screenshot_error=String(e)}}
  fs.writeFileSync(path.join(root,'browser-runtime.json'),JSON.stringify({scope:'actual Viewer public component onReady; 3 concurrent per wave; desktop software WebGL; user hand actions excluded',waves,errors},null,2));
 }
 console.log(JSON.stringify(waves.map(w=>({arm:w.arm,wall_ms:w.wall_ms,statuses:w.results.map(r=>({id:r.id,status:r.status,total_ms:r.timings.total_ms}))}))));
 }finally{if(browser)await browser.close();await server.close();}
}main().catch(e=>{console.error(e);process.exit(1)});
