import axios from 'axios'
import fs from 'fs'
import * as cheerio from 'cheerio'
import { findValuesByKey,extractJsObjectBlock,parseJsObject,parseRelativeTime,dataToMasterTopic,axiosPostProxy,axiosProxy,parseNumberShort} from '../../../utils/youtube.js'
import getLogger from '../../../utils/logger.js'
import proxyList from '../../../resource/proxy.json'  assert { type: 'json' }

const logger = getLogger('info_post')

export const info_post = async(job)=>{
    try {
        let random_index = Math.floor(Math.random() * proxyList.length);
        let proxy = proxyList[random_index]
        const match_value = 'var ytInitialData'
        const regex_ytInitialData = new RegExp(`${match_value}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
        const url = `https://www.youtube.com/post/${job.data.postId}`
        const res = await axiosProxy(`${url}`,proxy)
        var html = res.data
        const  match_ytInitialData = html.match(regex_ytInitialData)
        const ytInitialData = JSON.parse(match_ytInitialData[1])
        const item  = ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs.find(t=>t.tabRenderer?.title=="Posts"||t.tabRenderer?.title=="Bài đăng").tabRenderer.content.sectionListRenderer.contents
        const content_item = item.find(t=>t.itemSectionRenderer.sectionIdentifier=='backstage-item-section').itemSectionRenderer.contents.find(t=>t.backstagePostThreadRenderer).backstagePostThreadRenderer.post.backstagePostRenderer
        const itemSectionRenderer =  item.find(t=>t.itemSectionRenderer.sectionIdentifier=='comment-item-section').itemSectionRenderer.contents.find(t=>t.continuationItemRenderer).continuationItemRenderer.continuationEndpoint
      
        const clickTrackingParams = itemSectionRenderer?.clickTrackingParams
        const continuation = itemSectionRenderer?.continuationCommand?.token
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
        let author = content_item.authorText.runs.find(t=>t.navigationEndpoint)
        let time = content_item.publishedTimeText.runs.find(t=>t.text).text
        let content = content_item.contentText?.runs?.find(t=>t.text).text.replace(/\r?\n/g, " ").trim() ||""
        let likes = content_item.voteCount.simpleText.split(" ")[0]
        let comment = parseNumberShort(job.data.comment)
        let data =  {
            id:content_item.postId,
            type:"youtubeTopic",
            siteId:author.navigationEndpoint.browseEndpoint.browseId,
            siteName: author.text,
            publishedDate:parseRelativeTime(time),
            url: `https://www.youtube.com/post/${content_item.postId}`,
            author : author.text,
            authorId :author.navigationEndpoint.browseEndpoint.browseId,
            title :"",                                                
            description:content,
            content : content,
            likes: parseNumberShort(likes)|| 0,
            shares: 0,
            comments: parseNumberShort(comment)||0,
            views: 0,
            delayCrawler: "0",
            delayMongo: "0",
            delayEs: "0",
            ds: {
                ip : "42.112.777.77",
                source : "crawler-v7-youtube-post-hotfix-v1"
            }
        }
        const dataMaster = dataToMasterTopic(data)
        logger.info(`ok|${job.data.postId}`)

        return {status:'ok',data:dataMaster,dataForComment:payload_comment}

      

    } catch (error) {
        if (axios.isAxiosError(error)) {
    // ✅ Lỗi của Axios
            console.error("Axios Error:", error.message);
        } else {
            // ❌ Lỗi khác (code JS, v.v.)
            console.error("Other Error:", error);
        }
        logger.error(`${error}|${job.data.videoId}`)
        return {status:'error',error:error}

    }
   
}
