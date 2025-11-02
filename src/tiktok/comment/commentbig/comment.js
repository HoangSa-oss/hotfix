
        
import proxyList from '../../../../resource/proxy.json'  assert { type: 'json' }
import Queue from 'bull'
import { cookieString } from '../../../../resource/cookieString.js';
import delay from 'delay'
import fs from 'fs/promises'
import { redisLocal,nameBull, redisMaster } from '../../../../configs/constant.js';
import moment from 'moment';
import { axiosApiLogin ,signUrl} from '../../../../utils/tiktok.js';
import TiktokCommentModel from '../../../../mongodb/tiktokComment/tiktokComment.js';
import getLogger from '../../../../utils/logger.js';
import { Buffer } from 'buffer';
import _ from 'lodash'
import axios from 'axios';
import {createClient} from 'redis'

const InsertBuzzes = new Queue(nameBull.InsertBuzzes, redisMaster);
const queueCommentBig = new Queue(nameBull.TTCommentBig, redisLocal);   

const logger =getLogger('tiktok_commentbig')
const client = createClient({
            socket: {
                host: "127.0.0.1",
                port: 6379,
            },
});
client.on('ready', () => console.log('✅ Connected to Redis!'));
client.on('error', (err) => console.error('❌ Redis error:', err));
await client.connect();
export const  workcommentbig =  async(job)=>{
    try {
    
       
        let tiktok_id_video = job.data.url.slice(job.data.url.lastIndexOf('video')+6,job.data.url.lastIndexOf('video')+6+19)
        let conditionBreak = 0
            let signed_url = `https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=${tiktok_id_video}&count=50&cursor=${job.data.cursor}`
            for(let j=0;j<50;j++){
                let random_index = Math.floor(Math.random() * proxyList.length);
                var proxy = proxyList[random_index]
                let random_cookie_axios = Math.floor(Math.random() * cookieString.length);
                let cookieAxios = cookieString[random_cookie_axios]
                try {
                    const res = await axiosApiLogin(signed_url,proxy,cookieAxios)
                    var {data ,status} = res
                    if(data.length!=0&&status==200){
                        break
                    }
                    logger.http(`reroll:${job.data.url}|${job.data.cursor}|${JSON.stringify(data)}`)
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                // ✅ Lỗi của Axios
                        console.error("Axios Error RerollComment:", error.message);
                    } else {
                        // ❌ Lỗi khác (code JS, v.v.)
                        console.error("Other Error RerollComment:", error);
                    }
                    logger.error(`${job.data.url}|${error}|${job.data.cursor}`)

                }
            }  
            const {comments,has_more,total} = data ?? {}
            if(comments!=undefined && comments.length!=0){
                conditionBreak = 0
                let arrayComment = []
                for(const item of comments){
                    let shardNumber = moment.unix(item.create_time).format("GGGGWW");
                    let index = `master${shardNumber}`
                        let insert = {
                            id :`${item.aweme_id}_${item.cid}`   ,                                       
                            type : "tiktokComment",
                            index : index,
                            siteId : job.data.siteId,
                            siteName : job.data.siteName,
                            insertedDate: new Date().toISOString(),
                            publishedDate :new Date(item.create_time*1000).toISOString(),
                            url : `${job.data.url}?cid=${Buffer.from(item.cid).toString('base64').replaceAll('=','')}`,
                            author : item.user.nickname,
                            authorId : item.user.unique_id,
                            title :job.data?.content,                                                
                            description:job.data?.description,
                            content : item.text.replace(/\r?\n/g, " ").trim(),
                            parentDate : job.data?.publishedDate,
                            parentId : job.data.id,
                            likes : parseInt(item.digg_count)?? 0,
                            shares : parseInt("0")?? 0,
                            comments : parseInt(item.reply_comment_total)?? 0,
                            interactions : parseInt(item.digg_count+item.reply_comment_total),
                            delayMongo : "0",
                            delayEs : "0",
                            delayCrawler : "0",
                            ds: {
                                ip : "42.112.777.77",
                                source : "crawler-v7-tiktok-commentbig-hotfix-v1"
                            }
                        }
                        await TiktokCommentModel.create(insert)
                        arrayComment.push(insert)
                        if(insert.comments>0){
                            await queueCommentBig.add({  
                                cid:item.cid,
                                aweme_id:item.aweme_id,
                                siteId:insert.siteId,
                                siteName:insert.siteName,
                                description:insert.description,
                                parentDate:insert.parentDate,
                                parentId:insert.parentId,
                                urlPost:job.data.url,
                                title :job.data?.content,
                                typeCrawl:"reply"
                            },{  priority: 4  })
                        }
                }
                logger.info(`${job.data.url}|${arrayComment.length}|${job.data.cursor}`)

                const arrayAddQueue =  _.chunk(arrayComment,10)
                for(const x of arrayAddQueue){
                    await InsertBuzzes.add(x, { removeOnComplete: true });  
                }

            }  
            if(has_more==undefined||total==0||comments==undefined||comments==null||comments.length==0){
                console.log(JSON.stringify(data)+":"+signed_url)
                await client.incr(`comment:${nameBull.TTCommentBig}:${job.data.uniqueId}:${job.data.url}`)
            }
    } catch (error) {
        logger.error(`${job.data.url}|${error}`)
              if (axios.isAxiosError(error)) {
    // ✅ Lỗi của Axios
            console.error("Axios Error Comment:", error.message);
        } else {
            // ❌ Lỗi khác (code JS, v.v.)
            console.error("Other Error:", error);
        }
    }    
}

