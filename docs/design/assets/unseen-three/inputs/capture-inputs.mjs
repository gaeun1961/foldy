import puppeteer from 'file:///C:/Users/ektlaksskgodqhrgo/AppData/Local/npm-cache/_npx/bb964472b4759b27/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import {pathToFileURL} from 'node:url';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const out=dirname(fileURLToPath(import.meta.url));
const root='D:/가천대학교/26-2/해커톤/_테스트 학습지/국내학습지_우선검토/문제이미지/';
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();
await page.setViewport({width:620,height:877,deviceScaleFactor:1});
for(const name of ['R14_p004','R15_p004']){
 await page.goto(pathToFileURL(root+name+'.png').href);
 await page.evaluate(()=>{document.body.style.margin='0';document.body.style.background='white';const img=document.querySelector('img');img.style.cssText='width:620px;height:auto;display:block;';});
 await page.screenshot({path:join(out,name+'-overview.png')});
}
await page.setViewport({width:2480,height:3505,deviceScaleFactor:1});
const cases=[
 {id:'U01',page:'R14_p004',problem:{x:260,y:1740,width:960,height:1060},shape:{x:600,y:2020,width:380,height:280}},
 {id:'U02',page:'R15_p004',problem:{x:260,y:340,width:960,height:880},shape:{x:750,y:700,width:430,height:330}},
 {id:'U03',page:'R15_p004',problem:{x:1280,y:340,width:960,height:880},shape:{x:1780,y:770,width:440,height:350}}
];
for(const item of cases){
 await page.goto(pathToFileURL(root+item.page+'.png').href);
 await page.evaluate(()=>{document.body.style.margin='0';document.body.style.background='white';document.querySelector('img').style.cssText='width:2480px;height:3505px;display:block;';});
 for(const kind of ['problem','shape'])await page.screenshot({path:join(out,item.id+'-'+kind+'.png'),clip:item[kind]});
}
await browser.close();
