        
import proxyList from '../../../../resource/proxy.json'  assert { type: 'json' }
import { cookieString } from '../../../../resource/cookieString.js';
import delay from 'delay'
import Queue from 'bull'
import { redisLocal,nameBull, redisMaster } from '../../../../configs/constant.js';
import fs from 'fs/promises'
import { axiosApiLogin ,signUrl} from '../../../../utils/tiktok.js';
import getLogger from '../../../../utils/logger.js';
import { Buffer } from 'buffer';
const logger = getLogger('tiktok_comment_reply')
import _ from 'lodash'
import axios from 'axios';
import moment from 'moment';
import TiktokCommentModel from '../../../../mongodb/tiktokComment/tiktokComment.js';
const InsertBuzzes = new Queue(nameBull.InsertBuzzes, redisMaster);

export const  workcommentreply = async(job)=>{
    try {
        let conditionBreak = 0
        for(let j=0;j<100000;j++){    
            let signed_url = `https://www.tiktok.com/api/comment/list/reply/?aid=1988&comment_id=${job.data.cid}&item_id=${job.data.aweme_id}&count=50&cursor=${j*50}`
            for(let i=0;i<50;i++){
                let random_index = Math.floor(Math.random() * proxyList.length);
                var proxy = proxyList[random_index]
                try {
                    let res = await axiosApiLogin(signed_url,proxy)
                    var {data ,status} = res
                    if(data.length!=0&&status==200){
                        break
                    }
                    logger.http(`reroll:${job.data.url}|${j*50}|${JSON.stringify(data)}`)
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                // ✅ Lỗi của Axios
                        console.error("Axios Error CommentReply Reroll:", error.message);
                    } else {
                        // ❌ Lỗi khác (code JS, v.v.)
                        console.error("Other Error CommentReply Reroll:", error);
                    }
                    logger.error(`${job.data.url}|${error}|${j*50}`)
                }
            
            }    
            const {comments,has_more,total} = data ?? {}
            var arrayCommentReply = []
            if(data.comments!=undefined&&data.comments.length!=0){
                conditionBreak==0
                await Promise.all( data.comments.map(async(item)=>{
                        let shardNumber = moment.unix(item.create_time).format("GGGGWW");
                        let index = `master${shardNumber}`
                        let insert = {
                            id :`${item.aweme_id}_${item.cid}`   ,                                       
                            type : "tiktokComment",
                            index : index,
                            siteId : job.data.siteId,
                            siteName : job.data.siteName,
                            insertedDate: new Date().toISOString(),
                            publishedDate :new Date(item.create_time*1000).toISOString(),
                            url : `${job.data.urlPost}?cid=${Buffer.from(item.cid).toString('base64').replaceAll('=','')}`,
                            author : item.user.nickname,
                            authorId : item.user.unique_id,
                            title : job.data?.title,                                             
                            description:job.data.description ??"",
                            content : item.text.replace(/\r?\n/g, " ").trim() ?? "",
                            parentDate : job.data.parentDate,
                            parentId : job.data.parentId,
                            likes : parseInt(item.digg_count)?? 0,
                            shares : parseInt("0")?? 0,
                            comments : parseInt("0")?? 0,
                            interactions : parseInt(item.digg_count)?? 0,
                            delayMongo : "0",
                            delayEs : "0",
                            delayCrawler : "0",
                            ds: {
                                ip : "42.112.777.77",
                                source : "crawler-v7-tiktok-commentreply-hotfix-v1"
                            }
                        }
                        // await TiktokCommentModel.create(insert)
                        arrayCommentReply.push(insert)               
                    }   
                )
            )   
            }
            logger.info(`${job.data.urlPost}|${arrayCommentReply.length}|${j*50}`)
            const arrayAddQueue =  _.chunk(arrayCommentReply,5)
            for(const x of arrayAddQueue){
                await delay(100)
                await InsertBuzzes.add(x, { removeOnComplete: true });  
            }
            if(has_more==0||has_more==undefined||total==0||comments==undefined||comments==null||comments.length==0){
                conditionBreak++
            }
            if(conditionBreak==1){
                break
            }
        }
    } catch (error) {
        logger.error(`${job.data.url}|${error}`)
        if (axios.isAxiosError(error)) {
    // ✅ Lỗi của Axios
            console.error("Axios Error CommentReply:", error.message);
        } else {
            // ❌ Lỗi khác (code JS, v.v.)
            console.error("Other Error:", error);
        }
    }
         

    
}