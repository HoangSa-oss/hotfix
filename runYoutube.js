import Queue from 'bull'
import YoutubeCheckModel from './mongodb/youtubeCheck/youtubeCheck.js'
import { search } from './src/youtube/search/index.js'
import { source } from './src/youtube/source/index.js'
import { post } from './src/youtube/post/index.js'
import {info_post} from './src/youtube/info_post/index.js'
import {info_video} from './src/youtube/info_video/index.js'
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

        queueKeywordYTB.process(4,async(job,done)=>{
            try {
                const result = await search(job)
                if(result.status=='ok'){
                    for(let i=0;i<result.data.length;i++){
                        if(result.data[i].date>=job.data.timeStart&&result.data[i].date<=job.data.timeEnd){
                            const findId = await YoutubeCheckModel.findOne({id:result.data[i].videoId,uniqueId:job.data.uniqueId})
                            if(findId==null){
                                await YoutubeCheckModel.create({id:result.data[i].videoId,date:result.data[i].date,uniqueId:job.data.uniqueId})
                                await queueIdPostYTB.add({videoId:result.data[i].videoId,typeCrawl:'video'},{ removeOnComplete: true})
                            }
                        }        
                    }
                }else{
                    if(error_add.some(e=>result.error.message.includes(e))){
                        await queueKeywordYTB.add(job.data,{ removeOnComplete: true})
                    }
                }
            } catch (error) {
                console.log(error)
            }
          
            done()
        })
        queueSourceYTB.process(1,async(job,done)=>{
            try {
                if(job.data.typeCrawl=='video'){
                    const result = await source(job)
                    if(result.status=='ok'){
                        for(let i=0;i<result.data.length;i++){
                        if(result.data[i].date>=job.data.timeStart&&result.data[i].date<=job.data.timeEnd){
                                const findId = await YoutubeCheckModel.findOne({id:result.data[i].videoId,uniqueId:job.data.uniqueId})
                                if(findId==null){
                                    await YoutubeCheckModel.create({id:result.data[i].videoId,date:result.data[i].date,uniqueId:job.data.uniqueId})
                                    await queueIdPostYTB.add({videoId:result.data[i].videoId,typeCrawl:'video'},{ removeOnComplete: true})
                                }
                            }        
                        }
                    }else{
                        console.log(result.error.message)
                        if(error_add.some(e=>result.error.message.includes(e))){
                            await queueSourceYTB.add(job.data,{ removeOnComplete: true})
                        }
                    }
                }
                if(job.data.typeCrawl=='post'){
                    const result = await post(job)
                    if(result.status=='ok'){
                        for(let i=0;i<result.data.length;i++){
                            if(result.data[i].date>=job.data.timeStart&&result.data[i].date<=job.data.timeEnd){
                                    const findId = await YoutubeCheckModel.findOne({id:result.data[i].postId,uniqueId:job.data.uniqueId})
                                    if(findId==null){
                                        await YoutubeCheckModel.create({id:result.data[i].postId,date:result.data[i].date,uniqueId:job.data.uniqueId})
                                        await queueIdPostYTB.add({postId:result.data[i].postId,typeCrawl:'post'},{ removeOnComplete: true})
                                    }
                                }        
                            }
                    }else{
                        console.log(result.error.message)
                        // if(error_add.some(e=>result.error.message.includes(e))){
                            await queueSourceYTB.add(job.data,{ removeOnComplete: true})
                        // }
                    }
                }
            
            } catch (error) {
                console.log(error)
            }
            
            done()
        })
        
        queueIdPostYTB.process(12,async(job,done)=>{
            try {
                if(job.data.typeCrawl=='video'){
                    const result = await info_video(job)
                    if(result.status=='ok'){
                        // try {
                        //     await YoutubeTopicModel.create({...result.data,dataForComment:result.dataForComment})
                        // } catch (error) {  
                        // }
                        await insertGetUrl.add([result.data],{ removeOnComplete: true})
                        await queueCommentYTB.add({...result.data,dataForComment:result.dataForComment,typeCrawl:"comment"});
                        

                    }  
                    if(result.status=='error'){
                        // if(error_add.some(e=>result.error.message.includes(e))){
                            await queueIdPostYTB.add(job.data,{ removeOnComplete: true})
                        // }
                    }
            }
                if(job.data.typeCrawl=='post'){
                    const result = await info_post(job)
                    if(result.status=='ok'){
                        // try {
                        //     await YoutubeTopicModel.create({...result.data,dataForComment:result.dataForComment})
                        // } catch (error) {   
                        // }
                        await insertGetUrl.add([result.data],{ removeOnComplete: true})
                        await queueCommentYTB.add({...result.data,dataForComment:result.dataForComment,typeCrawl:"comment"});
                    }
                    else{
                        await queueIdPostYTB.add(job.data,{ removeOnComplete: true})
                    
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
    for (let i = 0; i < 1; i++) {
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