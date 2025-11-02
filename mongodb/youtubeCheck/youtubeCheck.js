import mongoose from "mongoose";
import BaseModel from "../base.js"
const youtubeCheckSchema = new mongoose.Schema({
      id:{type:String,  index:true},
      date:Date,
      uniqueId:String
  },{
    versionKey: false   // ✅ Không tạo __v
  });
class YoutubeCheckModel extends BaseModel {
  constructor() {
    super("YoutubeCheck", youtubeCheckSchema);
  }
}
export default new YoutubeCheckModel();