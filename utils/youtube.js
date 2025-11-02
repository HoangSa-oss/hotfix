import axios from 'axios'
import {HttpsProxyAgent} from 'https-proxy-agent'
import vm from "node:vm";
import moment from 'moment';



const axiosProxy = async(url,proxy)=> {
  try{
    const response = await axios(url, {
        timeout:10000,
        httpsAgent: new HttpsProxyAgent(proxy.proxy),
    });
    return response
  }catch(error){
    return error
  }
    
}
const axiosPostProxy = async(url,payload,proxy)=> {
    const response = await axios.post(url, payload, {
        timeout:10000,
        httpsAgent: new HttpsProxyAgent(proxy.proxy),
      });
    return response
}
function extractJsObjectBlock(source, varName) {
  // Cho phép có hoặc không dấu ngoặc kép
  const regex = new RegExp(`["']?${varName}["']?\\s*[:=]\\s*\\{`);
  const match = source.match(regex);
  if (!match) return null;

  const start = match.index;
  const braceStart = source.indexOf('{', start);
  if (braceStart === -1) return null;

  // Đếm ngoặc
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (depth === 0 && i > braceStart) {
      return source.slice(start, i + 1).trim();
    }
  }

  return null;
}
function parseJsObject(block) {
  try {
    const start = block.indexOf('{');
    const end = block.lastIndexOf('}');
    const objText = block.slice(start, end + 1);
    return vm.runInNewContext('(' + objText + ')');
  } catch {
    return null;
  }
}

function findValuesByKey(obj, targetKey, results = []) {
  if (typeof obj !== "object" || obj === null) return results;

  for (const key in obj) {
    const val = obj[key];

    if (key === targetKey) {
      results.push(val);
    }

    if (typeof val === "object") {
      findValuesByKey(val, targetKey, results);
    }
  }

  return results;
}
const dataToMasterTopic = (data)=>{
    let shardNumber = moment(data.publishedDate).format("GGGGWW");
    let index = `master${shardNumber}`
    return {
        id:data.id,
        type:data.type,
        index:index,
        siteId:data.siteId,
        siteName:data.siteName,
        insertedDate:new Date().toISOString(),
        publishedDate:data.publishedDate,
        url: data.url,
        author: data.author,
        authorId: data.authorId,
        title: data.title,
        description: data.description.replace(/\r?\n/g, " ").trim() ?? "",
        content: data.content.replace(/\r?\n/g, " ").trim() ?? "",
        likes: parseInt(data.likes),
        shares: parseInt(data.shares),
        comments: parseInt(data.comments),
        views: parseInt(data.views),
        interactions:parseInt(data.likes)+ parseInt(data.shares)+parseInt(data.comments)+parseInt(data.views),
        delayCrawler: "0",
        delayMongo: "0",
        delayEs: "0",
        ds: data.ds
    }
}
const dataToMasterComment = (data)=>{
    let shardNumber = moment(data.publishedDate).format("GGGGWW");
    let index = `master${shardNumber}`
    return {
        ...data,
        index:index,
        insertedDate:new Date().toISOString(),
        interactions:parseInt(data.likes)+ parseInt(data.shares)+parseInt(data.comments),
    }
}
function parseNumberShort(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;

  str = str.toString().trim().toLowerCase();

  const multipliers = {
    k: 1000,
    n: 1000,
    m: 1000000,
    tr: 1000000,
    b: 1000000000,
    t: 1000000000
  };

  // Tìm ký tự cuối cùng (nếu là k/m/b thì nhân)
  const lastChar = str[str.length - 1];
  const num = parseFloat(str);

  if (multipliers[lastChar]) {
    return num * multipliers[lastChar];
  }

  return num;
}
function hasTimeWord(str) {
  return /(ngày|giờ|phút|giây)/i.test(str);
}
function parseRelativeTime(str) {
  try {
    const now = new Date();
    const lower = str?.toLowerCase().trim();

    // Gom nhóm từ khóa tiếng Việt & tiếng Anh
    const regex = /(\d+)\s*(giây|second|seconds|phút|minute|minutes|giờ|hour|hours|ngày|day|days|tuần|week|weeks|tháng|month|months|năm|year|years)/i;
    const match = lower.match(regex);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];
    const result = new Date(now);

    switch (unit) {
      case "giây":
      case "second":
      case "seconds":
        result.setSeconds(now.getSeconds() - value);
        break;

      case "phút":
      case "minute":
      case "minutes":
        result.setMinutes(now.getMinutes() - value);
        break;

      case "giờ":
      case "hour":
      case "hours":
        result.setHours(now.getHours() - value);
        break;

      case "ngày":
      case "day":
      case "days":
        result.setDate(now.getDate() - value);
        break;

      case "tuần":
      case "week":
      case "weeks":
        result.setDate(now.getDate() - value * 7);
        break;

      case "tháng":
      case "month":
      case "months":
        result.setMonth(now.getMonth() - value);
        break;

      case "năm":
      case "year":
      case "years":
        result.setFullYear(now.getFullYear() - value);
        break;
    }

    return result.toISOString();
  } catch (error) {
    return undefined;
  }
}
function extractYtInitialPlayerResponse(html) {
  const start = html.indexOf('var ytInitialPlayerResponse =');
  if (start === -1) return null;

  const jsonStart = html.indexOf('{', start);
  if (jsonStart === -1) return null;

  let depth = 0;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') depth--;

    if (depth === 0) {
      const jsonText = html.slice(jsonStart, i + 1);
      try {
        return JSON.parse(jsonText);
      } catch (e) {
        return null;
      }
    }
  }

  return null;
}
function extractYtJson(html, varName) {
  try {
    // Regex bắt toàn bộ JSON giữa varName = {...};
    const regex = new RegExp(`var ${varName}\\s*=\\s*(\\{[\\s\\S]*?\\});\\s*<\\/script>`);
    const match = html.match(regex);

    if (!match) {
      console.warn(`⚠️ Không tìm thấy biến '${varName}' trong HTML`);
      return null;
    }

    let jsonStr = match[1];

    // Một số HTML có dấu "," dư hoặc ký tự không hợp lệ → cắt tỉa
    jsonStr = jsonStr
      .replace(/(\r|\n)/g, "")   // bỏ xuống dòng
      .replace(/;$/, "");        // bỏ dấu ; cuối

    try {
      return JSON.parse(jsonStr);
    } catch (err) {
      // Nếu JSON lỗi (ví dụ chứa ký tự không hợp lệ), in ra vị trí lỗi
      console.error(`❌ Parse '${varName}' failed: ${err.message}`);
      return null;
    }

  } catch (error) {
    console.error(`❌ extractJSVariableFromHTML error:`, error.message);
    return null;
  }
}
export {
  extractYtJson,
    dataToMasterComment,
    parseRelativeTime,
    hasTimeWord,
    parseJsObject,
    extractJsObjectBlock,
    axiosProxy,
    findValuesByKey,
    axiosPostProxy,
    dataToMasterTopic,
    parseNumberShort
}