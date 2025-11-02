import axios from 'axios'
import * as cheerio from 'cheerio'
import { findValuesByKey,extractJsObjectBlock,parseJsObject, dataToMasterTopic, axiosPostProxy,axiosProxy,parseNumberShort,extractYtJson } from '../../../utils/youtube.js'
import getLogger from '../../../utils/logger.js'
import proxyList from '../../../resource/proxy.json'  assert { type: 'json' }
const logger = getLogger('info_video')

export const info_video = async(job)=>{
    try {
        let random_index = Math.floor(Math.random() * proxyList.length);
        let proxy = proxyList[random_index]
        const url = `https://www.youtube.com/watch?v=${job.data.videoId}`
        const res = await axiosProxy(`${url}`,proxy)
        var html = res.data
        const ytInitialPlayerResponse = extractYtJson(html, "ytInitialPlayerResponse")
        if(ytInitialPlayerResponse?.playabilityStatus?.status =="ERROR"){
            return {status:'delete',data:undefined}
        }
        const videoDetails = ytInitialPlayerResponse.videoDetails
        const microformat = ytInitialPlayerResponse?.microformat?.playerMicroformatRenderer
        const data_ytInitialData = extractYtJson(html,"ytInitialData")
        const commentCount = data_ytInitialData.engagementPanels?.find(t=>t?.engagementPanelSectionListRenderer?.panelIdentifier=="engagement-panel-comments-section")?.engagementPanelSectionListRenderer?.header?.engagementPanelTitleHeaderRenderer?.contextualInfo?.runs?.find(t=>t.text)?.text
         ///// data cho comment
        const itemSectionRenderer = data_ytInitialData.contents.twoColumnWatchNextResults?.results?.results?.contents?.find(t=>t.itemSectionRenderer&&t.itemSectionRenderer.sectionIdentifier)?.itemSectionRenderer?.contents?.find(t=>t.continuationItemRenderer)?.continuationItemRenderer?.continuationEndpoint
        const clickTrackingParams = itemSectionRenderer?.clickTrackingParams
        const continuation = itemSectionRenderer?.continuationCommand.token
        const match_client = extractJsObjectBlock(html,'INNERTUBE_CONTEXT')
        let payload_comment ={
            "context":{
                ...parseJsObject(match_client),
                "clickTracking": {
                    "clickTrackingParams": clickTrackingParams
                },
            },
            continuation
        }
        /////
    
        const data = {
                id:videoDetails.videoId,
                type:"youtubeTopic",
                siteId:videoDetails.channelId,
                siteName: videoDetails.author,
                publishedDate:new Date(microformat.uploadDate).toISOString(),
                url: `https://www.youtube.com/watch?v=${videoDetails.videoId}`,
                author : videoDetails.author,
                authorId : videoDetails.channelId,
                title :videoDetails.title,                                                
                description:videoDetails.shortDescription,
                content : videoDetails.shortDescription,
                likes: parseNumberShort(microformat.likeCount)||"0",
                shares: "0",
                comments: parseNumberShort(commentCount)||"0",
                views: parseNumberShort(microformat.viewCount)||"0",
                delayCrawler: "0",
                delayMongo: "0",
                delayEs: "0",
                ds: {
                    ip : "42.112.777.77",
                    source : "crawler-v7-youtube-post-hotfix-v1"
                }
        }
        const dataMaster = dataToMasterTopic(data)
        logger.info(`ok|${job.data.videoId}`)
        return {status:'ok',data:dataMaster,dataForComment:payload_comment}

    } catch (error) {
        if (axios.isAxiosError(error)) {
    // ✅ Lỗi của Axios
            console.error("Axios Error Video:", error.message);
        } else {
            // ❌ Lỗi khác (code JS, v.v.)
            console.error("Other Error:", error);
        }
        logger.error(`${error}|${job.data.videoId}`)
        return {status:'error',error:error}

    }
   
}
