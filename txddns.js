// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher
const tencentcloud = require("tencentcloud-sdk-nodejs");
const { getIp } = require("./utils");
const schedule = require('node-schedule');

const { TXSecretId, TXSecretKey } = require('./config.json');


const DnspodClient = tencentcloud.dnspod.v20210323.Client;
const clientConfig = {
    credential: {
        secretId: TXSecretId,
        secretKey: TXSecretKey,
    },
    region: "",
    profile: {
        httpProfile: {
            endpoint: "dnspod.tencentcloudapi.com",
        },
    },
};
const client = new DnspodClient(clientConfig);
const params = {
    // 这里写上你的域名
    "Domain": "dodream.cn"
};



exec()

// 每天6点执行
schedule.scheduleJob('0 0 10 * * * ', function () {
    exec();
});

async function exec() {
    try {
        const ip = await getIp()
        console.log('ip: ', ip);
        const data = await client.DescribeRecordList(params);

        for (const record of data.RecordList) {
            if (record.Name === 'n1') {
                if (record.Value === ip) {
                    console.info('无需修改');
                    return
                }

                const params2 = {
                    RecordId: record.RecordId,
                    "SubDomain": "n1",
                    "RecordType": "A",
                    "RecordLine": "默认",
                    "Domain": "dodream.cn",
                    "Value": ip,

                };

                const result = await client.ModifyRecord(params2)

                console.log('result: ', result);
                break
            }
        }

    } catch (err) {
        console.log('err: ', err);
    }
}