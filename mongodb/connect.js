import mongoose from "mongoose";
import configs from '../configs/index.js'
console.log(configs.mongoHost)
export async function connectDB({ 
    host = configs.mongoHost,
    port = configs.mongoPort,
    dbName = configs.mongoDbName,
  }={}) {

  try {
    await mongoose.connect(`mongodb://${host}:${port}/${dbName}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Kết nối MongoDB thành công!');
  } catch (err) {
    console.error('❌ Lỗi kết nối MongoDB:', err);
    process.exit(1);
  }
}

