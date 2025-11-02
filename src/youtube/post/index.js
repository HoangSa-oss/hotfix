import axios from 'axios'
import fs from 'fs/promises'
import * as cheerio from 'cheerio'
import { findValuesByKey,extractJsObjectBlock,parseJsObject,parseNumberShort,parseRelativeTime,axiosPostProxy,axiosProxy} from '../../../utils/youtube.js'
import getLogger from '../../../utils/logger.js'
import proxyList from '../../../resource/proxy.json'  assert { type: 'json' }

const logger = getLogger('post')

export const post = async(job)=>{
    try {
        let random_index = Math.floor(Math.random() * proxyList.length);
        let proxy = proxyList[random_index]
        let postIds = []
        const match_value = 'var ytInitialData'
        const url = `${job.data.source}/posts`
        const res = await axiosProxy(url,proxy)
        const html = res.data
        const regex_ytInitialData = new RegExp(`${match_value}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
        const match_ytInitialData = html.match(regex_ytInitialData);
        const match_client = extractJsObjectBlock(html,'INNERTUBE_CONTEXT')
        const ytInitialData = JSON.parse(match_ytInitialData[1]);
        const items = ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs
        const contents = items?.find(t=>t.tabRenderer?.title=="Posts"||t.tabRenderer?.title=="Bài đăng")?.tabRenderer.content.sectionListRenderer.contents.find(t=>t.itemSectionRenderer).itemSectionRenderer.contents||[]
        const continuationItemRenderer = contents?.find(t=>t?.continuationItemRenderer)?.continuationItemRenderer?.continuationEndpoint
        const continuation = continuationItemRenderer?.continuationCommand.token
        const clickTrackingParams = continuationItemRenderer?.clickTrackingParams
        contents.filter(t=>t.backstagePostThreadRenderer).forEach((x)=>{
            let item = x.backstagePostThreadRenderer.post.backstagePostRenderer
            // let author = item.authorText.runs.find(t=>t.navigationEndpoint)
            const time = item.publishedTimeText.runs.find(t=>t.text).text
            // let content = item.contentText.runs.find(t=>t.text).text.replace(/\r?\n/g, " ").trim()
            // let likes = item.voteCount.simpleText.split(" ")[0]
            let comment = item.actionButtons.commentActionButtonsRenderer?.replyButton?.buttonRenderer?.text?.simpleText||0
            if(item!=undefined){
                // let data =  {
                //     id:item.postId,
                //     type:"youtubeTopic",
                //     siteId:author.navigationEndpoint.browseEndpoint.browseId,
                //     siteName: author.text,
                //     publishedDate:parseRelativeTime(time),
                //     url: `https://www.youtube.com/post/${item.postId}`,
                //     author : author.text,
                //     authorId :author.navigationEndpoint.browseEndpoint.browseId,
                //     title :"",                                                
                //     description:content,
                //     content : content,
                //     likes: parseNumberShort(likes)|| 0,
                //     shares: 0,
                //     comments: parseNumberShort(comments)||0,
                //     views: 0,
                //     delayCrawler: "0",
                //     delayMongo: "0",
                //     delayEs: "0",
                //     ds: {
                //         ip : "42.112.777.77",
                //         source : "crawler-v7-youtube-post-v1"
                //     }
                // }
                postIds.push({postId:item.postId,date:parseRelativeTime(time),comment:comment})
            }
        })
        let payload ={
            "context":{
                ...parseJsObject(match_client),
                "clickTracking": {
                    "clickTrackingParams": clickTrackingParams
                }
            },
            continuation
        }
        let url_scroll = `https://www.youtube.com/youtubei/v1/browse?prettyPrint=false`
        let scroll = 10000
        if(continuation==undefined){
            scroll = 0
        }
        for(let i=0;i<scroll;i++){
            var data_res 
            for(let j=0;j<5;j++){
                try {
                    let res  = await axiosPostProxy(url_scroll,payload,proxy)
                    data_res = res.data
                    if(data_res!=undefined){
                        break;
                    }
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        console.error("Axios Error:", error.message);
                    } else {
                        // ❌ Lỗi khác (code JS, v.v.)
                        console.error("Other Error:", error);
                    }
                }
            }
            const items = data_res.onResponseReceivedEndpoints.find(t=>t.appendContinuationItemsAction).appendContinuationItemsAction.continuationItems
            const contents = items || []
            contents.filter(t=>t.backstagePostThreadRenderer).forEach((x)=>{
                let item = x.backstagePostThreadRenderer.post.backstagePostRenderer
                // let author = item.authorText.runs.find(t=>t.navigationEndpoint)
                let time = item.publishedTimeText.runs.find(t=>t.text).text
                // let content = item.contentText.runs.find(t=>t.text).text.replace(/\r?\n/g, " ").trim()
                // let likes = item.voteCount.simpleText.split(" ")[0]
                let comment = item.actionButtons.commentActionButtonsRenderer?.replyButton?.buttonRenderer?.text?.simpleText||0
                if(item!=undefined){
                    // let data =  {
                    //     id:item.postId,
                    //     type:"youtubeTopic",
                    //     siteId:author.navigationEndpoint.browseEndpoint.browseId,
                    //     siteName: author.text,
                    //     publishedDate:parseRelativeTime(time),
                    //     url: `https://www.youtube.com/post/${item.postId}`,
                    //     author : author.text,
                    //     authorId :author.navigationEndpoint.browseEndpoint.browseId,
                    //     title :"",                                                
                    //     description:content,
                    //     content : content,
                    //     likes: parseNumberShort(likes)|| 0,
                    //     shares: 0,
                    //     comments: parseNumberShort(comments)||0,
                    //     views: 0,
                    //     delayCrawler: "0",
                    //     delayMongo: "0",
                    //     delayEs: "0",
                    //     ds: {
                    //         ip : "42.112.777.77",
                    //         source : "crawler-v7-youtube-post-v1"
                    //     }
                    // }
                postIds.push({postId:item.postId,date:parseRelativeTime(time),comment:comment})                }
            })
            const continuationItemRenderer = contents?.find(t=>t?.continuationItemRenderer)?.continuationItemRenderer?.continuationEndpoint
            const continuation = continuationItemRenderer?.continuationCommand.token
            const clickTrackingParams = continuationItemRenderer?.clickTrackingParams
            if(continuation==undefined||postIds[postIds.length-1].date<=job.data.timeStart){
                break;
            }
            payload ={
            "context":{
                ...parseJsObject(match_client),
                "clickTracking": {
                    "clickTrackingParams": clickTrackingParams
                }
            },
            continuation
        }
       
        }
        logger.info(`${job.data.source}|${postIds.length}`)
        return {status:'ok',data:postIds}
    } catch (error) {
        if (axios.isAxiosError(error)) {
    // ✅ Lỗi của Axios
            console.error("Axios Error:", error.message);
        } else {
            // ❌ Lỗi khác (code JS, v.v.)
            console.error("Other Error:", error);
        }
        logger.error(`${job.data.source}|${error}`)
        return {status:'error',error:error}

    }
    
}
