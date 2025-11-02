import mongoose from "mongoose";
import BaseModel from "../base.js"
const youtubeCommentSchema = new mongoose.Schema({
      id: String,
      index: String,
      type: String,
      publishedDate: Date,
      insertedDate: Date,
      author:String,
      authorId: String,
      content: String,
      description:String,
      parentDate: Date,
      parentId:String,
      likes:Number,
      shares: Number,
      comments: Number,
      interactions: Number,
      siteId: String,
      siteName: String,
      title: String,
      url:String,
      delayMongo:String,
      delayEs: String,
      delayCrawler: String,
      ds:  {
        ip : String,
        source : String
      },
     
  },{
    versionKey: false   // ✅ Không tạo __v
  });

export class YoutubeCommentModel extends BaseModel {
  constructor() {
    super("YoutubeComment", youtubeCommentSchema);
  }

}

// export instance (singleton)
export default new YoutubeCommentModel();