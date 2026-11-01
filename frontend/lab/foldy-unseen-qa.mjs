import puppeteer from 'file:///C:/Users/ektlaksskgodqhrgo/AppData/Local/npm-cache/_npx/bb964472b4759b27/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
await page.goto(new URL('../../docs/design/foldy-method-research.html',import.meta.url).href,{waitUntil:'networkidle0'});
for(let i=1;i<=2;i++){await page.screenshot({path:decodeURIComponent(new URL(`../../docs/design/assets/unseen-three/slide-${i}.png`,import.meta.url).pathname).replace(/^\/D:/,'D:')});await page.click('#next')}
console.log(await page.evaluate(()=>({slides:document.querySelectorAll('.slide').length,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length})));
await browser.close();
