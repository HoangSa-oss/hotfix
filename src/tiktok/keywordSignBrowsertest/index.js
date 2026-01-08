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
const logger = getLogger(`tiktok_keyword_sign_browser`)
import  {executablePath} from 'puppeteer'
import fs from 'fs'
import fsp from "fs/promises"; // alias để phân biệt rõ
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
export const  search_keyword_sign_browser_test =  async (job)=>{
    let browser2
    let browser
    let page
    let pageToSign
    let profilePath
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
 
        pageToSign = await browser.newPage({});
        await pageToSign.authenticate({
            username: proxy.username,
            password: proxy.password,
        });
  
        let random_cookie = Math.floor(Math.random() * cookieSource.length);
        let cookie_page =sanitizeCookies(cookieSource[1])
         const cookiefromBrowser1 = cookie_page
        let cookieToString1  =''
        for(let i=0;i<cookiefromBrowser1.length;i++){
            if(!!cookiefromBrowser1[i].value){
                cookieToString1 = cookieToString1+cookiefromBrowser1[i].name+"="+cookiefromBrowser1[i].value+";"
        }
        }   
        console.log(cookieToString1)
        await delay(1000)
    
        await pageToSign.setBypassCSP(true) 
     
        await pageToSign.goto('https://www.tiktok.com')

        await delay(2000)
        await pageSign({page:pageToSign})
      

        let data_list_keyword = [] ;
        // try {
            let conditionBreak = 0
            let random_index_device = Math.floor(Math.random() * device_id_list.length);
            let device_id = device_id_list[random_index_device]
            let search_id = generateSearchId()
        //     let random_index_cookie_array_page = Math.floor(Math.random() * cookieString.length);
        //     var  cookie = cookieString[random_index_cookie_array_page]

            for(let i=0;i<10;i++){
                const PARAMS = {
                    aid: 1988,
                    app_language: 'en',
                    app_name: 'tiktok_web',
                    browser_language: 'en-US',
                    browser_name: 'Mozilla',
                    browser_online: true,
                    browser_platform: 'Win32',
                    browser_version: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    channel: 'tiktok_web',
                    cookie_enabled: true,
                    count: 20,
                    data_collection_enabled: true,
                    device_id: device_id,
                    device_platform: 'web_pc',
                    focus_state: true,
                    from_page:'search',
                    history_len: 4,
                    is_fullscreen: false,
                    is_page_visible: true,
                    keyword: job.data.keyword.trim(),
                    offset: i*20,
                    os: 'windows',
                    priority_region: 'VN',
                    referer: '',
                    region: 'TH',
                    screen_height: 1080,
                    screen_width: 1920,
                    search_id: search_id,
                    tz_name: 'Asia/Bangkok',
                    user_is_login: true,
                    web_search_code: '{"tiktok":{"client_params_x":{"search_engine":{"ies_mt_user_live_video_card_use_libra":1,"mt_search_general_user_live_card":1}},"search_server":{}}}',
                    webcast_language: 'en',
                }
                const firstUrl = `https://www.tiktok.com/api/search/item/full/?`
                let signed_url = await signUrlByBrowser({PARAMS,firstUrl,page:pageToSign})   
                let data_keyword = []
                for(let j =0;j<3;j++){
                    try {
                        let random_index = Math.floor(Math.random() * proxyList.length);
                        let proxy = proxyList[random_index]
                        let res = await axiosApiLogin(signed_url,proxy,cookieToString1)
                        data_keyword = res.data;
                        console.log(data_keyword.item_list.length)
                        if(data_keyword.item_list!=undefined){
                            break
                        }
                        logger.http(`reroll|${job.data.keyword}|${i*12}|${JSON.stringify(data_keyword)}|${signed_url}`)

                    } catch (error) {
                        logger.http(`reroll|error|${job.data.keyword}|${i*12}`)
                        console.log(error.message)
                    }
                }
                if (data_keyword.has_more == 0||data_keyword.status_code==2484||data_keyword.length==0 ){
                    conditionBreak++
                }
                if(conditionBreak==2) break;
                if(data_keyword.item_list!=undefined&&data_keyword.item_list?.length!=0){
                    data_list_keyword.push(...data_keyword.item_list)
                }  
                }
        // } catch (error) {
        //     logger.error(`sign|error|${job.data.keyword}|${error}`)
        //     console.log(error)
        //     return {status:'error',message:error,data:[]}
        // }
        logger.info(`Done|${job.data.keyword}|${data_list_keyword.length}`)
        let data_return =  data_list_keyword.map((item)=>{
        return {
            url:`https://www.tiktok.com/@${item.author.uniqueId}/video/${item.id}`,
            date:item.createTime
        }})
        return {status:"oke",data:data_return}
    } catch (error) {
        console.log(error)  
        logger.error(`${job.data.keyword}|${error}`)
        return {status:'error',data:[]}
 
    } finally {

   

  try {
    if (browser) {
      await browser.close();
    }
  } catch (e) {}
 try {
    if (browser2) {
      await browser2.close();
    }
  } catch (e) {}
  if (profilePath) {
    await fsp.rm(profilePath, { recursive: true, force: true });
  }
}
}
