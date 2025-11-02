import mongoose from "mongoose";
import BaseModel from "../base.js"
const youtubeTopicSchema = new mongoose.Schema({
    id:{type: String, unique: true, index: true},
    type:String,
    index:String,
    siteId:String,
    siteName:String,
    insertedDate:Date,
    publishedDate:Date,
    url: String,
    author: String,
    authorId: String,
    title: String,
    description: String,
    content: String,
    likes: Number,
    shares:Number,
    comments: Number,
    views: Number,
    interactions:Number,
    delayCrawler:String,
    delayMongo: String,
    delayEs:String,
    ds: {
        ip : String,
        source : String
    },
    dataForComment:mongoose.Schema.Types.Mixed
  },{
    versionKey: false   // ✅ Không tạo __v
  });

export class YoutubeTopicModel extends BaseModel {
  constructor() {
    super("YoutubeTopic", youtubeTopicSchema);
  }

}

// export instance (singleton)
export default new YoutubeTopicModel();