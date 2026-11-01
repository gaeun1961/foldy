const { chromium } = require('D:/_개발/foldy-bench-tools/html-review/node_modules/playwright-core');
const fs = require('fs');
const {pathToFileURL} = require('url');
const root = 'D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/7. bank50';
(async()=>{
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1050}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(root+'/reports/results.html').href);
    await page.evaluate(()=>document.querySelectorAll('img').forEach(x=>x.loading='eager'));
    await page.waitForFunction(()=>[...document.images].every(x=>x.complete));
    const images=await page.evaluate(()=>({count:document.images.length,broken:[...document.images].filter(x=>!x.naturalWidth).map(x=>x.src),overflow:document.documentElement.scrollWidth>innerWidth}));
    await page.screenshot({path:root+'/reports/desktop.png'});
    await page.locator('h2').filter({hasText:'핵심 병목'}).scrollIntoViewIfNeeded();
    await page.screenshot({path:root+'/reports/cv-section.png'});
    await page.locator('.case').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:root+'/reports/gallery.png'});
    await page.selectOption('#filter','hold');
    const held=await page.locator('.case:visible').count();
    await page.selectOption('#filter','approved');
    const approved=await page.locator('.case:visible').count();
    await page.fill('#q','H05');
    const query=await page.locator('.case:visible').count();
    await page.fill('#q',''); await page.selectOption('#filter','all');
    await page.setViewportSize({width:390,height:844}); await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:root+'/reports/mobile.png'});
    const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    const result={images,errors,held,approved,query,mobileOverflow};
    fs.writeFileSync(root+'/reports/html-check.json',JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
    if(images.broken.length||images.overflow||mobileOverflow||errors.length||held!==15||approved!==35||query!==1)process.exitCode=1;
  } finally {await browser.close();}
})();
