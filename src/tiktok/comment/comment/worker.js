import puppeteer from 'puppeteer-extra';
import Queue from 'bull';
import delay from 'delay'
import { signUrl,axiosApi,pageSign } from '../utils/index.js';
import { RedisLocal,RedisMaster,nameBullLocal,nameBullMaster } from '../configs/constant.js';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import  {executablePath} from 'puppeteer'
puppeteer.use(StealthPlugin());
import mongoose from 'mongoose';
import {workcomment} from './comment.js'
import { workcommentreply } from './commentreply.js';
mongoose.connect('mongodb://127.0.0.1:27017/crawlManual')
import  cluster from 'node:cluster';
import  numCPUs  from 'node:os';
import process from 'node:process';
export const  workcommentCombine = async(i)=>{
    try {
        await delay(i*5000)
        const queueComment =  new Queue(nameBullLocal.bullComment, RedisLocal);
        process.setMaxListeners(0);
            // var browser = await puppeteer.launch({
            //     headless: false,
            //     args: [
            //         // `--proxy-server=42.96.11.50:55555`,
            //         '--enable-features=NetworkService',
            //         '--no-sandbox',
            //         '--disable-setuid-sandbox',
            //         '--disable-dev-shm-usage',
            //         '--disable-web-security',
            //         '--disable-features=IsolateOrigins,site-per-process',
            //         '--shm-size=8gb', // this solves the issue
            //         '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            //         ],
            //         ignoreHTTPSErrors: true,
            //         executablePath:executablePath(),  
            //     });
            //     await delay(1000)
            //     var page = await browser.newPage({});
            //     // var page1 = await browser.newPage({});
            //     // await page.authenticate({
            //     //     "username":"heai7r3x",
            //     //     "password":"hEAI7r3x"
            //     //     });
            //     await page.setBypassCSP(true)
            //     // await page1.setBypassCSP(true)

            // // }
           
            //     await page.goto("https://www.tiktok.com/",{timeout:60000 })
            //     await delay(15000)
             
            //     await pageSign({page})
            //     await delay(20000)
                let msToken = "ESAmmPLK_uwKSC5wGg4d0YA__KrCgro-xjfO6RYPbuTpU3Ponrx-O7_zGHV1wPWALInnQsgteXpbzMEdk4Sr3qgACWqwhhjl2SMycUzEIzdU604CstxpiPu2LIpxQmOg7yB_ZhRWAu-O6Z1380r6qXA="

             queueComment.process(15,async (job,done)=>{
                if(job.data.typeCrawl=="comment"){
                    await workcomment(job,msToken)
                    // msToken = workingcomment
                }
                if(job.data.typeCrawl=="reply"){
                   await workcommentreply(job,msToken)
                   
                }      // queueComment.close()
           
                done();            
 })

    } catch (error) {
        console.log("concac"+error.message)
    }
   
}
if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
  
    // Fork workers.
    for (let i = 0; i < numCPUs.availableParallelism(); i++) {
      cluster.fork();
    }
  
    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    // Workers can share any TCP connection
    // In this case it is an HTTP server
   
    workcommentCombine(1)
    console.log(`Worker ${process.pid} started`);
  }
// for(let i=0;i<15;i++){
    // workcommentCombine()
 
// }

