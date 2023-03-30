# Android WebView缓存优化

 发表于 2018-07-13 | 更新于: 2018-07-27 | 分类于 [WebView](http://android9527.com/categories/WebView/)

 字数统计: 2.3k | 阅读时长 ≈ 9 分钟

#### 一、前言

对于WebView的性能，给人最直观的莫过于：打开速度比native慢。
是的，当我们打开一个WebView页面，页面往往会慢吞吞的loading很久，若干秒后才出现你所需要看到的页面。这是为什么呢？



对于一个普通用户来讲，打开一个WebView通常会经历以下几个阶段：

- 交互无反馈
- 到达新的页面，页面白屏
- 页面基本框架出现，但是没有数据；页面处于loading状态
- 出现所需的数据
  如果从程序上观察，WebView启动过程大概分为以下几个阶段：

[![image](http://android9527.com/images/webview_cache/webview_1.png)](images/webview_cache/webview_1.png)
如何缩短这些过程的时间，就成了优化WebView性能的关键。

常规的前端和后端的性能优化已有前辈们总结过最佳实践，主要的是：

- 降低请求量：合并资源，减少 HTTP 请求数，minify / gzip 压缩，webP。
- 加快请求速度：预解析DNS，减少域名数，并行加载，CDN 分发。
- 缓存：HTTP 协议缓存请求，离线缓存 manifest，离线数据缓存 localStorage。
- 渲染：JS/CSS优化，加载顺序，服务端渲染模板直出。

#### 二、WebView的缓存类型

WebView主要包括两类缓存，一类是浏览器自带的网页数据缓存，这是所有的浏览器都支持的、由HTTP协议定义的缓存；另一类是H5缓存，这是由web页面的开发者设置的，H5缓存主要包括了App Cache、DOM Storage、Local Storage、Web SQL Database 存储机制等，这里我们主要介绍App Cache来缓存js文件。

##### 1、浏览器自带的网页数据缓存

- 浏览器缓存机制是通过HTTP协议Header里的Cache-Control（或Expires）和Last-Modified（或 Etag）等字段来控制文件缓存的机制。
- WebView如何设置才能支持上面的协议

Android WebView有下面几个Cache Mode：

- LOAD_DEFAULT：根据cache-control决定是否从网络上取数据。
- LOAD_NORMAL：Deprecated，API level 17中已经废弃，从API level 11开始作用同LOAD_DEFAULT模式
- LOAD_CACHE_ELSE_NETWORK：只要本地有，无论是否过期，都使用缓存中的数据。本地没有缓存时才从网络上获取。
- LOAD_NO_CACHE：不使用缓存，只从网络获取数据。
- LOAD_CACHE_ONLY： 不使用网络，只读取本地缓存数据。

设置WebView缓存的Cache Mode示例代码如下：

```
val webSettings = webView.settings
webSettings.cacheMode = WebSettings.LOAD_NO_CACHE

webSettings.cacheMode = if (YKNetworkUtil.isNetConnected()) {
    WebSettings.LOAD_NO_CACHE
} else {
    WebSettings.LOAD_CACHE_ELSE_NETWORK
}
```

##### 2、在手机里面的存储路径

Android 6.0的目录：/data/data/包名/cache/org.chromium.android_webview/下面，如下图所示。
[![image](http://android9527.com/images/webview_cache/webview_path.jpeg)](images/webview_cache/webview_path.jpeg)

##### Application Cache 缓存机制

```
// HTML 在头中通过 manifest 属性引用 manifest 文件
// manifest 文件：就是上面以 appcache 结尾的文件，是一个普通文件文件，列出了需要缓存的文件
// 浏览器在首次加载 HTML 文件时，会解析 manifest 属性，并读取 manifest 文件，获取 Section：CACHE MANIFEST 下要缓存的文件列表，再对文件缓存
<html manifest="cache/demo.appcache">

CACHE MANIFEST
demo_time.js
img_logo.gif
NETWORK:
*
FALLBACK:
404.html
val webSettings = webView.settings
webSettings.setAppCacheEnabled(true)
```

##### 3、Dom Storage 缓存机制

a. 通过存储字符串的 Key - Value 对来提供
DOM Storage 分为 sessionStorage & localStorage； 二者使用方法基本相同，区别在于作用范围不同：
a. sessionStorage：具备临时性，即存储与页面相关的数据，它在页面关闭后无法使用
b. localStorage：具备持久性，即保存的数据在页面关闭后也可以使用。

b. 特点
存储空间大（ 5MB）：存储空间对于不同浏览器不同，如Cookies 才 4KB
存储安全、便捷： Dom Storage 存储的数据在本地，不需要经常和服务器进行交互
c. 应用场景
存储临时、简单的数据

具体实现，前端

```
localStorage.setItem("lastName", "HaHa");
var lastName = localStorage.getItem("lastName");

sessionStorage.setItem("lastName", "HaHa");
var lastName = sessionStorage.getItem("lastName");
```

Android端

```
val webSettings = webView.settings
webSettings.domStorageEnabled = true
```

##### 4、Web SQL Database 缓存机制

a. 原理
基于 SQL 的数据库存储机制

b. 特点
充分利用数据库的优势，可方便对数据进行增加、删除、修改、查询

c. 应用场景
存储适合数据库的结构化数据

d. 具体实现

```
<script type="text/javascript">
        var db = openDatabase('testDB', '1.0', 'Test DB', 2 * 1024 * 1024);
        var msg;
        db.transaction(function (context) {
           context.executeSql('CREATE TABLE IF NOT EXISTS testTable (id unique, name)');
           context.executeSql('INSERT INTO testTable (id, name) VALUES (0, "Byron")');
           context.executeSql('INSERT INTO testTable (id, name) VALUES (1, "Casper")');
           context.executeSql('INSERT INTO testTable (id, name) VALUES (2, "Frank")');
         });

        db.transaction(function (context) {
           context.executeSql('SELECT * FROM testTable', [], function (context, results) {
            var len = results.rows.length, i;
            console.log('Got '+len+' rows.');
               for (i = 0; i < len; i++){
              console.log('id: '+results.rows.item(i).id);
              console.log('name: '+results.rows.item(i).name);
            }
         });
        });
</script>
val webSettings = webView.settings
webSettings.databaseEnabled = true
```

特别说明
根据官方说明，Web SQL Database存储机制不再推荐使用（不再维护）,取而代之的是 IndexedDB缓存机制，下面会详细介绍

##### 5、indexedDB

```
<script type="text/javascript">
       function openDB (name) {
            var request=window.indexedDB.open(name);
            request.onerror=function(e){
                console.log('OPen Error!');
            };
            request.onsuccess=function(e){
                myDB.db=e.target.result;
            };
        }

        var myDB={
            name:'test',
            version:1,
            db:null
        };
        openDB(myDB.name);
</script>
```

#### 三、缓存机制汇总

[![image](http://android9527.com/images/webview_cache/webview_cache_3.png)](images/webview_cache/webview_cache_3.png)

结论：综合各种缓存机制比较，对于静态文件，如 JS、CSS、字体、图片等，适合通过浏览器缓存机制来进行缓存，通过缓存文件可大幅提升 Web 的加载速度，且节省流量。但也有一些不足：缓存文件需要首次加载后才会产生；浏览器缓存的存储空间有限，缓存有被清除的可能；缓存的文件没有校验。

#### 四、APP端主要缓存方案

##### 1、全局WebView，WebView独立进程

在客户端刚启动时，就初始化一个全局的WebView待用，并隐藏；
当用户访问了WebView时，直接使用这个WebView加载对应网页，并展示。
这种方法可以比较有效的减少WebView在App中的首次打开时间。当用户访问页面时，不需要初始化WebView的时间。

当然这也带来了一些问题，包括：

额外的内存消耗。
页面间跳转需要清空上一个页面的痕迹，更容易内存泄露。

##### 2、APP端代理网络请求

在客户端初始化WebView的同时，直接由APP端开始网络请求数据；
当页面初始化完成后，向客户端获取其代理请求的数据。

此方法虽然不能减小WebView初始化时间，但数据请求和WebView初始化可以并行进行，总体的页面加载时间就缩短了；缩短总体的页面加载时间：

##### 3、WebView采用和客户端API相同的域名

DNS会在系统级别进行缓存，对于WebView的地址，如果使用的域名与native的API相同，则可以直接使用缓存的DNS。

根据上面的统计，至少10%的用户打开WebView时耗费了60ms在DNS上面，如果WebView的域名与App的API域名统一，则可以让WebView的DNS时间全部达到1.3ms的量级。

静态资源同理，最好与客户端的资源域名保持一致。

##### 4、资源预加载

预加载WebView对象 & 预加载H5资源

Application启动或者其他时机预加载WebView对象，WebView初始化之后，即使WebView已经释放，但一些公用的资源仍未释放

构建WebView对象池，采用多个WebView对象重复使用，而不需要每次打开H5都创建对象

##### 5、离线资源包等

- 事先将更新频率较低、常用 & 固定的H5静态资源 文件（如JS、CSS文件、图片等） 放到本地
- 拦截H5页面的资源网络请求 并进行检测
- 如果检测到本地具有相同的静态资源 就 直接从本地读取进行替换 而 不发送该资源的网络请求 到 服务器获取
- 资源包更新策略，增量更新等

目前客户端缓存策略：

H5加载—拦截网络请求进行资源监测—本地是否具有相同的资源—-Y —- 不发送网络请求—-取本地资源—-结束
—-N —- 继续发送网络请求—资源缓存本地—-结束

具体实现：重写`WebViewClient`的`shouldInterceptRequest`方法，进行本地资源监测和替换

```
override fun shouldInterceptRequest(view: WebView, url: String?): WebResourceResponse? {

    return if (!mIsEnableCache) {
        super.shouldInterceptRequest(view, url)
    } else webViewCacheManage.getWebResourceResponse(this, url)
}

@TargetApi(Build.VERSION_CODES.LOLLIPOP)
override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest?): WebResourceResponse? {

    return if (!mIsEnableCache) {
        super.shouldInterceptRequest(view, request)
    } else webViewCacheManage.getWebResourceResponse(this, request?.url?.toString())
}
```

优点：

- 有效解决 H5页面静态资源 加载速度慢 & 流量消耗多的问题
- 开发成本低，没有改变前端H5的任何代码，只需APP端开发
- 配置灵活，支持自定义缓存策略，自定义缓存类型等

缺点：

- 缓存的Key依赖前端资源中的url，如果前端资源需要更新则必须要更改名字
- 资源文件的缓存只有在第二次打开页面才会生效

TODO：

- 资源预加载方案，WebView预初始化
- 针对单个页面独立配置
- 完善资源缓存方案

#### 参考

[WebView性能、体验分析与优化](https://tech.meituan.com/WebViewPerf.html)
[WebView缓存原理分析和应用](https://mp.weixin.qq.com/s?__biz=MjM5MTA1MjAxMQ==&mid=2651229156&idx=1&sn=fdd48acd893ddd11ccd2460c46a3c2d1)
[Android：手把手教你构建 全面的WebView 缓存机制 & 资源加载方案](https://www.jianshu.com/p/5e7075f4875f)