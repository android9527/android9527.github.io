# Glide 设置超时时间

 发表于 2017-06-22 | 更新于: 2018-12-18 | 分类于 [Android ](http://android9527.com/categories/Android/)， [Glide](http://android9527.com/categories/Android/Glide/)

 字数统计: 266 | 阅读时长 ≈ 1 分钟

Glide 系列文章
https://mrfu.me/2016/02/27/Glide_Request_Priorities/

Glide默认使用HttpUrlConnection作为协议栈进行网络连接默认超时时间为2500ms
设置超时时间方法



1、使用Volley作为协议栈
compile ‘com.github.bumptech.glide:volley-integration:1.5.0@aar’

```
public class CustomGlideModule implements GlideModule {
    @Override
    public void applyOptions(Context context, GlideBuilder builder) {
    }
    @Override
    public void registerComponents(Context context, Glide glide) {
        RequestQueue queue = new RequestQueue( // params hardcoded from Volley.newRequestQueue()
                new DiskBasedCache(new File(context.getCacheDir(), "volley")),
                new BasicNetwork(new HurlStack())) {
            @Override public <T> Request<T> add(Request<T> request) {
                request.setRetryPolicy(new DefaultRetryPolicy(10000, 1, 1));
                return super.add(request);
            }
        };
        queue.start();
        glide.register(GlideUrl.class, InputStream.class, new VolleyUrlLoader.Factory(queue));
    }
}
```



```
<meta-data
    android:name="{packageName}.CustomGlideModule"
    android:value="GlideModule" />
```

2、使用OkHttp作为协议栈

```
dependencies {
    compile 'com.github.bumptech.glide:okhttp-integration:1.5.0@aar'
}
```



```
public class CustomGlideModule extends GlideModule {
    @Override
    public void applyOptions(Context context, GlideBuilder builder) {
        // stub
    }

    @Override
    public void registerComponents(Context context, Glide glide) {
        final OkHttpClient.Builder builder = new OkHttpClient.Builder();

        // set your timeout here
        builder.readTimeout(30, TimeUnit.SECONDS);
        builder.writeTimeout(30, TimeUnit.SECONDS);
        builder.connectTimeout(30, TimeUnit.SECONDS);

        glide.register(GlideUrl.class, InputStream.class, new OkHttpUrlLoader.Factory(builder.build()));
    }
}
<meta-data
    android:name="{packageName}.CustomGlideModule"
    android:value="GlideModule" />
```