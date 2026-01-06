import { axiosApiLogin, signUrl,sanitizeCookies, extractJsonFromHtml } from '../../../utils/tiktok.js';
import fs from 'fs'
import device_id_list from '../../../resource/deviceid.json' assert { type: 'json' }
import proxyList from '../../../resource/proxy.json'assert { type: 'json' }
import {cookieString} from '../../../resource/cookieString.js'
import {cookieSource} from '../../../resource/cookieSource.js'
import getLogger from '../../../utils/logger.js'
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fsp from 'fs/promises' 
import  {executablePath} from 'puppeteer'
import delay from 'delay';

puppeteer.use(StealthPlugin());

export const  get_source = async(job)=>{
    const logger = getLogger('tiktok_source')
    try { 
        const data_list_source = []
        for(let j=0;j<6;j++){
            let random_cookie_axios = Math.floor(Math.random() * cookieString.length);
            let cookie_axios = cookieString[random_cookie_axios]
            let random_index_proxy = Math.floor(Math.random() * proxyList.length)
            let proxy = proxyList[random_index_proxy]
            const res =await axiosApiLogin(job.data.source,proxy,cookie_axios)
            const html = res.data
            const userInfo = extractJsonFromHtml(html,"userInfo")
            if(userInfo){
                if(userInfo?.user?.secUid){
                    var secUid = userInfo?.user?.secUid
                    break
                }
                ;
            }
        }   
        if(!secUid){
            logger.info(`${job.data.source}|No Data}`)

            return {status:'ok',data:[]}
        }
        let cursor = 0
        for(let i=0;i<100000;i++){
            try{
                let random_index_device = Math.floor(Math.random() * device_id_list.length);
                let device_id = device_id_list[random_index_device]
                const PARAMS = {
                    //   WebIdLastTime: '1755133755',
                    aid: '1988',
                    app_language: 'en',
                    app_name: 'tiktok_web',
                    browser_language: 'en-US',
                    browser_name: 'Mozilla',
                    browser_online: 'true',
                    browser_platform: 'Win32',
                    browser_version: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    channel: 'tiktok_web',
                    cookie_enabled: 'true',
                    count: '30',
                    coverFormat: '2',
                    cursor: cursor,
                    data_collection_enabled: 'false',
                    device_id: device_id,
                    device_platform: 'web_pc',
                    focus_state: 'true',
                    history_len: '2',
                    is_fullscreen: 'false',
                    is_page_visible: 'true',
                    language: 'en',
                    os: 'windows',
                    priority_region: '',
                    referer: '',
                    region: 'TH',
                    screen_height: '1080',
                    screen_width: '1920',
                    secUid: secUid.trim(),
                    tz_name: 'Asia/Bangkok',
                    user_is_login: 'true',
                    webcast_language: 'en',
                };
            const firstUrl = `https://www.tiktok.com/api/post/item_list/?`
            let signed_url = await signUrl(PARAMS,firstUrl)
            console.log(signed_url)
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
            const profilePath = path.join(tmpBase, profileName);
            const browserRequest = await puppeteer.launch({
                headless: true,
                userDataDir: profilePath,
                args: [
                    `--proxy-server=${proxy.host}:${proxy.port}`,
                    '--window-size=1280,800',

                    '--enable-features=NetworkService',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--shm-size=3gb', // this solves the issue
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ],
                    ignoreHTTPSErrors: true,
                    executablePath:executablePath()
                
            }); 
            var pageRequest = await browserRequest.newPage({});
            await pageRequest.authenticate({
                username: proxy.username,
                password: proxy.password,
            });
            var data = []
            for(let j=0;j<5;j++){
                await delay(1000)    
                let random_cookie = Math.floor(Math.random() * cookieSource.length);
                let cookie_page =sanitizeCookies(cookieSource[random_cookie])
                await pageRequest.setCookie(...cookie_page)
                try { 
                    await pageRequest.goto(signed_url, { waitUntil: "networkidle0" })
                    const text = await pageRequest.evaluate(()=>{
                        return document.querySelector("body > pre")?.textContent
                    });
                    data = JSON.parse(text)
                    
                    if(data.itemList!=undefined){
                        logger.info(`${job.data.source}|${data.itemList.length}|${cursor}`)
                        break
                    }
                    logger.http(`reroll|${job.data.source}|${cursor}`)

                    await delay(3000)
                } catch (error) {
                    logger.error(`reroll:${job.data.source}|${error}|${cursor}`)
                    console.log(error)
                }   
            }      
            await pageRequest.close()
            await browserRequest.close()
            await fsp.rm(profilePath, { recursive: true, force: true });    
            cursor = data.cursor
            let conditionBreak = false
            if(data.itemList!=undefined){
                    const dataObject = data.itemList
                    data_list_source.push(...dataObject)
                    if(data.itemList[data.itemList.length-1].createTime<job.data.timeStart){
                        conditionBreak = true
                    }         
            }
            if(data.hasMore==false||conditionBreak==true||data.length==0){
                break;
            }  
            if(cursor==0){
                break
            }
        }catch (error) {
            logger.error(`error:${error}`)
            console.log(error.message)
        }
    }
        const data_return = data_list_source.map((item)=>{
            return {
                url:`https://www.tiktok.com/@${item.author.uniqueId}/video/${item.id}`,
                date:item.createTime
            } 
        })
        return {status:'ok',data:data_return}

    } catch (error) {
        console.log(error)
        logger.error(`error:${error}`)
        return {status:'error'}

    }
}