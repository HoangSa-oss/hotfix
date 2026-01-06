import puppeteer from 'puppeteer-extra';
import { signUrl,axiosApiLogin,generateSearchId,signUrlKeyword,generateOdinId } from '../../../utils/tiktok.js';
import delay from 'delay';
import { cookieString } from '../../../resource/cookieString.js';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
import proxyList from '../../../resource/proxy.json'assert { type: 'json' }
import device_id_list from '../../../resource/deviceid.json'assert { type: 'json' }
import getLogger from '../../../utils/logger.js'


export const  search_keyword =  async (job)=>{
    const logger = getLogger(`tiktok_keyword`)
    try {
        let data_list_keyword = [] ;
        try {
            let conditionBreak = 0
            let random_index_device = Math.floor(Math.random() * device_id_list.length);
            let device_id = device_id_list[random_index_device]
            let search_id = generateSearchId()
            let random_index_cookie_array_page = Math.floor(Math.random() * cookieString.length);
            let  cookie = cookieString[random_index_cookie_array_page]
            for(let i=0;i<35;i++){
                const PARAMS ={
                        "WebIdLastTime": "1767581416",
                        "aid": "1988",
                        "app_language": "en",
                        "app_name": "tiktok_web",
                        "browser_language": "en-US",
                        "browser_name": "Mozilla",
                        "browser_online": "true",
                        "browser_platform": "Win32",
                        "browser_version": "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "channel": "tiktok_web",
                        "cookie_enabled": "true",
                        "count": "12",
                        "data_collection_enabled": "false",
                        "device_id": device_id,
                        "device_platform": "web_pc",
                        "focus_state": "false",
                        "from_page": "search",
                        "history_len": "5",
                        "is_fullscreen": "false",
                        "is_page_visible": "true",
                        "keyword": "Di Yến",
                        "odinId": generateOdinId(),
                        "offset": "48",
                        "os": "windows",
                        "priority_region": "",
                        "referer": "https://www.tiktok.com/",
                        "region": "VN",
                        "root_referer": "https://www.tiktok.com/",
                        "screen_height": "1080",
                        "screen_width": "1920",

                        "search_id": search_id,

                        "tz_name": "Asia/Bangkok",
                        "user_is_login": "true",

                        "web_search_code": {
                            "tiktok": {
                            "client_params_x": {
                                "search_engine": {
                                "ies_mt_user_live_video_card_use_libra": 1,
                                "mt_search_general_user_live_card": 1
                                }
                            },
                            "search_server": {}
                            }
                        },

                        "webcast_language": "en",

                        "msToken": "JI8XFvAiQ4RJwZRGjJMvUMTNNR95OvWyaIn74JWzAC-02aoShEeXGrih_eB0aHyL5r1BIpW8QOv_NUwDtSxtrwGs-A-u2mtZP1o-LH6JjGoH9xBSOBcsm4lwvG7wWb-WLT5TbL4DfDFIvrgJoZ95ZQ==",
                        }
                const firstUrl = `https://www.tiktok.com/api/search/item/full/?`
                let signed_url = await signUrlKeyword(PARAMS,firstUrl)   
                console.log(signed_url)
                let data_keyword = []
                for(let j =0;j<1;j++){
                    try {
                     
                        let random_index = Math.floor(Math.random() * proxyList.length);
                        let proxy = proxyList[random_index]
                        let res = await axiosApiLogin(signed_url,proxy,cookie)
                        data_keyword = res.data;
                        if(data_keyword.item_list!=undefined){
                            break
                        }
                        logger.http(`reroll|${job.data.keyword}|${i*12}`)

                    } catch (error) {
                        logger.http(`reroll|error|${job.data.keyword}|${i*12}`)
                        console.log(error.message)
                    }
                }
                if (data_keyword.has_more == 0||data_keyword.status_code==2484 ){
                    conditionBreak++
                }
                if(conditionBreak==2) break;
                if(data_keyword.item_list!=undefined&&data_keyword.item_list?.length!=0){
                    data_list_keyword.push(...data_keyword.item_list)
                }  
                }
        } catch (error) {
            console.log(error)
        }
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
