import {createClient} from 'redis'
import {v4 as uuidv4}from 'uuid'
import Queue from "bull";
import delay from "delay";
import { redisLocal,nameBull } from '../../../../configs/constant.js';

const queueCommentBig = new Queue(nameBull.TTCommentBig, redisLocal);   
const queueComment =   new Queue(nameBull.TTComment, redisLocal);

export const  bullCommentbig = async()=>{
    const client = createClient({
        socket: {
            host: "127.0.0.1",
            port: 6379,
        },
    });
    client.on('ready', () => console.log('✅ Connected to Redis!'));
    client.on('error', (err) => console.error('❌ Redis error:', err));
    await client.connect();
    try {
        process.setMaxListeners(0);
                // let random_index = Math.floor(Math.random() * proxyList.length);
                // var proxy = proxyList[random_index]
             queueComment.process(2,async (job,done)=>{
               
                if(job.data.typeCrawl=="comment"){
                    console.log(job.data.url)
                    const cursorStart = 0
                    const uniqueId  = uuidv4()
                    await client.set(`comment:${nameBull.TTCommentBig}:${uniqueId}:${job.data.url}`,0)                
                    for(let i=cursorStart;i<10000000;i=i+50){
                        console.log(i)
                        await queueCommentBig.add({...job.data,uniqueId,cursor:i,typeCrawl:"comment"},{ priority: 3 })
                        const commentBigCheck = await client.get(`comment:${nameBull.TTCommentBig}:${uniqueId}:${job.data.url}`)
                        if(commentBigCheck>15){
                            console.log('done')
                            break;
                        }

                        await delay(30)
                    }         
                }
                if(job.data.typeCrawl=="reply"){
                    await queueCommentBig.add(job.data,{ priority: 3 })
                }
                done();            
 })
    } catch (error) {
        console.log(error.message)
    }
   
}

