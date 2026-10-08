const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
 testDir:'./tests/browser',timeout:45000,expect:{timeout:15000},retries:1,workers:1,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:8765',browserName:'chromium',headless:true,acceptDownloads:true,trace:'retain-on-failure'},
 webServer:{command:'python3 -m http.server 8765 --bind 127.0.0.1',url:'http://127.0.0.1:8765/index.html',reuseExistingServer:!process.env.CI,timeout:20000}
});
