

const redisMaster = {
    redis: {
        host: process.env.REDIS_HOST||'',
        port: process.env.REDIS_PORT||'',
        db: process.env.REDIS_DB||'',
        password: process.env.REDIS_PASSWORD||'',
    }
};
const redisLocal = 'redis://127.0.0.1:6379'
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const nameBull = {
    InsertBuzzes:`INSERT-BUZZES`,
    TTSource:`TT:SOURCE`,
    TTKeyword:`TT:KEYWORD`,
    TTIdPost:`TT:IDPOST`,
    TTComment:`TT:COMMENT`,
    TTCommentBig:`TT:COMMENTBIG`,
    YTBSource:`YTB:SOURCE`,
    YTBKeyword:`YTB:KEYWORD`,
    YTBIdPost:`YTB:IDPOST`,
    YTBCommnent:`YTB:COMMENT`
}
export{
    nameBull,
    redisMaster,
    redisLocal,
    userAgent
}