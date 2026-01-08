import puppeteer from 'puppeteer-extra';
import { signUrl,axiosApiLogin,generateSearchId, signUrlByBrowser,sanitizeCookies } from '../../../utils/tiktok.js';
import delay from 'delay';
import { cookieString } from '../../../resource/cookieString.js';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import proxyList from '../../../resource/proxy.json'assert { type: 'json' }
import device_id_list from '../../../resource/deviceid.json'assert { type: 'json' }
import getLogger from '../../../utils/logger.js'
import { cookieSource } from '../../../resource/cookieSource.js';
import { pageSign } from '../../../utils/tiktok.js';
import  {executablePath} from 'puppeteer'
import fs from 'fs'
import fsp from "fs/promises"; // alias để phân biệt rõ
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
const logger = getLogger('CombineSource')


export const  combineSourceDOM =  async (job)=>{
        // let random_index_device = Math.floor(Math.random() * device_id_list.length);
        // let device_id = device_id_list[random_index_device]
        //////////////////////////////////////////////
        // let random_index_cookie_array_page = Math.floor(Math.random() * cookie.length);
        // let index_cookie_array_page = cookie[random_index_cookie_array_page]
        // let random_index_cookie_array_unit_page = Math.floor(Math.random() * index_cookie_array_page.length);
        // var cookie_page = index_cookie_array_page[random_index_cookie_array_unit_page]
        let conditionBreak = false
        let arrayData = [] ;
        let cookieRandom = Math.floor(Math.random() * cookieSource.length)
        let secUid = job.data.source
        let cursor = 0
        let browserRequest
        let profilePath
        let pageRequest
        try {
              
                let random_index = Math.floor(Math.random() * proxyList.length);
                let proxyRandom = proxyList[random_index].proxy.replace('http://','').split("@").flatMap((item)=>item.split(':'))
                let proxy ={
                    host:proxyRandom[2],
                    port:proxyRandom[3],
                    username:proxyRandom[0],
                    password:proxyRandom[1]
                }
                const tmpBase = path.join(process.cwd(), "tmp_profiles"); // tạo trong project
                if (!fs.existsSync(tmpBase)) fs.mkdirSync(tmpBase, { recursive: true });

                const profileName = `profile_${uuidv4()}`;
                profilePath = path.join(tmpBase, profileName);
                browserRequest = await puppeteer.launch({
                    headless: false,
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
                pageRequest = await browserRequest.newPage({});
                await pageRequest.authenticate({
                    username: proxy.username,
                    password: proxy.password,
                });
                const [response] = await Promise.all([
                            pageRequest.waitForResponse(
                                res =>
                                res.url().includes('/api/post/item_list') &&
                                res.status() === 200,
                                { timeout: 60000 }
                            ),
                            pageRequest.goto(`${job.data.source}`, {
                                waitUntil: 'domcontentloaded'
                            })
                        ]);
                let data_start = await response.json()
                arrayData.push(...data_start.itemList)
               
                for(let i=0;i<50;i++){
                    var data= []
                    for(let j=0;j<4;j++){
                        var cookie_page = sanitizeCookies(cookieSource[cookieRandom]);  
                        await pageRequest.setCookie(...cookie_page)
                        await delay(1000)
                        try {
                            await pageRequest.evaluate(() => {
                                window.scrollBy(0, -10000);
                            });
                            await pageRequest.evaluate(() => {
                                window.scrollBy(0, window.innerHeight*1000000);
                            });
                            let response = await pageRequest.waitForResponse(
                                res =>
                                    res.url().includes("/api/post/item_list") &&
                                    res.status() === 200,
                                { timeout: 5000 }
                            );
                            data = await response.json() 
                            if(data?.itemList!=undefined){
                                arrayData.push(...data.itemList)
                                if(data.itemList[data.itemList.length-1].createTime<job.data.timeStart){
                                    conditionBreak = true
                                }     
                                break
                            }
                            logger.http(`reroll:data:${JSON.stringify(data)}|url:${job.data.source}`)
                        } catch (error) {
                            console.log(error)
                            if(j==3){
                                 conditionBreak = true

                            }
                            logger.error(`reroll:error:${error}|url:${secUid}`)
                        }
                    }    
                    if(data.hasMore==false||conditionBreak==true||data.length==0){
                        break;
                    }  
                }
                if(arrayData.length!=0){
                    var arrayData123 = arrayData
                    .map((item) => {
                        console.log(item)
                    return {
                        date: item.createTime,
                        url: `https://www.tiktok.com/@${item.author.uniqueId}/video/${item.id}`,
                    };
                    
                });
                }  

                logger.info(`length:${arrayData123.length}|url:${job.data.source}`)
                return {status:"ok",data:arrayData123}
        } catch (error) {
            console.log(error)
            logger.error(`error3:${error}|url:${job.data.source}`)
            return {status:'error',error:error}
        }finally{
            try {
                await pageRequest.close()
                await browserRequest.close()
            } catch (error) {
                logger.error(`error2:${error}|url:${job.data.source}`)
                console.log(error)
            }
            await fsp.rm(profilePath, { recursive: true, force: true });    
        }
        
}
