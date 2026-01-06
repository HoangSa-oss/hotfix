import fs from "fs"
import fsp from 'fs/promises'
import Queue from "bull";
import {  redisMaster ,redisLocal,nameBull} from "../configs/constant.js";
import moment from "moment";
import {v4 as uuidv4}from 'uuid'

//                       

(async function(){
    //hashCommet = true thi lay comment
    //hashCommet = false thi chi lay only post
    //theo dinh dang  yyyy/mm/dd
    //neu lay toi hien tai thi cong them 1 ngay
                                    //yyyy/mm/dd
    const timeStart = parseInt(moment('2025/12/01').format('X'))
    const timeEnd = parseInt(moment('2026/01/30').format('X'))
    const queueKeywordYTB = new Queue(nameBull.YTBKeyword,redisLocal);
    const queueSourceYTB = new Queue(nameBull.YTBSource,redisLocal);
    const queueIdPostYTB = new Queue(nameBull.YTBIdPost,redisLocal);
    const queueCommentYTB = new Queue(nameBull.YTBCommnent, redisLocal);
    const queueKeywordTT = new Queue(nameBull.TTKeyword,redisLocal);
    const queueSourceTT = new Queue(nameBull.TTSource,redisLocal);
    const queueIdPostTT = new Queue(nameBull.TTIdPost,redisLocal);
    const queueCommentTT = new Queue(nameBull.TTComment, redisLocal);
    const uniqueId  = uuidv4()
    var data = fs.readFileSync('bull/bull.txt', 'utf8').split(/\r?\n/);
    await Promise.all(data.map(async (x)=>{
        if(x.includes('#')==true){
            await queueKeywordTT.add({hashtag:x.trim(),typeCrawl:"hashtag",timeStart,timeEnd,uniqueId})
            await queueKeywordTT.add({keyword:x.trim(),typeCrawl:"keyword",addQueued:0,timeStart,timeEnd,uniqueId })

            // await queueKeywordYTB.add({keyword:x.trim(),typeCrawl:"keyword",timeStart:new Date(timeStart*1000).toISOString(),timeEnd:new Date(timeEnd * 1000).toISOString(),uniqueId})

        }
        if(x.includes('video')==false&&x.includes('photo')==false&&x.includes('@')&&x.includes('tiktok')){
            queueKeywordTT.add({source:x.trim(),typeCrawl:"source",timeStart,timeEnd,uniqueId })
        }
        if(x.trim().length!=""&&x.length!=0&&x.includes('http')==false&&x.includes('#')==false&&x.includes('video')==false&&x.includes('photo')==false){
            await queueKeywordTT.add({keyword:x.trim(),typeCrawl:"keyword",timeStart,timeEnd,uniqueId,addQueued:0})

            // await queueKeywordYTB.add({keyword:x.trim(),typeCrawl:"keyword",timeStart:new Date(timeStart * 1000).toISOString(),timeEnd:new Date(timeEnd * 1000).toISOString(),uniqueId})
        }
        if((x.includes('tiktok')&&x.includes('video')==true)||(x.includes('http')&&x.includes('photo'))||x.includes('http')||(x.includes('tiktok')&&x.includes('video')==true)||(x.includes('tiktok')&&x.includes('photo')==true)){
            if(x.includes('vt.tiktok.com')||x.includes('vm.tiktok.com')){
                await queueIdPostTT.add({url:x.trim(),typeCrawl:"short" })
            }else{
                await queueIdPostTT.add({url:x.trim() })

            }
        }

        // if(x.includes('youtube')){
        //     queueSourceYTB.add({source:x.trim(),typeCrawl:"video",timeStart:new Date(timeStart * 1000 - (45 * 24 * 60 * 60 * 1000)).toISOString(),timeEnd:new Date(timeEnd * 1000).toISOString(),uniqueId })
        //     queueSourceYTB.add({source:x.trim(),typeCrawl:"post",timeStart:new Date(timeStart * 1000 - (45 * 24 * 60 * 60 * 1000)).toISOString(),timeEnd:new Date(timeEnd * 1000).toISOString(),uniqueId })

        // }
    })  )
    // await Promise.all(data.map(async (x)=>{
    //        if(x.includes('vt.tiktok.com')||x.includes('vm.tiktok.com')){
    //             await queueIdPostTT.add({url:x.trim(),typeCrawl:"short" })
    //         }else{
    //             await queueIdPostTT.add({url:x.trim() })

    //         }
    // })  )
    console.log('done')
})();