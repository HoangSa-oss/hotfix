import Queue from 'bull'
import {comment_video} from './src/youtube/comment_video/comment/index.js'
import {comment_scroll_video} from  './src/youtube/comment_video/comment_scroll/index.js'
import {reply_comment_video} from './src/youtube/comment_video/replycomment/index.js'
import {comment_post} from './src/youtube/comment_post/comment/index.js'
import { comment_scroll_post } from './src/youtube/comment_post/comment_scroll/index.js'
import {reply_comment_post} from './src/youtube/comment_post/replycomment/index.js'
import os from 'os'
import cluster from 'cluster';
import { connectDB } from './mongodb/connect.js';
import { redisLocal,nameBull, redisMaster } from './configs/constant.js';
export const run = async()=>{
    try {
     await connectDB()
        const error_add = ['ETIMEDOUT', '403', 'timeout']
        const queueKeywordYTB = new Queue(nameBull.YTBKeyword,redisLocal);
        const queueIdPostYTB = new Queue(nameBull.YTBIdPost,redisLocal);
        const queueSourceYTB = new Queue(nameBull.YTBSource,redisLocal);
        const queueCommentYTB = new Queue(nameBull.YTBCommnent, redisLocal);
        const insertGetUrl = new Queue(nameBull.InsertBuzzes, redisMaster);
        queueCommentYTB.process(5,async(job,done)=>{
            try {
                if(job.data.url.includes('watch')){
                    if(job.data.typeCrawl=="comment"){
                    const result = await comment_video(job)
                    if(result.status=='ok'){
                        await insertGetUrl.add(result.data,{ removeOnComplete: true})             
                    }
                    else{
                        queueCommentYTB.add(job.data,{ removeOnComplete: true})
                    }
                    }
                    if(job.data.typeCrawl=="comment_scroll"){
                        const result = await comment_scroll_video(job)
                        if(result.status=='ok'){
                            await insertGetUrl.add(result.data,{ removeOnComplete: true})   
                        }else{
                            queueCommentYTB.add(job.data,{ removeOnComplete: true})
                        }
                    }
                    if(job.data.typeCrawl=="reply_comment"){
                        const result = await reply_comment_video(job)
                        if(result.status=='ok'){
                            await insertGetUrl.add(result.data,{ removeOnComplete: true})  
                        }else{
                            queueCommentYTB.add(job.data,{ removeOnComplete: true})
                        }
                    }
                }
                if(job.data.url.includes('post')){
                    if(job.data.typeCrawl=="comment"){
                        const result = await comment_post(job)
                        if(result.status=='ok'){
                            await insertGetUrl.add(result.data,{ removeOnComplete: true})
                        }
                        else{
                            queueCommentYTB.add(job.data,{ removeOnComplete: true})
                        }
                    }
                    if(job.data.typeCrawl=="comment_scroll"){
                        const result = await comment_scroll_post(job)
                        if(result.status=='ok'){
                            await insertGetUrl.add(result.data,{ removeOnComplete: true})
                        }else{
                            queueCommentYTB.add(job.data,{ removeOnComplete: true})
                        }
                    }
                    if(job.data.typeCrawl=="reply_comment"){
                        const result = await reply_comment_post(job)
                        if(result.status=='ok'){
                            await insertGetUrl.add(result.data,{ removeOnComplete: true})   
                        }else{
                            queueCommentYTB.add(job.data,{ removeOnComplete: true})
                        }
                    }
                }
                } catch (error) {
                    console.log(error)
                }
                
            done()
        })
       
     
    } catch (error) {
        console.log(error)
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

    (async () => {
        await run()
    })();
}
// }