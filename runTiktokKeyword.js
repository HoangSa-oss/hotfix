import os from 'os'
import cluster from 'cluster';
import { redisLocal, redisMaster,nameBull } from "./configs/constant.js"
import { search_keyword } from "./src/tiktok/keyword/index.js";
import { search_keyword_sign_browser } from './src/tiktok/keywordSignBrowser/index.js';
import { search_keyword_DOM } from './src/tiktok/keywordDOM/index.js';
import  TiktokCheckModel  from "./mongodb/tiktokCheck/tiktokCheck.js";
import { get_source } from "./src/tiktok/source/index.js";
import {connectDB} from './mongodb/connect.js'
import Queue from 'bull'
import { get_hashtag } from './src/tiktok/hashtag/index.js';
import { work_post, work_post_short } from './src/tiktok/post/index.js';
import { work_post_DOM } from './src/tiktok/postDOM/index.js';
import proxyList from './resource/proxy.json'assert { type: 'json' }
import { combineSourceDOM } from './src/tiktok/crawlapiauthorDOM/combine.js';
import delay from 'delay';
import fs from 'fs'
import fsp from "fs/promises"; // alias để phân biệt rõ
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import  {executablePath} from 'puppeteer'
puppeteer.use(StealthPlugin());
import { pageSign } from './utils/tiktok.js';
import { signUrlByBrowser } from './utils/tiktok.js';

export const run = async()=>{
    let browser
    let pageToSign
    let profilePath
    let chromePid;
    try {
         const tmpBase = path.join(process.cwd(), "tmp_profiles"); // tạo trong project
        if (!fs.existsSync(tmpBase)) fs.mkdirSync(tmpBase, { recursive: true })
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
            args:  [
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
        chromePid = browser.process().pid;
        pageToSign = await browser.newPage({});
        await pageToSign.authenticate({
            username: proxy.username,
            password: proxy.password,
        });
        await pageToSign.setBypassCSP(true) 
        await pageToSign.goto('https://www.tiktok.com',{timeout:60000})
        await delay(4000)
        await pageSign({page:pageToSign})
        let sumQueued = 3
        await connectDB()
        const queueKeywordTT = new Queue(nameBull.TTKeyword,redisLocal);
        const queueSourceTT = new Queue(nameBull.TTSource,redisLocal);
        const queueIdPostTT = new Queue(nameBull.TTIdPost,redisLocal);
        const queueCommentTT = new Queue(nameBull.TTComment, redisLocal);   
        const insertGetUrl = new Queue(nameBull.InsertBuzzes, redisLocal);
        queueKeywordTT.process(5,async(job,done)=>{
            if(job.data.typeCrawl=="keyword"){
                const result = await search_keyword_sign_browser(job,pageToSign)
                if(result.data.length>150){
                    await Promise.all(
                        result.data.map(async(x)=>{
                            if(x.date>=job.data.timeStart&&x.date<=job.data.timeEnd){
                                const checkUrlExist = await TiktokCheckModel.findOne({url:x.url,uniqueId:job.data.uniqueId})
                                if(checkUrlExist==null){
                                    await queueIdPostTT.add({...x})
                                    await TiktokCheckModel.create({...x,uniqueId:job.data.uniqueId})
                                    
                                }
                            } 
                        })
                    )    
                }else{
                    await Promise.all(
                        result.data.map(async(x)=>{
                            if(x.date>=job.data.timeStart&&x.date<=job.data.timeEnd){
                                const checkUrlExist = await TiktokCheckModel.findOne({url:x.url,uniqueId:job.data.uniqueId})
                                if(checkUrlExist==null){
                                    await queueIdPostTT.add({...x})
                                    await TiktokCheckModel.create({...x,uniqueId:job.data.uniqueId})
                                    
                                }
                            } 
                        })
                    )    
                    if(job.data.addQueued<sumQueued){
                        queueKeywordTT.add({...job.data,addQueued:job.data.addQueued+1})
                    }
                }
                if(result.status=='error'){
                    if(result?.message=='No signature function found'){
                        process.exit(0); 
                    }
                }
            }
            done()
        })
       
    }catch(error){
        console.log(error)
    }
}
const numWorkers =  os.cpus().length

if (cluster.isPrimary) {

    console.log(`🧠 Master PID: ${process.pid}`);
    for (let i = 0; i <1; i++) {
        cluster.fork();
    }
    cluster.on("exit", (worker, code, signal) => {
        cluster.fork()
    });
} else {
    try {
        await run()
    } catch (error) {
        console.error("❌ Worker lỗi:", error);
        process.exit(0); 
    }
}
// }