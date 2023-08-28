---
title: Fiddler抓取HTTPS原理
date: 2018-05-21
categories: HTTPS
tags:
- 抓包
- Fiddler
- HTTPS
---

# Fiddler抓取HTTPS原理

 发表于 2018-05-21 | 更新于: 2018-06-01 | 分类于 [HTTPS](http://android9527.com/categories/HTTPS/)

 字数统计: 647 | 阅读时长 ≈ 2 分钟

#### Fiddler抓取HTTPS原理

- 首先fiddler截获客户端浏览器发送给服务器的https请求， 此时还未建立握手。
- fiddler向服务器发送请求进行握手， 获取到服务器的CA证书， 用根证书公钥进行解密， 验证服务器数据签名， 获取到服务器CA证书公钥。
- fiddler伪造自己的CA证书， 冒充服务器证书传递给客户端浏览器， 客户端浏览器做跟fiddler一样的事。
- 客户端浏览器生成https通信用的对称密钥， 用fiddler伪造的证书公钥加密后传递给服务器， 被fiddler截获。
- fiddler将截获的密文用自己伪造证书的私钥解开， 获得https通信用的对称密钥。
- fiddler将对称密钥用服务器证书公钥加密传递给服务器， 服务器用私钥解开后建立信任， 握手完成， 用对称密钥加密消息， 开始通信。
- fiddler接收到服务器发送的密文， 用对称密钥解开， 获得服务器发送的明文。再次加密， 发送给客户端浏览器。
- 客户端向服务器发送消息， 用对称密钥加密， 被fidller截获后， 解密获得明文。由于fiddler一直拥有通信用对称密钥， 所以在整个https通信过程中信息对其透明。

#### ﻿为什么使用了HTTPS还是可以被抓包

- https把流量加密了，正常抓包，你看到的内容是一堆乱码。
- https的加密没有安全问题，但它只是用来防止通信过程中被第三方获取明文。如果黑客能直接控制通信的双方（你的电脑，或服务器)，那么黑客肯定能看到https明文的。
- 所以，你用charles之所以能看到https明文，是因为你允许了charles在你的电脑上做手脚，关键就是你同意charles在你电脑上安装证书。
- 具体一点，charles通过使用了https代理功能，来完成查看https明文的目的，也就是SSL中间人攻击。简单来说，你并不是直接与https的另一端通信，而是与charles通信，charles再与另一端通信，这种结构下，charles才能看到通信明文。这个问题的原理比较复杂，涉及到整套RSA系统，想了解原理的话，建议去看【信息安全】相关书籍，但这类书籍的门槛非常高。另外Fiddle也有这个功能，而且原理也一样。

#### 参考

[Fiddler抓取HTTPS原理](https://www.zhihu.com/question/24484809/answer/70126366)