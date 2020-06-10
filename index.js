/*
 * 借助阿里云 DNS 服务实现 DDNS（动态域名解析）
 * https://help.aliyun.com/document_detail/29739.html
 */
const crypto = require('crypto');
const axios = require('axios');
const uuidv1 = require('uuid/v1');

const schedule = require('node-schedule');

const { AccessKey, AccessKeySecret, Domain, DomainName, Type, RRs } = require('./config.json');

const HttpInstance = axios.create({
	baseURL: 'https://alidns.aliyuncs.com/',
	headers: {
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
	}
});
const IpApis = ["http://api.ipify.org/", "http://ifconfig.me/ip"];

// 阿里云公共请求参数
const CommonParam={
	Format: 'JSON',
	Version: '2015-01-09',
	AccessKeyId: AccessKey,
	SignatureMethod: 'HMAC-SHA1',
	Timestamp: new Date().toISOString(),
	SignatureVersion: '1.0',
	SignatureNonce: uuidv1()
}
const getCurrentTime=()=>{
	return new Date().toLocaleString();
}

Exec();

// 每天6点执行
schedule.scheduleJob('0 0 10 * * * ', function () {
	Exec();
});


async function Exec() {
	console.log(getCurrentTime(), '正在更新DNS记录 ...');
	let ip;
	for (let url of IpApis) {
		ip = await getExternalIP(url);
		if (ip)
			break;
	}

	if (!ip) return;

	console.log(getCurrentTime(), '当前外网 ip:', ip);
	let records;
	if (Domain)
		records = await getDomainInfo();
	else if (DomainName)
		records = await getDomainInfos();
	else {
		console.log("请输入域名");
		return;
	}

	if (records.length === 0) {
		if (Domain) {
			console.log(getCurrentTime(), '记录不存在，新增中 ...');
			await addRecord(ip);
			return console.log(getCurrentTime(), '成功, 当前 dns 指向: ', ip);
		}
		else return;
	}

	for (let record of records) {
		if (record.Status.toUpperCase() !== "ENABLE") continue;
		if(RRs&&RRs.length>0&&!RRs.includes(record.RR)) continue;

		const recordValue = record.Value;
		console.log(record.RR);
		if (recordValue === ip) {
			console.log(getCurrentTime(), `主机${record.RR}记录一致, 无修改`);
		}
		else {
			await updateRecord(record, ip)
			console.log(getCurrentTime(), `成功,主机${record.RR} dns 指向: ${ip}`);
		}
	}
}

// 新增记录
function addRecord(ip) {
	return new Promise((resolve, reject) => {

		const requestParams = sortJSON({
			Action: 'AddDomainRecord',
			DomainName: Domain.match(/\.(.*)/)[1],
			RR: Domain.match(/(.*?)\./)[1],
			Type: 'A',
			Value: ip,
			...CommonParam,
			Timestamp: new Date().toISOString()
		});
		const Signature = sign(requestParams);
		HttpInstance.get('/', {
			params: Object.assign({
				Signature
			}, requestParams)
		})
			.then(res => {
				resolve(res.data);
			})
			.catch(e => {
				reject(e);
			})
	});
}

// 更新记录
async function  updateRecord(record, ip) {
	return new Promise((resolve, reject) => {
		const requestParams = sortJSON({
			Action: 'UpdateDomainRecord',
			RecordId: record.RecordId,
			RR: record.RR,
			Type: 'A',
			Value: ip,
			...CommonParam,
			Timestamp: new Date().toISOString()
		});
		const Signature = sign(requestParams);
		HttpInstance.get('/', {
			params: Object.assign({
				Signature
			}, requestParams)
		})
			.then(res => {
				resolve(res.data);
			})
			.catch(e => {
				reject(e);
			})
	});
}
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
		console.err("ip获取失败")
		return null;
	}
}

// 获取当前解析记录
function getDomainInfo() {
	return new Promise((resolve, reject) => {
		const requestParams = sortJSON({
			Action: 'DescribeSubDomainRecords',
			SubDomain: Domain,
			PageSize: 100,
			...CommonParam,
			Timestamp: new Date().toISOString()
		});
		const Signature = sign(requestParams);
		HttpInstance.get('/', {
			params: Object.assign({
				Signature
			}, requestParams)
		})
			.then(res => {
				resolve(res.data.DomainRecords.Record);
			})
			.catch(e => {
				reject(e);
			})
	});
}


// 获取当前解析记录
function getDomainInfos() {
	return new Promise((resolve, reject) => {
		const requestParams = sortJSON({
			Action: 'DescribeDomainRecords',
			DomainName: DomainName,
			PageSize: 100,
			Type,
			...CommonParam,
			Timestamp: new Date().toISOString()
		});
		const Signature = sign(requestParams);
		HttpInstance.get('/', {
			params: Object.assign({
				Signature
			}, requestParams)
		})
			.then(res => {
				resolve(res.data.DomainRecords.Record);
			})
			.catch(e => {
				reject(e);
			})
	});
}

// 阿里云签名https://help.aliyun.com/document_detail/29747.html?spm=a2c4g.11186623.6.628.67942b73m91J5r
function sign(object) {
	const hmac = crypto.createHmac('sha1', AccessKeySecret + '&');
	const temp = [];
	Object.keys(object).forEach(item => {
		temp.push(`${encodeURIComponent(item)}=${encodeURIComponent(object[item])}`);
	})
	const sourceStr = 'GET&%2F&' + encodeURIComponent(temp.join('&'));
	const result = hmac.update(sourceStr).digest('base64');
	return result;
}
// json 字典顺序排序
function sortJSON(object) {
	const result = {};
	const keys = Object.keys(object);
	keys.sort();
	keys.forEach(item => {
		result[item] = object[item];
	})
	return result;
}