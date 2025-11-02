import proxyList from '../../../resource/proxy.json'  assert { type: 'json' }
import { cookieString } from '../../../resource/cookieString.js';
import delay from 'delay'
import device_id_list from '../../../resource/deviceid.json'assert { type: 'json' }
import fs from 'fs/promises'
import { createLogger, format, transports } from 'winston'
import { axiosApiLogin ,signUrl} from '../../../utils/tiktok.js';
import getLogger from '../../../utils/logger.js';

export const get_hashtag = async(job)=>{
    const logger = getLogger('tiktok_hashtag')
    try {
        const data_list_hashtag = []
        let random_index_device = Math.floor(Math.random() * device_id_list.length);
        let device_id = device_id_list[random_index_device]
        let random_index_proxy = Math.floor(Math.random() * proxyList.length)
        let proxy = proxyList[random_index_proxy]
        let random_cookie_axios = Math.floor(Math.random() * cookieString.length);
        let cookie_axios = cookieString[random_cookie_axios]
        try {    
            const paramsChallengeID = {
                WebIdLastTime:"1740060071",
                aid:"1988",
                app_language:"en",
                app_name:"tiktok_web",
                browser_language:"en-US",
                browser_name:"Mozilla",
                browser_online:true,
                browser_platform:"Win32",
                browser_version:"5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.3",
                challengeName:job.data.hashtag.replace("#",''),
                channel:"tiktok_web",
                cookie_enabled:true,
                data_collection_enabled:true,
                device_id:device_id,
                device_platform:"web_pc",
                focus_state:true,
                from_page:"hashtag",
                history_len:11,
                is_fullscreen:false,
                is_page_visible:true,
                language:"en",
                os:"windows",
                priority_region:"VN",
                referer:"",
                region:"VN",
                root_referer:"",
                screen_height:1080,
                screen_width:1920,
                tz_name:"Asia/Bangkok",
                user_is_login:true,
                webcast_language:"en",
            } 
            const first_challengeID = 'https://www.tiktok.com/api/challenge/detail/?'
            const signed_url_challengeID = await signUrl(paramsChallengeID,first_challengeID)
            const res_challegedID = await axiosApiLogin(signed_url_challengeID,proxy,cookie_axios)
            if(!res_challegedID?.data?.challengeInfo?.challenge?.id){
                logger.info(`${job.data.hashtag}|No Data`)
                return {status:"ok",data:[]}
            }
            let challengeID = res_challegedID?.data?.challengeInfo?.challenge?.id
            console.log(challengeID)
            let conditionBreak = 0
            for(let i=0;i<1000;i++){
                let random_index_device = Math.floor(Math.random() * device_id_list.length);
                let device_id = device_id_list[random_index_device]
                const PARAMS = {
                    aid: 1988,
                    app_language: "en",
                    app_name: "tiktok_web",
                    browser_language:"en-US",
                    browser_name: "Mozilla",
                    browser_online: true,
                    browser_platform: "Win32",
                    browser_version: "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.3",
                    challengeID: challengeID,
                    channel: "tiktok_web",
                    cookie_enabled: true,
                    count: 30,
                    coverFormat: 2,
                    cursor: i*30,
                    device_id: device_id,
                    device_platform: "web_pc",
                    focus_state: false,
                    history_len: 3,
                    is_fullscreen: false,
                    is_page_visible: true,
                    
                    from_page: "hashtag",
                    language: "en",
                    os: "windows",
                    priority_region: ``,
                    referer: ``,
                    region: "VN",
                    screen_height: 1080,
                    screen_width: 1920,
                    tz_name: "Asia/Saigon",
                    webcast_language: "en",
                };
                const first_hashtag= `https://www.tiktok.com/api/challenge/item_list/?`
                let  signed_url_hashtag= await signUrl(PARAMS,first_hashtag,proxy)
                let data_hashtag = []
                for(let j=0;j<3;j++){
                        try {
                        
                            let random_index_proxy = Math.floor(Math.random() * proxyList.length);
                            let proxy = proxyList[random_index_proxy]
                            let random_cookie_axios = Math.floor(Math.random() * cookieString.length);
                            let cookie_axios = cookieString[random_cookie_axios]
                            let res = await axiosApiLogin(signed_url_hashtag,proxy,cookie_axios)

                            data_hashtag = res.data
                            // console.log(data)

                            if(data_hashtag?.itemList!=undefined){
                                logger.info(`${job.data.hashtag}|${data_hashtag.itemList.length}|${i*30}`)
                                break
                            }
                            logger.http(`reroll:${job.data.hashtag}|${i*30}`)

                        } catch (error) {
                            console.log(error)
                        }
                        
                }     
                
                if(data_hashtag.itemList!=undefined){
                    data_list_hashtag.push(...data_hashtag.itemList)
                }

                if(data_hashtag?.hasMore==false||data_hashtag?.hasMore==undefined||data_hashtag?.hasMore==null){
                    conditionBreak++
                }
                if(conditionBreak==2){
                    break
                }
        }  
        } catch (error) {
            logger.error(`error:${error}`)
            console.log(error)

        }
        let data_return = data_list_hashtag.map((item)=>{
            return {
                url:`https://www.tiktok.com/@${item.author.uniqueId}/video/${item.id}`,
                date:item.createTime
            }
        })
        return {status:'ok',data:data_return}

        } catch (error) {
            logger.error(`error:${error}`)
            console.log(error)
            return {status:'error'}

        }

}
