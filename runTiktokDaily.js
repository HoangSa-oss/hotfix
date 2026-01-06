import os from 'os'
import fs from 'fs/promises'
import cluster from 'cluster';
import { redisLocal, redisMaster,nameBull } from "./configs/constant.js"
import { search_keyword } from "./src/tiktok/keyword/index.js";
import  TiktokCheckModel  from "./mongodb/tiktokCheck/tiktokCheck.js";
import { get_source, get_source_daily} from "./src/tiktok/source/index.js";
import {connectDB} from './mongodb/connect.js'
import Queue from 'bull'
import { get_hashtag,get_hashtag_daily } from './src/tiktok/hashtag/index.js';
import { work_post } from './src/tiktok/post/index.js';
export const run = async()=>{
    try {
        let sumQueued = 3
        await connectDB()
        const queueKeywordTT = new Queue(nameBull.TTKeyword,redisLocal);
        const queueSourceTT = new Queue(nameBull.TTSource,redisLocal);
        const queueIdPostTT = new Queue(nameBull.TTIdPost,redisLocal);
        const queueCommentTT = new Queue(nameBull.TTComment, redisLocal);   
        const insertGetUrl = new Queue(nameBull.InsertBuzzes, redisLocal);
        queueKeywordTT.process(3,async(job,done)=>{
            if(job.data.typeCrawl=="keyword"){
              await fs.appendFile('./dailyKeyword.txt',`"`+job.data.keyword+`"`+","+"\r\n")
            }
            if(job.data.typeCrawl=="source"){
                const result = await get_source_daily(job)
                if(result.status=="ok"){
                }else{
                     queueKeywordTT.add({...job.data,addQueued:job.data.addQueued+1})
                }
            }
            if(job.data.typeCrawl=="hashtag"){
                const result = await get_hashtag_daily(job)
                if(result.status=="ok"){
                }else{
                     queueKeywordTT.add({...job.data,addQueued:job.data.addQueued+1})
                }
            }
            done()
        })
        queueIdPostTT.process(20,async(job,done)=>{
            const result = await work_post(job)
            if(result.status=='error'){
                queueIdPostTT.add(job.data)
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
    for (let i = 0; i < numWorkers; i++) {
    cluster.fork({ PROFILE_DIR: i });
}
} else {
    const profileDir = process.env.PROFILE_DIR;
    console.log(`🚀 Worker ${process.pid} dùng profile: ${profileDir}`);

    (async () => {
        await run()
    })();
}
// }