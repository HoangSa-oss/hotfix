import axios from 'axios'
import fs from 'fs'
import * as cheerio from 'cheerio'
import { findValuesByKey,extractJsObjectBlock,parseJsObject,parseRelativeTime,axiosPostProxy,axiosProxy } from '../../../utils/youtube.js'
import getLogger from '../../../utils/logger.js'
import proxyList from '../../../resource/proxy.json'  assert { type: 'json' }


const logger = getLogger('search')

export const search = async(job)=>{
    try {
        let random_index = Math.floor(Math.random() * proxyList.length);
        let proxy = proxyList[random_index]
        let videoIds = []
        const match_value = 'var ytInitialData'
        const search = job.data.keyword
        const url = 'https://www.youtube.com/results?search_query='
        const res = await axiosProxy(`${url}${encodeURIComponent(search)}`,proxy)
        const html = res.data
        const regex_ytInitialData = new RegExp(`${match_value}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
        const match_ytInitialData = html.match(regex_ytInitialData);
        const match_client = extractJsObjectBlock(html,'INNERTUBE_CONTEXT')
        const ytInitialData = JSON.parse(match_ytInitialData[1]);
        //////////////////////////
        const items = ytInitialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents.find(t=>t.itemSectionRenderer).itemSectionRenderer.contents
        const continuationItemRenderer = ytInitialData.contents?.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents?.find(t=>t?.continuationItemRenderer)?.continuationItemRenderer.continuationEndpoint
        //////////////////////////
        const continuation = continuationItemRenderer?.continuationCommand.token
        const clickTrackingParams = continuationItemRenderer?.clickTrackingParams
        items.forEach((x)=>{
            const item = x.videoRenderer
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
                },
            },
            continuation
        }
  
        let url_scroll = `https://www.youtube.com/youtubei/v1/search?prettyPrint=false`
        let scroll = 20
        if(continuation==undefined){
            scroll ==0
        }
    
        for(let i=0;i<scroll;i++){
            let res  = await axiosPostProxy(url_scroll,payload,proxy)
          
            let data = res.data
            ///////////////////////////////////////////////
            let items = data.onResponseReceivedCommands?.find(t=>t.appendContinuationItemsAction).appendContinuationItemsAction.continuationItems.find(t=>t.itemSectionRenderer).itemSectionRenderer.contents
        
       
            items.forEach((x)=>{
                const item = x.videoRenderer
                if(item!=undefined){
                    videoIds.push({videoId:`${item.videoId}`,date:parseRelativeTime(item?.publishedTimeText?.simpleText)})
                }
            })
            let continuationItemRenderer = data.onResponseReceivedCommands?.find(t=>t.appendContinuationItemsAction).appendContinuationItemsAction.continuationItems?.find(t=>t?.continuationItemRenderer)?.continuationItemRenderer?.continuationEndpoint
            let clickTrackingParams = continuationItemRenderer?.clickTrackingParams
            let continuation = continuationItemRenderer?.continuationCommand?.token
            if(continuation==undefined){
                break;
            }
            payload = {
                "context":{
                    ...parseJsObject(match_client),
                    "clickTracking": {
                            "clickTrackingParams": clickTrackingParams
                    }
                },
                continuation
            }
        }
        logger.info(`${job.data.keyword}|${videoIds.length}`)
        return {status:'ok',data:videoIds}
    } catch (error) {
        console.log(error)
        console.log(job.data.keyword)
        logger.error(`${job.data.keyword}|${error}`)
        return {status:'error',error:error}
    }
}
