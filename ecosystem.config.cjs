module.exports = {
  apps : [
    {
      name   : "runYoutube",
      script : "run.js",
      cron_restart: "*/30 * * * *", 
    },
    {
      name   : "bullYoutube",
      script : "bull/bull.js",
       cron_restart: "0 */3 * * *", 
    },
    {
      name:"pushCommentYoutube",
      script:"pushcomment/index.js",
       cron_restart: "0 */3 * * *", 
    }
]
}
