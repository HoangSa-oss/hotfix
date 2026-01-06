import puppeteer from 'puppeteer-extra';
import { signUrl,axiosApiLogin,generateSearchId, signUrlByBrowser,sanitizeCookies } from '../../../utils/tiktok.js';
import delay from 'delay';
import { cookieString } from '../../../resource/cookieString.js';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import proxyList from '../../../resource/proxy.json'assert { type: 'json' }
import device_id_list from '../../../resource/deviceid.json'assert { type: 'json' }
import getLogger from '../../../utils/logger.js'
import { pageSign } from '../../../utils/tiktok.js';
import {cookieSource} from '../../../resource/cookieSource.js'
const logger = getLogger(`tiktok_keyword_DOM`)

import  {executablePath} from 'puppeteer'
import fs from 'fs'
import fsp from "fs/promises"; // alias để phân biệt rõ
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
export const  search_keyword_DOM =  async (job)=>{
    let browser
    let page
    let profilePath
    try {
    const tmpBase = path.join(process.cwd(), "tmp_profiles"); // tạo trong project
    if (!fs.existsSync(tmpBase)) fs.mkdirSync(tmpBase, { recursive: true });

    const profileName = `profile_${uuidv4()}`;
    profilePath = path.join(tmpBase, profileName);
    let random_index = Math.floor(Math.random() * proxyList.length);
    let proxyRandom = proxyList[random_index].proxy.replace('http://','').split("@").flatMap((item)=>item.split(':'))
    let proxy ={
        host:proxyRandom[2],
        port:proxyRandom[3],
        username:proxyRandom[0],
        password:proxyRandom[1]
    }

    browser  = await puppeteer.launch({
        headless: true,
        userDataDir: profilePath,
        args: [
            `--proxy-server=${proxy.host}:${proxy.port}`,

            "--no-sandbox",
            "--disable-setuid-sandbox",

            // 🚫 Tắt GPU & render nặng
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--disable-dev-shm-usage",

            // 🚫 Tắt background service
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
            "--disable-client-side-phishing-detection",
            "--disable-component-update",
            "--disable-default-apps",
            "--disable-domain-reliability",
            "--disable-features=Translate,BackForwardCache",
            "--disable-hang-monitor",
            "--disable-ipc-flooding-protection",
            "--disable-popup-blocking",
            "--disable-prompt-on-repost",
            "--disable-renderer-backgrounding",
            "--disable-sync",
            "--disable-web-security",

            // 🚫 Media / audio / image
            "--mute-audio",
            "--blink-settings=imagesEnabled=false",

            // 🚫 Extensions & automation noise
            "--disable-extensions",
            "--disable-infobars",
            "--disable-notifications",

            // ⚡ Giảm footprint
            "--metrics-recording-only",
            "--no-first-run",
            "--safebrowsing-disable-auto-update",

            // 🧠 Giới hạn process Chrome
            "--renderer-process-limit=1",
            // "--single-process" // ⚠️ chỉ dùng trên Linux server
        ],
        ignoreHTTPSErrors: true,
        executablePath:executablePath()
    
    }); 
    page = await browser.newPage({});
    await page.authenticate({
        username: proxy.username,
        password: proxy.password,
    });
    let random_cookie = Math.floor(Math.random() * cookieSource.length);
    let cookie_page =sanitizeCookies(cookieSource[random_cookie])
    await page.setCookie(...cookie_page)
    await delay(1000)
    await page.setBypassCSP(true) 
    const result = await run(job,page)

    return result
   } catch (error) {
        logger.error(`browser|error|${job.data.keyword}|${error}`)
        return {status:'error',data:[]}
   } finally {
        try{
            await page.close()
            await browser.close()
        } catch(error){
            console.log(error)
        }
        await fsp.rm(profilePath, { recursive: true, force: true }); 
    }
    }

const  run =  async (job,page)=>{
    try {
        let data_list_keyword = [] ;
        let conditionBreak = false
        try {
            const [response] = await Promise.all([
                    page.waitForResponse(
                        res =>
                        res.url().includes('/api/search/item/full') &&
                        res.status() === 200,
                        { timeout: 60000 }
                    ),
                    page.goto(`https://www.tiktok.com/search/video?q=${encodeURIComponent(job.data.keyword)}`, {
                        waitUntil: 'domcontentloaded'
                    })
                ]);
                let data_start = await response.json()
                data_list_keyword.push(...data_start.item_list)
                for(let i=0;i<50;i++){
                    for(let i=0;i<4;i++){
                        try {
                             await page.evaluate(() => {
                                window.scrollBy(0, -10000);
                            });
                            await page.evaluate(() => {
                                window.scrollBy(0, window.innerHeight*1000000);
                            });
                            let response = await page.waitForResponse(
                                res =>
                                    res.url().includes("/api/search/item/full") &&
                                    res.status() === 200,
                                { timeout: 10000 }
                            );
                            let data = await response.json() 
                            if(data.item_list!=undefined){
                                data_list_keyword.push(...data.item_list)
                                break;
                            }                         
                        } catch (error) {
                            if(i==3){
                                conditionBreak = true
                            }
                            // console.log(error)
                        }
                    }
                    if(conditionBreak) break
                }
                await delay(1000)
        } catch (error) {
            logger.error(`sign|error|${job.data.keyword}|${error}`)
            console.log(error)
            return {status:'error',message:error,data:[]}
        }
        logger.info(`Done|${job.data.keyword}|${data_list_keyword.length}`)
        let data_return =  data_list_keyword.map((item)=>{
        return {
            url:`https://www.tiktok.com/@${item.author.uniqueId}/video/${item.id}`,
            date:item.createTime
        }})   

        return {status:"ok",data:data_return}
    } catch (error) {
        console.log(error)  
        logger.error(`${job.data.keyword}|${error}`)   
        return {status:'error',data:[]}
 
    }   

}
