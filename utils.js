const axios = require('axios');

// 获取本机外网 ip 地址
async function getExternalIP(url) {
    try {
        const res = await axios.get(url, {
            timeout: 30 * 1000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
            }
        });
        return res.data.replace('\n', '');
    } catch (err) {
        console.err("ip获取失败");
        sendMsg(err.message || err);
        return null;
    }
}
module.exports = {
    getIp: async () => {
        const IpApis = ["http://api.ipify.org/", "http://ifconfig.me/ip"];

        let ip;
        for (let url of IpApis) {
            ip = await getExternalIP(url);
            if (ip)
                break;
        }

        if (!ip) {
            sendMsg("本机ip获取失败");
            return;
        }

        return ip
    }
}