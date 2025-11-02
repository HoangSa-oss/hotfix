import { createLogger, format, transports, addColors } from 'winston';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';

const { printf, colorize } = format;

// 🎨 Định nghĩa level + màu
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    debug: 5,
    trace: 6,
  },
  colors: {
    fatal: 'magenta',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'cyan',
    debug: 'blue',
    trace: 'gray',
  },
};

addColors(customLevels.colors);

// 🔹 Timestamp GMT+7
const timestamp = () => moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');

// 🔹 Level filter chuẩn
const levelFilter = (targetLevel) =>
  format((info) => (info.level === targetLevel ? info : false))();

// 🔹 Factory tạo logger cho từng module
export function getLogger(moduleName) {
  const logDir = path.join('logs', moduleName);
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  // Transport file cho từng level
  const levelTransports = Object.keys(customLevels.levels).map((level) => {
    return new transports.File({
      filename: path.join(logDir, `${level}.log`),
      maxsize: 200 * 1024 * 1024, // 200MB
      maxFiles: 3,
      tailable: true,
      format: format.combine(
        levelFilter(level), // chỉ ghi đúng level
        printf(({ level, message }) => `${timestamp()} [${moduleName}] [${level.toUpperCase()}]: ${message}`)
      )
    });
  });

  // Logger
  return createLogger({
    levels: customLevels.levels,
    level: 'trace', // ghi tất cả level
    defaultMeta: { module: moduleName },
    transports: [
      // Console màu
      // new transports.Console({
      //   level: 'trace',
      //   format: format.combine(
      //     colorize({ all: true }),
      //     printf(({ level, message }) => `${timestamp()} [${moduleName}] [${level.toUpperCase()}]: ${message}`)
      //   )
      // }),
      // File từng level
      ...levelTransports,
      // File tổng hợp tất cả level
      // new transports.File({
      //   filename: path.join(logDir, 'combined.log'),
      //   format: printf(({ level, message }) => `${timestamp()} [${moduleName}] [${level.toUpperCase()}]: ${message}`)
      // })
    ]
  });
}
export default getLogger