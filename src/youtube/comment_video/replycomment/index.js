import axios from 'axios'
import fs from 'fs/promises'
import * as cheerio from 'cheerio'
import getLogger from '../../../../utils/logger.js'
import proxyList from '../../../../resource/proxy.json'  assert { type: 'json' }
import { axiosPostProxy,axiosProxy,parseNumberShort,parseRelativeTime,dataToMasterComment } from '../../../../utils/youtube.js'
import Queue from 'bull';
import { nameBull, redisLocal, redisMaster } from "../../../../configs/constant.js";
const queueCommentYTB = new Queue(nameBull.YTBCommnent, redisLocal);
const logger = getLogger('reply_comment')

export const reply_comment_video = async(job)=>{
    try {
        const payload = job.data.dataForComment
        if(payload==undefined){
            return {status:'ok',data:[]}
        }
        let random_index = Math.floor(Math.random() * proxyList.length);
        let proxy = proxyList[random_index]
        const url = "https://www.youtube.com/youtubei/v1/next?prettyPrint=false"
        const res = await  axiosPostProxy(url,payload,proxy)
        const data = res.data
        const item = data.frameworkUpdates?.entityBatchUpdate.mutations.filter(x=>x.payload.commentEntityPayload).map(x=>x.payload.commentEntityPayload)
        if(item==undefined){
            logger.info(`id:${job.data.url}|0`)
            return {status:'ok',data:[]}
        }
        const data_comment = item.map((x)=>{
            const data = x.properties
            const author = x.author
            const interactions = x.toolbar
            const data_comment = {
                id :data.commentId  ,                                       
                type : "youtubeComment",
                siteId : job.data.siteId,
                siteName : job.data.siteName,
                publishedDate :parseRelativeTime(data.publishedTime),
                url : `${job.data.url}&lc=${data.commentId}`,
                author : author.displayName,
                authorId : author.channelId,
                title : job.data.title,                                                
                description:job.data.description,
                content : data.content.content.replace(/\r?\n/g, " ").trim(),
                parentDate : job.data.parentDate,
                parentId : job.data.parentId,
                likes : parseNumberShort(interactions.likeCountLiked)||0,
                shares : 0,
                comments : 0,
                delayMongo : "0",
                delayEs : "0",
                delayCrawler : "0",
                ds: {
                    ip : "42.112.777.77",
                    source : "crawler-v7-youtube-commentreply-hotfix-v1"
                }              
            }
            return dataToMasterComment(data_comment)
             
        })
       
       /////reply
        const continuationItemRenderer = data?.onResponseReceivedEndpoints?.find(t=>t?.appendContinuationItemsAction).appendContinuationItemsAction?.continuationItems?.find(t=>t?.continuationItemRenderer)?.continuationItemRenderer?.button?.buttonRenderer?.command
        const clickTrackingParams = continuationItemRenderer?.clickTrackingParams
        const continuation = continuationItemRenderer?.continuationCommand.token
        if(clickTrackingParams!=undefined&&continuation!=undefined){
            let reply_comment_payload = {
            "context":{
                    ...payload.context,
                    "clickTracking": {
                        "clickTrackingParams": clickTrackingParams
                    },
                },
                continuation:continuation
            }
            queueCommentYTB.add({...job.data,dataForComment:reply_comment_payload,typeCrawl:'reply_comment'},{ removeOnComplete: true})
        }
        logger.info(`id:${job.data.url}|${data_comment.length}`)
        return {status:'ok',data:data_comment}
        ///////////
    } catch (error) {
        if (axios.isAxiosError(error)) {
    // ✅ Lỗi của Axios
            console.error("Axios Error Reply:", error.message);
        } else {
            // ❌ Lỗi khác (code JS, v.v.)
            console.error("Other Error:", error);
        }
        logger.error(`${error}|${job.data.url}|`)
        return {status:'error',error:error}

    }
   
}
