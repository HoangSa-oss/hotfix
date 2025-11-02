import os from 'os'
import cluster from 'cluster';
import { redisLocal, redisMaster,nameBull } from "./configs/constant.js"
import { search_keyword } from "./src/tiktok/keyword/index.js";
import  TiktokCheckModel  from "./mongodb/tiktokCheck/tiktokCheck.js";
import { get_source } from "./src/tiktok/source/index.js";
import {connectDB} from './mongodb/connect.js'
import Queue from 'bull'
import { get_hashtag } from './src/tiktok/hashtag/index.js';
import { work_post } from './src/tiktok/post/index.js';
import { workcomment } from './src/tiktok/comment/comment/comment.js';
import { workcommentreply } from './src/tiktok/comment/comment/commentreply.js';
export const run = async()=>{
    try {
        let sumQueued = 3
        await connectDB()
        const queueKeywordTT = new Queue(nameBull.TTKeyword,redisLocal);
        const queueSourceTT = new Queue(nameBull.TTSource,redisLocal);
        const queueIdPostTT = new Queue(nameBull.TTIdPost,redisLocal);
        const queueCommentTT = new Queue(nameBull.TTComment, redisLocal);   
        const insertGetUrl = new Queue(nameBull.InsertBuzzes, redisLocal);
        queueCommentTT.process(20,async(job,done)=>{
            if(job.data.typeCrawl=="comment"){
                await workcomment(job)
            }
            if(job.data.typeCrawl=="reply"){
                await workcommentreply(job)
                
            }     
            done(); 
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