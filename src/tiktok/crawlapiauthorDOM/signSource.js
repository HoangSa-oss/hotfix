import puppeteer from 'puppeteer-extra';
import { signUrlByUrl,pageSign,signUrl,axiosApiCookie,signUrlSource } from '../utils/index.js';
import delay from 'delay';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import { nameBullMaster,RedisMaster,RedisLocal } from '../configs/constant.js';
import device_id_list from '../resource/deviceid.json'assert { type: 'json' }
import getLogger from '../utils/logger.js';
import Queue from 'bull';
const logger = getLogger('signHashtag')
const queueSignUrl = new Queue(nameBullMaster.bullTTSourceGetPost,RedisLocal)

export const signSource= async(job,pageToSignKeyword)=>{
    try {    
        await delay(3000)
        let secUid = job.data.source
        let cursor = 0

        for(let i=0;i<1;i++){
            let random_index_device = Math.floor(Math.random() * device_id_list.length);
            let device_id = device_id_list[random_index_device]
            const PARAMS = {
                aid: '1988',
                app_language: 'en',
                app_name: 'tiktok_web',
                browser_language: 'en-US',
                browser_name: 'Mozilla',
                browser_online: 'true',
                browser_platform: 'Win32',
                browser_version: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                channel: 'tiktok_web',
                cookie_enabled: 'true',
                count: '30',
                coverFormat: '2',
                cursor: cursor,
                data_collection_enabled: 'false',
                device_id: device_id,
                device_platform: 'web_pc',
                focus_state: 'true',
                history_len: '2',
                is_fullscreen: 'false',
                is_page_visible: 'true',
                language: 'en',
                os: 'windows',
                priority_region: '',
                referer: '',
                region: 'TH',
                screen_height: '1080',
                screen_width: '1920',
                secUid: secUid.trim(),
                tz_name: 'Asia/Bangkok',
                user_is_login: 'true',
                webcast_language: 'en',
            };
                const firstUrl = `https://www.tiktok.com/api/post/item_list/?`
                let signed_url = await signUrlSource({PARAMS,firstUrl,page:pageToSignKeyword})   
                queueSignUrl.add({...job.data,url:signed_url,offset:i*30})
                logger.info(`${JSON.stringify(job.data)}`)

        }

    } catch (error) {
        logger.error(`error:${error}|${JSON.stringify(job.data)}`)
        console.log(error)
        return error

    }
    return 
}


