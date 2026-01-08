import os from 'os'
import cluster from 'cluster';
import { redisLocal, redisMaster,nameBull } from "./configs/constant.js"
import { search_keyword } from "./src/tiktok/keyword/index.js";
import { search_keyword_sign_browser_test } from './src/tiktok/keywordSignBrowsertest/index.js';
import { search_keyword_DOM } from './src/tiktok/keywordDOM/index.js';
import  TiktokCheckModel  from "./mongodb/tiktokCheck/tiktokCheck.js";
import { get_source } from "./src/tiktok/source/index.js";
import {connectDB} from './mongodb/connect.js'
import Queue from 'bull'
import { get_hashtag } from './src/tiktok/hashtag/index.js';
import { work_post, work_post_short } from './src/tiktok/post/index.js';
import { work_post_DOM } from './src/tiktok/postDOM/index.js';
import proxyList from './resource/proxy.json'assert { type: 'json' }

import delay from 'delay';


import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import  {executablePath} from 'puppeteer'
puppeteer.use(StealthPlugin());
import { pageSign } from './utils/tiktok.js';
import { signUrlByBrowser } from './utils/tiktok.js';
export const run = async()=>{
    try {
        let sumQueued = 3
        await connectDB()
        const queueKeywordTT = new Queue(nameBull.TTKeyword,redisLocal);
        const queueSourceTT = new Queue(nameBull.TTSource,redisLocal);
        const queueIdPostTT = new Queue(nameBull.TTIdPost,redisLocal);
        const queueCommentTT = new Queue(nameBull.TTComment, redisLocal);   
        const insertGetUrl = new Queue(nameBull.InsertBuzzes, redisLocal);
        queueKeywordTT.process(1,async(job,done)=>{
            if(job.data.typeCrawl=="keyword"){
                const result = await search_keyword_sign_browser_test(job)
                // if(result.data.length>150){
                //     await Promise.all(
                //         result.data.map(async(x)=>{
                //             if(x.date>=job.data.timeStart&&x.date<=job.data.timeEnd){
                //                 const checkUrlExist = await TiktokCheckModel.findOne({url:x.url,uniqueId:job.data.uniqueId})
                //                 if(checkUrlExist==null){
                //                     await queueIdPostTT.add({...x})
                //                     await TiktokCheckModel.create({...x,uniqueId:job.data.uniqueId})
                                    
                //                 }
                //             } 
                //         })
                //     )    
                // }else{
                //     await Promise.all(
                //         result.data.map(async(x)=>{
                //             if(x.date>=job.data.timeStart&&x.date<=job.data.timeEnd){
                //                 const checkUrlExist = await TiktokCheckModel.findOne({url:x.url,uniqueId:job.data.uniqueId})
                //                 if(checkUrlExist==null){
                //                     await queueIdPostTT.add({...x})
                //                     await TiktokCheckModel.create({...x,uniqueId:job.data.uniqueId})
                                    
                //                 }
                //             } 
                //         })
                //     )    
                //     if(job.data.addQueued<sumQueued){
                //         queueKeywordTT.add({...job.data,addQueued:job.data.addQueued+1})
                //     }
                // }
                // if(result.status=='error'){
                //     if(result?.message=='No signature function found'){
                //         process.exit(1); 
                //     }
                // }
            }
                  done()
        //     if(job.data.typeCrawl=="source"){
        //         const result = await get_source(job)
        //         if(result.status=="ok"){
        //             await Promise.all(
        //                 result.data.map(async(x)=>{
        //                     if(x.date>=job.data.timeStart&&x.date<=job.data.timeEnd){
        //                         const checkUrlExist = await TiktokCheckModel.findOne({url:x.url,uniqueId:job.data.uniqueId})
        //                         if(checkUrlExist==null){
        //                             await queueIdPostTT.add({...x})
        //                             await TiktokCheckModel.create({...x,uniqueId:job.data.uniqueId})
                                    
        //                         }
        //                     } 
        //                 })
        //             )    
        //         }else{
        //              queueKeywordTT.add({...job.data,addQueued:job.data.addQueued+1})
        //         }
        //     }
        //     if(job.data.typeCrawl=="hashtag"){
        //         const result = await get_hashtag(job)
        //         if(result.status=="ok"){
        //             await Promise.all(
        //                 result.data.map(async(x)=>{
        //                     if(x.date>=job.data.timeStart&&x.date<=job.data.timeEnd){
        //                         const checkUrlExist = await TiktokCheckModel.findOne({url:x.url,uniqueId:job.data.uniqueId})
        //                         if(checkUrlExist==null){
        //                             await queueIdPostTT.add({...x})
        //                             await TiktokCheckModel.create({...x,uniqueId:job.data.uniqueId})
                                    
        //                         }
        //                     } 
        //                 })
        //             )    
        //         }else{
        //              queueKeywordTT.add({...job.data,addQueued:job.data.addQueued+1})
        //         }
        //     }
        //     done()
        // })
        // queueIdPostTT.process(10,async(job,done)=>{
        //     if(job.data.typeCrawl == 'short'){
        //         const result = await work_post_short(job)
        //     }else{
        //         const result = await work_post_DOM(job)
        //     }
        //     // if(result.status=='error'){
        //     //     queueIdPostTT.add(job.data)
        //     // }
      
        })
    }catch(error){
        console.log(error)
    }
}
const numWorkers =  os.cpus().length

if (cluster.isPrimary) {

    console.log(`🧠 Master PID: ${process.pid}`);
    for (let i = 0; i < 1; i++) {
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
        process.exit(1); 
    }
}
// }