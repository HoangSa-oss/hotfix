import mongoose from "mongoose";
import BaseModel from "../base.js"
const tiktokCommentSchema = new mongoose.Schema({
        id :String  ,                                       
    type : String ,
    index : String ,
    siteId : String ,
    siteName : String ,
    insertedDate: String ,
    publishedDate : String ,
    url : String ,
    author : String ,
    authorId : String ,
    title :String ,                                                
    description:String ,
    content : String ,
    parentDate : String ,
    parentId : String ,
    likes : Number,
    shares : Number ,
    comments :Number ,
    interactions: Number ,
    delayMongo : String ,
    delayEs : String ,
    delayCrawler :String ,
    ds:{
        ip:String,
        source:String
    }
  },{
    versionKey: false   // ✅ Không tạo __v
  });
class TiktokCommentModel extends BaseModel {
  constructor() {
    super("TiktokComment", tiktokCommentSchema);
  }
}
export default new TiktokCommentModel();