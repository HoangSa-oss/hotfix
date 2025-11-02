import axios from 'axios'
import fs from 'fs'
import * as cheerio from 'cheerio'
import { findValuesByKey,extractJsObjectBlock,parseJsObject,parseRelativeTime,axiosPostProxy,axiosProxy} from '../../../utils/youtube.js'
import getLogger from '../../../utils/logger.js'
import proxyList from '../../../resource/proxy.json'  assert { type: 'json' }

const logger = getLogger('source')

export const source = async(job)=>{
    try {
        let random_index = Math.floor(Math.random() * proxyList.length);
        let proxy = proxyList[random_index]
        let videoIds = []
        const match_value = 'var ytInitialData'
        const url = `${job.data.source}/videos`
        const res = await axiosProxy(url,proxy)
        const html = res.data
        const regex_ytInitialData = new RegExp(`${match_value}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
        const match_ytInitialData = html.match(regex_ytInitialData);
        const match_client = extractJsObjectBlock(html,'INNERTUBE_CONTEXT')
        const ytInitialData = JSON.parse(match_ytInitialData[1]);
        const items = ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs.find(t=>t.tabRenderer?.content).tabRenderer.content.richGridRenderer.contents
        const continuationItemRenderer = items?.find(t=>t?.continuationItemRenderer)?.continuationItemRenderer.continuationEndpoint
        const continuation = continuationItemRenderer?.continuationCommand.token
        const clickTrackingParams = continuationItemRenderer?.clickTrackingParams
        items.forEach((x)=>{
            let item = x.richItemRenderer?.content.videoRenderer
            if(item!=undefined){
                videoIds.push({videoId:`${item.videoId}`,date:parseRelativeTime(item?.publishedTimeText?.simpleText)})
            }
        }
        )
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
            let res  = await axiosPostProxy(url_scroll,payload,proxy)
            let data = res.data
            let items = data.onResponseReceivedActions.find(t=>t.appendContinuationItemsAction).appendContinuationItemsAction.continuationItems
           
            items.forEach((x)=>{
                let item = x.richItemRenderer?.content.videoRenderer
                if(item!=undefined){
                    videoIds.push({videoId:`${item.videoId}`,date:parseRelativeTime(item?.publishedTimeText?.simpleText)})
                }
            })
            let continuationItemRenderer = items?.find(t=>t.continuationItemRenderer)?.continuationItemRenderer?.continuationEndpoint
            let continuation = continuationItemRenderer?.continuationCommand.token
            let clickTrackingParams = continuationItemRenderer?.clickTrackingParams
            if(continuation==undefined||videoIds[videoIds.length-1].date<=job.data.timeStart){
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
        logger.info(`${job.data.source}|${videoIds.length}`)
        return {status:'ok',data:videoIds}
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
