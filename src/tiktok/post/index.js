
import proxyList from '../../../resource/proxy.json'assert { type: 'json' }
import device_id_list from '../../../resource/deviceid.json'assert { type: 'json' }
import getLogger from '../../../utils/logger.js'
import { signUrl,axiosApiLogin,generateSearchId } from '../../../utils/tiktok.js';
import delay from 'delay';
import { redisLocal,nameBull, redisMaster } from '../../../configs/constant.js';
import { cookieString } from '../../../resource/cookieString.js';
const logger = getLogger('tiktok_post')
import TiktokTopicModel  from '../../../mongodb/tiktokTopic/tiktokTopic.js';
import moment from 'moment';
import Queue from 'bull'
const queueCommentTT = new Queue(nameBull.TTComment, redisLocal);   
const InsertBuzzes = new Queue(nameBull.InsertBuzzes, redisMaster);
import fs from 'fs/promises'
export const  work_post = async(job)=>{
    try {
        let random_index_device = Math.floor(Math.random() * device_id_list.length);
        let device_id = device_id_list[random_index_device]
        let tiktok_id_video = ''
        if(job.data.url.includes('/video/')==true){
            tiktok_id_video = job.data.url.slice(job.data.url.lastIndexOf('video')+6,job.data.url.lastIndexOf('video')+6+19)
        }else{
            tiktok_id_video = job.data.url.slice(job.data.url.lastIndexOf('photo')+6,job.data.url.lastIndexOf('photo')+6+19)
        }
        const PARAMS = {
            aid: 1988,
            app_language: "vi-VN",
            app_name: "tiktok_web",
            browser_language: "en-US",
            browser_name: "Mozilla",
            browser_online: true,
            browser_platform: "Win32",
            browser_version: "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            channel: "tiktok_web",
            cookie_enabled: true,
            coverFormat: 2,
            device_id: device_id,
            device_platform: "web_pc",
            focus_state: true,
            from_page: "video",
            history_len: 3,
            is_fullscreen: false,
            is_page_visible: true,
            itemId: tiktok_id_video,
            language: "vi-VN",
            os: "windows",
            priority_region: "",
            referer: "",
            region: "VN",
            screen_height: 1080,
            screen_width: 1920,
            tz_name: "Asia/Saigon",
            webcast_language: "vi-VN",
        };
        
        const firstUrl = `https://www.tiktok.com/api/item/detail/?`;
        var signed_url = await signUrl(PARAMS,firstUrl)
        console.log(signed_url)
        let data = []
        for(let j=0;j<10;j++){
            let random_index = Math.floor(Math.random() * proxyList.length);
            let proxy = proxyList[random_index]
            let random_index_cookie_array = Math.floor(Math.random() * cookieString.length);
            let cookieAxios = cookieString[random_index_cookie_array]
            try {
                let res = await axiosApiLogin(signed_url,proxy,cookieAxios)
                data = res.data
                if(data.length!=0&&data.statusCode==0&&data.status_code==0){
                    if(data?.itemInfo?.itemStruct?.serverABVersions==undefined){
                        break
                    }
                } 
                logger.http(`reroll|${job.data.url}`)

            } catch (error) {
                logger.error(`reroll:${error}|${job.data.url}`)
                console.log(error.message)
            }
        }    
        const itemInfo= data?.itemInfo 
        const itemStruct = itemInfo?.itemStruct
        if(itemInfo!=undefined){
            let shardNumber = moment.unix(itemStruct.createTime).format("GGGGWW");
            let index = `master${shardNumber}`
            var dataUrl = {
                id:`${itemStruct.author.id}_${itemStruct.id}`,
                type:"tiktokTopic",
                index:index,
                siteId:itemStruct.author.id,
                siteName:itemStruct.author.uniqueId,
                insertedDate:new Date().toISOString(),
                publishedDate:new Date(itemStruct.createTime*1000).toISOString(),
                url: `https://www.tiktok.com/@${itemStruct.author.uniqueId}/video/${itemStruct.id}`,
                author: itemStruct.author.uniqueId,
                authorId: itemStruct.author.id,
                title: "",
                description: itemStruct.suggestedWords?.toString()?.replace(/\r?\n/g, " ").trim() ?? "",
                content: itemStruct.desc.replace(/\r?\n/g, " ").trim() ?? "",
                likes: parseInt(itemStruct.stats.diggCount) ?? 0,
                shares: parseInt(itemStruct.stats.shareCount) ?? 0,
                comments: parseInt(itemStruct.stats.commentCount) ?? 0,
                views: parseInt(itemStruct.stats.playCount) ?? 0,
                interactions: parseInt(itemStruct.stats.diggCount+itemStruct.stats.shareCount+itemStruct.stats.commentCount+itemStruct.stats.playCount),
                delayCrawler: "0",
                delayMongo: "0",
                delayEs: "0",
                ds: {
                    ip : "42.112.777.77",
                    source : "crawler-v7-tiktok-post-hotfix-v1"
                }
                }  
            logger.info(`${job.data.url}|Ok`)
            await fs.appendFile('./idPost.txt',dataUrl.id+"/n")
            await InsertBuzzes.add([dataUrl], { removeOnComplete: true });
            await TiktokTopicModel.create({...dataUrl,status:"ok"})
            queueCommentTT.add({...dataUrl,typeCrawl:"comment"},{  "attempts": 4 })
        }else{
            await TiktokTopicModel.create({url:job.data.url,status:"die"})
            logger.info(`${job.data.url}|die`)

        }

    return {status:'ok'}
    } catch (error) {
        await TiktokTopicModel.create({url:job.data.url,status:"die"})

        console.log(error)
        logger.error(`${job.data.url}|${error}`)
        return {status:'error'}
    }    
}


