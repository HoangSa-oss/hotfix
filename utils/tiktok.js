import axios from 'axios'
import {createCipheriv } from 'crypto'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {HttpsProxyAgent} from 'https-proxy-agent'
import { encode } from './encode.js';
import crypto from "crypto";
import { readdir, rm, stat } from "fs/promises";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { userAgent } from '../configs/constant.js';

const generateVerifyFp = async()=> {
    var e = Date.now();
    var t = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split(
        ""
        ),
        e = t.length,
        n = Date.now().toString(36),
        r = [];
    (r[8] = r[13] = r[18] = r[23] = "_"), (r[14] = "4");
    for (var o = 0, i = void 0; o < 36; o++)
        r[o] ||
        ((i = 0 | (Math.random() * e)), (r[o] = t[19 == o ? (3 & i) | 8 : i]));
    return "verify_" + n + "_" + r.join("");
} 
const  xttparams= async(query_str) =>{
    query_str += "&is_encryption=1";
    const password = "webapp1.0+202106";
    // Encrypt query string using aes-128-cbc
    const cipher = createCipheriv("aes-128-cbc", password, password);
    return Buffer.concat([cipher.update(query_str), cipher.final()]).toString(
        "base64"
    );
}
const axiosApiLogin = async(signed_url,proxy,cookieString)=> {
    const response = await axios(signed_url, {
        timeout:30000,
        httpsAgent: new HttpsProxyAgent(proxy.proxy),
        headers:{
            "user-agent": userAgent,
            "cookie":cookieString
        }
      });
    return response
}
const signUrl = async (PARAMS,firstUrl)=>{
    const qsObject = new URLSearchParams(PARAMS) ;
    const qs = qsObject.toString();
    const unsignedUrl = `${firstUrl}${qs}`;
    const xGnarly  = encode(qs,"",userAgent)
    let signed_url = `${unsignedUrl}&X-Gnarly=${xGnarly}`
    return signed_url
}
const pageSign = async({page})=>{
    let LOAD_SCRIPTS = ["signer.js", "webmssdk.js", "xbogus.js"];
    LOAD_SCRIPTS.forEach(async (script) => {
    await page.addScriptTag({
        path: `${__dirname}/javascript/${script}`,
    });
    // console.log("[+] " + script + " loaded");
    });
    await page.evaluate(() => {
        window.generateSignature = function generateSignature(url) {
            if (typeof window.byted_acrawler.sign !== "function") {
            throw "No signature function found";
            }
            return window.byted_acrawler.sign({ url: url });
        };
        window.generateBogus = function generateBogus(params) {
            if (typeof window.generateBogus !== "function") {
            throw "No X-Bogus function found";
            }
            return window.generateBogus(params);
        };
        return this;
    });

}

function generateSearchId() {
  // Lấy timestamp hiện tại theo định dạng YYYYMMDDHHMMSS
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());

  // Tính độ dài phần random hex (để tổng là 32 ký tự)
  const randomHexLength = Math.floor((32 - timestamp.length) / 2);

  // Tạo chuỗi hex ngẫu nhiên
  const randomHex = crypto.randomBytes(randomHexLength).toString("hex").toUpperCase();

  // Ghép lại thành ID cuối
  const randomId = timestamp + randomHex;

  return randomId;
}


async function clearFolder(folderPath) {
  const files = await readdir(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const info = await stat(filePath);

    if (info.isDirectory()) {
      // Xoá toàn bộ folder con (đệ quy)
      await rm(filePath, { recursive: true, force: true });
    } else {
      // Xoá file thường
      await rm(filePath, { force: true });
    }
  }
}
function sanitizeCookies(rawCookies) {
  return rawCookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain?.replace(/^https?:\/\//, ""), // bỏ https:// nếu có
    path: c.path || "/",
    expires: typeof c.expires === "number" && c.expires > 0 ? c.expires : undefined,
    httpOnly: !!c.httpOnly,
    secure: !!c.secure,
    sameSite: ["Strict", "Lax", "None"].includes(c.sameSite) ? c.sameSite : undefined,
  }));
}
function extractJsonFromHtml(html, key) {
  const pattern = `"${key}":`;
  const start = html.indexOf(pattern);
  if (start === -1) return null;

  // Tìm dấu { đầu tiên sau key
  let i = start + pattern.length;
  while (html[i] && html[i] !== '{') i++;

  let braceCount = 0;
  let end = i;
  for (; end < html.length; end++) {
    if (html[end] === '{') braceCount++;
    else if (html[end] === '}') braceCount--;

    if (braceCount === 0 && end > i) break;
  }

  const jsonStr = html.slice(i, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error(`❌ Parse ${key} failed:`, e.message);
    return null;
  }
}

export {
  extractJsonFromHtml,
  sanitizeCookies,
  clearFolder,
  generateSearchId,
  pageSign,
  xttparams,
  signUrl,
  generateVerifyFp,
  axiosApiLogin,
}

