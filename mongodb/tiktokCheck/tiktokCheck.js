import mongoose from "mongoose";
import BaseModel from "../base.js"
const tiktokCheckSchema = new mongoose.Schema({
      url:{type:String,  index:true},
      date:Number,
      uniqueId:String
  },{
    versionKey: false   // ✅ Không tạo __v
  });
class TiktokCheckModel extends BaseModel {
  constructor() {
    super("TiktokCheck", tiktokCheckSchema);
  }
}
export default new TiktokCheckModel();