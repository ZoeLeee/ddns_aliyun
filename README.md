ALIYUN-DDNS
===============

借助阿里云解析的API实现二级 DDNS。

## 说明

获取本机的IP地址，然后根据阿里提供的api，获取域名的解析ip，比对如果不一致，修改该域名的解析ip

## 前提

* 域名在阿里云解析

* NodeJS

* 部署机器有外网 IP

## 部署

* 从阿里云获取 [AccessKey AccessKeySecret](https://ak-console.aliyun.com/#/accesskey)

* 拷贝一份配置文件 `cp config.json.sample config.json`

* 在 `config.json` 中填入相应字段

* 运行 

## 其他

* 服务进程使用 `pm2` 维护，如想开机启动自行配置

* 每天6点更新一次，如需调整修改 `index.js` 中 `schedule`