export const  work_post_short = async(job)=>{
    let url_short = ''
    try {
        for(let j=0;j<30;j++){
            let random_index = Math.floor(Math.random() * proxyList.length);
            let proxy = proxyList[random_index]
            let random_index_cookie_array = Math.floor(Math.random() * cookieString.length);
            let cookieAxios = cookieString[random_index_cookie_array]
            try {
                let res = await axiosApiLogin(job.data.url,proxy,cookieAxios)
                const html = res.data;
                const match = html.match(/"canonical"\s*:\s*"([^"]+)"/);
                const rawCanonical = match ? match[1] : null;
                url_short = rawCanonical.replace(/\\u002F/g, "/")
                if(url_short) break
                logger.http(`shortreroll|${job.data.url}`)
            } catch (error) {
                logger.error(`shortreroll:${error}|${job.data.url}`)
                console.log(error.message)
            }
        }    
        job.data.url = url_short
        let random_index_device = Math.floor(Math.random() * device_id_list.length);
        let device_id = device_id_list[random_index_device]
        let tiktok_id_video = ''
        if(job.data.url.includes('/video/')==true){
            tiktok_id_video = job.data.url.slice(job.data.url.lastIndexOf('video')+6,job.data.url.lastIndexOf('video')+6+19)
        }else{
            tiktok_id_video = job.data.url.slice(job.data.url.lastIndexOf('photo')+6,job.data.url.lastIndexOf('photo')+6+19)
        }
        const PARAMS = {
            aid: 1988,
            app_language: "vi-VN",
            app_name: "tiktok_web",
            browser_language: "en-US",
            browser_name: "Mozilla",
            browser_online: true,
            browser_platform: "Win32",
            browser_version: "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            channel: "tiktok_web",
            cookie_enabled: true,
            coverFormat: 2,
            device_id: device_id,
            device_platform: "web_pc",
            focus_state: true,
            from_page: "video",
            history_len: 3,
            is_fullscreen: false,
            is_page_visible: true,
            itemId: tiktok_id_video,
            language: "vi-VN",
            os: "windows",
            priority_region: "",
            referer: "",
            region: "VN",
            screen_height: 1080,
            screen_width: 1920,
            tz_name: "Asia/Saigon",
            webcast_language: "vi-VN",
        };
        
        const firstUrl = `https://www.tiktok.com/api/item/detail/?`;
        var signed_url = await signUrl(PARAMS,firstUrl)
        let data = []
        for(let j=0;j<30;j++){
            let random_index = Math.floor(Math.random() * proxyList.length);
            let proxy = proxyList[random_index]
            let random_index_cookie_array = Math.floor(Math.random() * cookieString.length);
            let cookieAxios = cookieString[random_index_cookie_array]
            try {
                let res = await axiosApiLogin(signed_url,proxy,cookieAxios)
                data = res.data
                if(data.length!=0&&data.statusCode==0&&data.status_code==0){
                    if(data?.itemInfo?.itemStruct?.serverABVersions==undefined){
                        break
                    }
                } 
                logger.http(`reroll|${job.data.url}`)

            } catch (error) {
                logger.error(`reroll:${error}|${job.data.url}`)
                console.log(error.message)
            }
        }    
        const itemInfo= data?.itemInfo 
        const itemStruct = itemInfo?.itemStruct
        if(itemInfo!=undefined){
            let shardNumber = moment.unix(itemStruct.createTime).format("GGGGWW");
            let index = `master${shardNumber}`
            var dataUrl = {
                id:`${itemStruct.author.id}_${itemStruct.id}`,
                type:"tiktokTopic",
                index:index,
                siteId:itemStruct.author.id,
                siteName:itemStruct.author.uniqueId,
                insertedDate:new Date().toISOString(),
                publishedDate:new Date(itemStruct.createTime*1000).toISOString(),
                url: `https://www.tiktok.com/@${itemStruct.author.uniqueId}/video/${itemStruct.id}`,
                author: itemStruct.author.uniqueId,
                authorId: itemStruct.author.id,
                title: "",
                description: itemStruct.suggestedWords?.toString()?.replace(/\r?\n/g, " ").trim() ?? "",
                content: itemStruct.desc.replace(/\r?\n/g, " ").trim() ?? "",
                likes: parseInt(itemStruct.stats.diggCount) ?? 0,
                shares: parseInt(itemStruct.stats.shareCount) ?? 0,
                comments: parseInt(itemStruct.stats.commentCount) ?? 0,
                views: parseInt(itemStruct.stats.playCount) ?? 0,
                interactions: parseInt(itemStruct.stats.diggCount+itemStruct.stats.shareCount+itemStruct.stats.commentCount+itemStruct.stats.playCount),
                delayCrawler: "0",
                delayMongo: "0",
                delayEs: "0",
                ds: {
                    ip : "42.112.777.77",
                    source : "crawler-v7-tiktok-post-hotfix-v1"
                }
                }  
            logger.info(`${job.data.url}|Ok`)
            await InsertBuzzes.add([dataUrl], { removeOnComplete: true });
            await TiktokTopicModel.create({...dataUrl,status:"ok"})
            queueCommentTT.add({...dataUrl,typeCrawl:"comment"},{  "attempts": 4 })
        }else{
            await TiktokTopicModel.create({url:job.data.url,status:"die"})
            logger.info(`${job.data.url}|die`)

        }

    return {status:'ok'}
    } catch (error) {
        await TiktokTopicModel.create({url:job.data.url,status:"die"})

        console.log(error)
        logger.error(`${job.data.url}|${error}`)
        return {status:'error'}
    }    
}
