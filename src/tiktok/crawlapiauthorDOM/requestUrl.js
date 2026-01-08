import puppeteer from 'puppeteer-extra';
import { signUrlByUrl,pageSign,signUrl,axiosApiCookie } from '../utils/index.js';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import proxyList from '../resource/proxy.json' assert { type: 'json' }
import getLogger from '../utils/logger.js';
import cookie from '../resource/cookiedefault.json' assert { type: 'json' }
import fs from 'fs'
import fsp from "fs/promises"; // alias để phân biệt rõ

import  {executablePath} from 'puppeteer'
import delay from 'delay';
/////////////////////////////////////////////////
const loggerSource = getLogger('requestSource')
/////////////////////////////////////////////////
export const  requestSource  =  async (job,profileDir)=>{
        try {
            let loop = 4
            var resData = []
           
            let random_index = Math.floor(Math.random() * proxyList.length);
            let proxyRandom = proxyList[random_index].proxy.replace('http://','').split("@").flatMap((item)=>item.split(':'))
            let proxy ={
                host:proxyRandom[2],
                port:proxyRandom[3],
                username:proxyRandom[0],
                password:proxyRandom[1]
            }
            const profilesDir = "./profiles";

            // Nếu chưa có thì tạo thư mục profiles
            if (!fs.existsSync(profilesDir)) {
                fs.mkdirSync(profilesDir);
            }
            // Tạo tên profile mới (theo timestamp)
            const profileName = `profile_${Date.now()}`;
            var profilePath = `${profilesDir}/${profileName}`;

            var browserRequest = await puppeteer.launch({
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

              for(let j=0;j<4;j++){
                let random_index_cookie_array_page = Math.floor(Math.random() * cookie.length);
                let index_cookie_array_page = cookie[random_index_cookie_array_page]
                let random_index_cookie_array_unit_page = Math.floor(Math.random() * index_cookie_array_page.length);
                var cookie_page = index_cookie_array_page[random_index_cookie_array_unit_page]
                await pageRequest.setCookie(...cookie_page)
                await delay(1000)
                try {
                    await pageRequest.goto(job.data.url, { waitUntil: "networkidle0" })
                    const text = await pageRequest.evaluate(()=>{
                        return document.querySelector("body > pre")?.textContent
                    });
                    var data = JSON.parse(text)
                    if(data.itemList!=undefined){
                        break
                    }
                    loggerSource.error(`reroll:data:${JSON.stringify(data)}|url:${job.data.url}`)
                } catch (error) {
                    console.log('loi for'+error.message)
                    loggerSource.error(`reroll:error:${error}|url:${job.data.url}`)
                }
            }    
            if(data.itemList!=undefined&&data.itemList?.length!=0){
                resData = data.itemList
                .map((item) => {
                return {
                    date: item.createTime,
                    urlPost: `https://www.tiktok.com/@${item.author.uniqueId}/video/${item.id}`,
                };
                
            });
            }  
            loggerSource.info(`length:${data?.itemList?.length}|offset:${job.data.offset}|url:${job.data.url}`)
            await pageRequest.close()
            await browserRequest.close()
            await fsp.rm(profilePath, { recursive: true, force: true });

            return {status:"ok",data:resData}
        } catch (error) {
            try {
                await browserRequest.close()
                await pageRequest.close()
                await fsp.rm(profilePath, { recursive: true, force: true });
            } catch (error) {
                console.log(error)
            }
            console.log(error)
            loggerSource.error(`error:${error}|url:${job.data.url}`)
            return {status:'error',error:error}
        }      
}
