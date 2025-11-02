import mongoose from "mongoose";
import BaseModel from "../base.js"
const tiktokTopicSchema = new mongoose.Schema({
      id: String,
      type: String,
      index: String,
      siteId: String,
      siteName: String,
      insertedDate: String,
      publishedDate: String,
      url: String,
      author: String,
      authorId: String,
      title: String,
      description: String,
      content: String,
      delayCrawler:String,
      likes: Number,
      shares: Number,
      comments:Number,
      views: Number,
      interactions: Number,
      delayMongo: String,
      delayEs: String,
      ds:{
        ip:String,
        source:String
      },
      status:String,
  },{
    versionKey: false   // ✅ Không tạo __v
  });
class TiktokTopicModel extends BaseModel {
  constructor() {
    super("TiktokTopic", tiktokTopicSchema);
  }
}
export default new TiktokTopicModel();