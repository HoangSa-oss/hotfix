import axios from 'axios'
import fs from 'fs/promises'
import * as cheerio from 'cheerio'
import { findValuesByKey,extractJsObjectBlock,parseJsObject, dataToMasterTopic, parseRelativeTime, dataToMasterComment,axiosPostProxy,axiosProxy,parseNumberShort } from '../../../../utils/youtube.js'
import getLogger from '../../../../utils/logger.js'
import proxyList from '../../../../resource/proxy.json'  assert { type: 'json' }
import Queue from 'bull';
import { log } from 'console'
import { nameBull, redisLocal, redisMaster } from "../../../../configs/constant.js";

const queueCommentYTB = new Queue(nameBull.YTBCommnent, redisLocal);
const logger = getLogger('comment')

export const comment_post = async(job)=>{
  
    try {
        const payload = job.data.dataForComment
        let array_data = []
        let random_index = Math.floor(Math.random() * proxyList.length);
        let proxy = proxyList[random_index]
        const url = "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false"
        const res = await  axiosPostProxy(url,payload,proxy)
        const data = res.data
        const item = data.frameworkUpdates?.entityBatchUpdate.mutations.filter(x=>x.payload.commentEntityPayload).map(x=>x.payload.commentEntityPayload)
        if(item==undefined){
            logger.info(`id:${job.data.id}|0`)

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
                parentDate : job.data.publishedDate,
                parentId : job.data.id,
                likes : parseNumberShort(interactions.likeCountLiked)||0,
                shares : 0,
                comments : 0,
                delayMongo : "0",
                delayEs : "0",
                delayCrawler : "0",
                ds: {
                    ip : "42.112.777.77",
                    source : "crawler-v7-youtube-comment-hotfix-v1"
                }              
            }
            return dataToMasterComment(data_comment)
             
        })
        /////check reply and scroll
        const reply_comment_continuation = data.onResponseReceivedEndpoints.find(t=>t.reloadContinuationItemsCommand?.slot=='RELOAD_CONTINUATION_SLOT_BODY')?.reloadContinuationItemsCommand.continuationItems
        if(reply_comment_continuation==undefined){
            logger.info(`id:${job.data.id}|${data_comment.length}`)
            return {status:'ok',data:data_comment}

        }
        const reply_comment_data_request = reply_comment_continuation.map(x=>x.commentThreadRenderer?.replies).filter(x=>!!x) 
        const reply_comment_payload = reply_comment_data_request.map((x)=>{
            const continuationItemRenderer = x?.commentRepliesRenderer?.contents?.find(t=>t?.continuationItemRenderer)?.continuationItemRenderer?.continuationEndpoint
            const clickTrackingParams = continuationItemRenderer?.clickTrackingParams
            const continuation = continuationItemRenderer?.continuationCommand.token
            if(continuation!=undefined){
                return {
                    "context":{
                        ...payload.context,
                        "clickTracking": {
                            "clickTrackingParams": clickTrackingParams
                        },
                    },
                    continuation:continuation
                }
            }
            
        }).filter(x=>!!x) 

        const data_reply = {
            title:job.data.title,
            siteName:job.data.siteName,
            siteId:job.data.siteId,
            url:job.data.url,
            parentId:job.data.id,
            parentDate:job.data.publishedDate,
            description:job.data.description
        }
        await Promise.all(await reply_comment_payload.map(async(x)=>{
            await queueCommentYTB.add({...data_reply,dataForComment:x,typeCrawl:'reply_comment'},{ removeOnComplete: true})
        }))
            
        
      
        ///////scroll
        let continuationItemRenderer = reply_comment_continuation?.find(t=>t?.continuationItemRenderer)?.continuationItemRenderer.continuationEndpoint
        const clickTrackingParams = continuationItemRenderer?.clickTrackingParams
        const continuation = continuationItemRenderer?.continuationCommand.token
        if(clickTrackingParams!=undefined&&continuation!=undefined){
            let payload_scroll = {
                "context":{
                    ...payload.context,
                    "clickTracking": {
                        "clickTrackingParams": clickTrackingParams
                    },
                },
                continuation:continuation
            }
            await queueCommentYTB.add({
                ...job.data,
                dataForComment:payload_scroll,
                typeCrawl:"comment_scroll",
            },{ removeOnComplete: true})
        }
        /////////////
        logger.info(`id:${job.data.id}|${data_comment.length}`)
        return {status:'ok',data:data_comment}
    } catch (error) {
        if (axios.isAxiosError(error)) {
    // ✅ Lỗi của Axios
            console.error("Axios Error:", error.message);
        } else {
            // ❌ Lỗi khác (code JS, v.v.)
            console.error("Other Error:", error);
        }
        logger.error(`${error}|${job.data.id}`)
        return {status:'error',error:error}

    }
   
}
