import { BullAdapter } from '@bull-board/api/bullAdapter';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import Queue from 'bull';
import express from 'express';
import {  redisMaster ,redisLocal,nameBull} from "./configs/constant.js";
const app = express();
const queueKeywordYTB = new Queue(nameBull.YTBKeyword,redisLocal);
const queueSourceYTB = new Queue(nameBull.YTBSource,redisLocal);
const queueIdPostYTB = new Queue(nameBull.YTBIdPost,redisLocal);
const queueCommentYTB = new Queue(nameBull.YTBCommnent, redisLocal);
const queueKeywordTT = new Queue(nameBull.TTKeyword,redisLocal);
const queueCommentTTBig = new Queue(nameBull.TTCommentBig,redisLocal);
const queueIdPostTT = new Queue(nameBull.TTIdPost,redisLocal);
const queueCommentTT = new Queue(nameBull.TTComment, redisLocal);
const insertGetUrl = new Queue(nameBull.InsertBuzzes, redisLocal);

const serverAdapter = new ExpressAdapter();
createBullBoard({
    queues: [
        new BullAdapter(queueKeywordYTB),
        new BullAdapter(queueSourceYTB),
        new BullAdapter(queueIdPostYTB),
        new BullAdapter(queueCommentYTB),
        new BullAdapter(queueKeywordTT),
        new BullAdapter(queueIdPostTT),
        new BullAdapter(queueCommentTT),
        new BullAdapter(queueCommentTTBig),
        new BullAdapter(insertGetUrl),

    ]
    ,
  serverAdapter,
});

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());

app.listen(3004, () => {
  console.log('Bull Board running on http://localhost:3004/admin/queues');
});