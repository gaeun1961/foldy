const { chromium }=require('D:/_개발/foldy-bench-tools/html-review/node_modules/playwright-core');
const fs=require('fs');
const {pathToFileURL,fileURLToPath}=require('url');
const root='D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/9. flow3/reports';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(root+'/results.html').href);
 await page.evaluate(()=>document.querySelectorAll('img').forEach(x=>x.loading='eager'));
 await page.waitForFunction(()=>[...document.images].every(x=>x.complete));
 const data=await page.evaluate(()=>({images:document.images.length,broken:[...document.images].filter(x=>!x.naturalWidth).map(x=>x.src),links:[...document.querySelectorAll('a[href]')].map(x=>x.href),overflow:document.documentElement.scrollWidth>innerWidth}));
 data.missingLinks=data.links.filter(x=>x.startsWith('file:')&&!fs.existsSync(fileURLToPath(x.split('#')[0])));delete data.links;
 await page.screenshot({path:root+'/desktop.png'});
 await page.evaluate(()=>window.scrollTo(0,2200));await page.screenshot({path:root+'/detail.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:root+'/mobile.png'});
 data.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);data.errors=errors;
 fs.writeFileSync(root+'/html-check.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data));
 if(data.broken.length||data.missingLinks.length||data.overflow||data.mobileOverflow||errors.length)process.exitCode=1;
 }finally{await browser.close();}
})();
