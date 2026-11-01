import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import puppeteer from 'file:///C:/Users/ektlaksskgodqhrgo/AppData/Local/npm-cache/_npx/bb964472b4759b27/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
const dir=new URL('../../docs/design/assets/technical-live/',import.meta.url);await fs.mkdir(dir,{recursive:true});
const browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9333',defaultViewport:{width:1600,height:1000,deviceScaleFactor:2}});
const page=(await browser.pages()).find(p=>p.url().includes('5173'));
const wait=()=>new Promise(r=>setTimeout(r,1300));
const capture=async(name,clip)=>page.screenshot({path:fileURLToPath(new URL(name+'.png',dir)),clip});
await page.evaluate(()=>{const input=document.querySelector('.fold-controls input[type=range]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'0');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});await wait();
await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent==='선 지우기').click());
await page.mouse.click(925,313);await page.mouse.click(998,366);await wait();
await capture('manual-controls',{x:22,y:655,width:288,height:323});
await capture('unfolded',{x:760,y:220,width:440,height:340});
for(const [value,name] of [[50,'half'],[100,'folded']]){
 await page.evaluate(value=>{const input=document.querySelector('.fold-controls input[type=range]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},value);
 await wait();await capture(name,{x:760,y:220,width:440,height:340});
 console.log(name,await page.evaluate(()=>document.querySelector('.fold-controls output').textContent));
}
await capture('manual-book',{x:400,y:120,width:850,height:560});
browser.disconnect();
