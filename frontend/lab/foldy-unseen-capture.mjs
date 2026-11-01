import puppeteer from 'file:///C:/Users/ektlaksskgodqhrgo/AppData/Local/npm-cache/_npx/bb964472b4759b27/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import fs from 'node:fs/promises';
import path from 'node:path';
const base=path.resolve('../docs/design/assets/unseen-three');
await fs.mkdir(path.join(base,'captures'),{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
const checks=[];
for(const id of ['U01','U02','U03'])for(const condition of ['zero','few']){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/lab/foldy-unseen-viewer.html',{waitUntil:'networkidle0'});
 const input=await page.waitForSelector('input[type=file]');await input.uploadFile(path.join(base,'run-01',id,condition,'result.json'));
 await new Promise(r=>setTimeout(r,2500));
 await page.screenshot({path:path.join(base,'captures',`${id}-${condition}.png`)});
 await page.screenshot({path:path.join(base,'captures',`${id}-${condition}-detail.png`),clip:{x:710,y:260,width:350,height:290}});
 checks.push({id,condition,errors,canvas:await page.locator('canvas').waitHandle().then(()=>true).catch(()=>false)});
}
await fs.writeFile(path.join(base,'captures/checks.json'),JSON.stringify(checks,null,2));await browser.close();
