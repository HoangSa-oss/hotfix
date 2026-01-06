import puppeteer from 'puppeteer-extra';
import Queue from 'bull';
import { redisLocal } from '../configs/constant.js';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import  {executablePath} from 'puppeteer'
import fs from 'fs';
// import { workcommentCombine } from './crawlcomment/worker.js';
// import {workurl} from './crawlInfoUrl/workurl.js'
import proxyList from '../resource/proxy.json'assert { type: 'json' }
import os from 'os'
import cluster from 'cluster';
const queueGet = new Queue('getCookieFromBrowser',redisLocal);

puppeteer.use(StealthPlugin());
const run = async(cookie,i)=>{
                let random_index = Math.floor(Math.random() * proxyList.length);
                let proxyRandom = proxyList[random_index].proxy.replace('http://','').split("@").flatMap((item)=>item.split(':'))
                let proxy ={
                    host:proxyRandom[2],
                    port:proxyRandom[3],
                    username:proxyRandom[0],
                    password:proxyRandom[1]
                }
                const browser = await puppeteer.launch({
                        headless: true,
                        // userDataDir: `./profiletest/${i}`,
                        args: [
                            '--window-size=1280,800',
                            `--proxy-server=${proxy.host}:${proxy.port}`,

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
            try {
        
                var page = await browser.newPage({});
                await page.authenticate({
                    username: proxy.username,
                    password: proxy.password,
                    });
                let arrayData = [] ;
                await page.setCookie(...cookie)
                await page.goto('https://www.tiktok.com', { waitUntil: 'networkidle2' })
                let domCheckUser = "div.TUXButton-iconContainer > div > img"
                await page.waitForSelector(domCheckUser,{timeout:10000})
                await page.goto('https://www.tiktok.com/explore?lang=en', { waitUntil: 'networkidle2' })

                let cookieGet = await page.cookies()
               fs.appendFile('utils/cookieStringToBrowserNewString.json', JSON.stringify(cookieGet)+',\n', (err) => {
                    if (err) throw err;
                    console.log('Cookie appended!');
                });
                await browser.close()
        } catch (error) {
            console.log(error)
            await browser.close()
        }
                    
}

const numWorkers =  os.cpus().length
if (cluster.isPrimary) {
    console.log(`🧠 Master PID: ${process.pid}`);
    for (let i = 0; i < 5; i++) {
    cluster.fork({ PROFILE_DIR: i });
}
} else {
    const profileDir = process.env.PROFILE_DIR;
    console.log(`🚀 Worker ${process.pid} dùng profile: ${profileDir}`);

    queueGet.process(1,async(job,done)=>{
        try {
            await run(job.data.cookie,0);
            done()
        } catch (error) {
                console.error("Lỗi khi chạy cookie:", error);
        }
})

}
// }




