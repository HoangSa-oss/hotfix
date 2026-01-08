import puppeteer from 'puppeteer-extra';
import { signUrl,axiosApiLogin,generateSearchId, signUrlByBrowser,sanitizeCookies } from '../../../utils/tiktok.js';
import delay from 'delay';
import { cookieString } from '../../../resource/cookieString.js';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import proxyList from '../../../resource/proxy.json'assert { type: 'json' }
import device_id_list from '../../../resource/deviceid.json'assert { type: 'json' }
import getLogger from '../../../utils/logger.js'
import { cookieSource } from '../../../resource/cookieSource.js';
import { pageSign } from '../../../utils/tiktok.js';
const logger = getLogger(`tiktok_keyword_sign_browser`)
import  {executablePath} from 'puppeteer'
import fs from 'fs'
import fsp from "fs/promises"; // alias để phân biệt rõ
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
export const  search_keyword_sign_browser =  async (job,pageToSign)=>{

    try {
        let data_list_keyword = [] ;
            let conditionBreak = 0
            let random_index_device = Math.floor(Math.random() * device_id_list.length);
            let device_id = device_id_list[random_index_device]
            let search_id = generateSearchId()
            let cookieRandom = Math.floor(Math.random() * cookieString.length)

            for(let i=0;i<40;i++){
                const PARAMS = {
                    aid: 1988,
                    app_language: 'en',
                    app_name: 'tiktok_web',
                    browser_language: 'en-US',
                    browser_name: 'Mozilla',
                    browser_online: true,
                    browser_platform: 'Win32',
                    browser_version: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    channel: 'tiktok_web',
                    cookie_enabled: true,
                    count: 20,
                    data_collection_enabled: true,
                    device_id: device_id,
                    device_platform: 'web_pc',
                    focus_state: true,
                    from_page:'search',
                    history_len: 4,
                    is_fullscreen: false,
                    is_page_visible: true,
                    keyword: job.data.keyword.trim(),
                    offset: i*20,
                    os: 'windows',
                    priority_region: 'VN',
                    referer: '',
                    region: 'TH',
                    screen_height: 1080,
                    screen_width: 1920,
                    search_id: search_id,
                    tz_name: 'Asia/Bangkok',
                    user_is_login: true,
                    web_search_code: '{"tiktok":{"client_params_x":{"search_engine":{"ies_mt_user_live_video_card_use_libra":1,"mt_search_general_user_live_card":1}},"search_server":{}}}',
                    webcast_language: 'en',
                }
                const firstUrl = `https://www.tiktok.com/api/search/item/full/?`
                let signed_url = await signUrlByBrowser({PARAMS,firstUrl,page:pageToSign})   
                let data_keyword = []
                for(let j =0;j<3;j++){
                    try {
                        let random_index = Math.floor(Math.random() * proxyList.length);
                        let proxy = proxyList[random_index]
                        let res = await axiosApiLogin(signed_url,proxy,cookieString[cookieRandom])
                        data_keyword = res.data;
                        console.log(data_keyword.item_list.length)
                        if(data_keyword.item_list!=undefined){
                            break
                        }
                        logger.http(`reroll|${job.data.keyword}|${i*12}|${JSON.stringify(data_keyword)}|${signed_url}`)

                    } catch (error) {
                        logger.http(`reroll|error|${job.data.keyword}|${i*12}`)
                        console.log(error.message)
                    }
                }
                if (data_keyword.has_more == 0||data_keyword.status_code==2484||data_keyword.length==0 ){
                    conditionBreak++
                }
                if(conditionBreak==2) break;
                if(data_keyword.item_list!=undefined&&data_keyword.item_list?.length!=0){
                    data_list_keyword.push(...data_keyword.item_list)
                }  
                }
        // } catch (error) {
        //     logger.error(`sign|error|${job.data.keyword}|${error}`)
        //     console.log(error)
        //     return {status:'error',message:error,data:[]}
        // }
        logger.info(`Done|${job.data.keyword}|${data_list_keyword.length}`)
        let data_return =  data_list_keyword.map((item)=>{
        return {
            url:`https://www.tiktok.com/@${item.author.uniqueId}/video/${item.id}`,
            date:item.createTime
        }})
        return {status:"oke",data:data_return}
    } catch (error) {
        console.log(error)  
        logger.error(`${job.data.keyword}|${error}`)
        return {status:'error',data:[]}
 
    } 
}

