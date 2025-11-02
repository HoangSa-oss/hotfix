import { connectDB } from "../mongodb/connect.js";
import { schedule } from 'node-cron';
import Queue from 'bull';
import moment from "moment"
import  YoutubeTopicModel  from "../mongodb/youtubeTopic/youtubeTopic.js";
import { nameBullMaster ,RedisLocal} from "../configs/constant.js";
import getLogger from "../utils/logger.js";
const pushComment = async ()=>{
    const queueCommentYTB = new Queue(nameBullMaster.bullTTCommnent, RedisLocal);
    // await queueCommentYTB.obliterate({force: true});
    const logger = getLogger('pushcomment')
    try {
        await connectDB()
        const daily = 1
        const  timeDaily = moment().subtract(daily, 'days').startOf('day').toISOString()
        const  timeDelete = moment().subtract(daily+30, 'days').startOf('day').toISOString()
        const checkQueueEmpty = await queueCommentYTB.count()
        if(checkQueueEmpty<30){
            const getPostToComment = await YoutubeTopicModel.find({publishedDate:{$gte:timeDaily}})
            const promiseAll = getPostToComment.map(async(x)=>{
                    const {_id,...data} = x
                    await queueCommentYTB.add({...data,typeCrawl:"comment"}, {   removeOnComplete: true,  attempts: 4 })
                }) 
            await Promise.all(promiseAll)
            logger.info(`listLength:${getPostToComment.length}|message:Done`)
        }else{
            await YoutubeTopicModel.deleteMany(
                {publishedDate:{$lt:timeDelete} },
            )
            logger.info(`message:DoneRemove`)
        }
    
    } catch (error) {
        logger.error(`message:${error}`)
        console.log(error)
    }
    
}
pushComment()
schedule(`*/20 * * * *`, async() => {
    await pushComment()
});
  

