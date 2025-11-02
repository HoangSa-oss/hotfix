import dotenv from 'dotenv';
dotenv.config();
export default {
    mongoHost: process.env.MONGO_DEFAULT_HOST || 'localhost',
    mongoPort: process.env.MONGO_DEFAULT_PORT || '27017',
    mongoDbName: process.env.MONGO_DEFAULT_DB_NAME || 'tiktok_youtube',
    mongoUser: process.env.MONGO_DEFAULT_USER || '',
    mongoPass: process.env.MONGO_DEFAULT_PASS || '',
    concurrency_comment:parseInt(process.env.BULL_CONCURRENCY_COMMENT)||5,
    concurrency_post:parseInt(process.env.BULL_CONCURRENCY_POST)||70
};
