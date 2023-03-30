# Android App 安全的HTTPS 通信

 发表于 2018-06-01 | 更新于: 2018-06-01 | 分类于 [HTTPS](http://android9527.com/categories/HTTPS/)

 字数统计: 1.7k | 阅读时长 ≈ 8 分钟

##### 漏洞描述

对于数字证书相关概念、Android 里 https 通信代码就不再复述了，直接讲问题。缺少相应的安全校验很容易导致中间人攻击，而漏洞的形式主要有以下3种：

- 自定义`X509TrustManager`。
  在使用HttpsURLConnection发起 HTTPS 请求的时候，提供了一个自定义的X509TrustManager，
  未实现安全校验逻辑，下面片段就是常见的容易犯错的代码片段。如果不提供自定义的X509TrustManager，
  代码运行起来可能会报异常（原因下文解释），初学者就很容易在不明真相的情况下提供了一个自定义的X509TrustManager，
  却忘记正确地实现相应的方法。本文重点介绍这种场景的处理方式。

```
/**
 * 自定义X509TrustManager，存在安全漏洞
 * 跳过证书校验
 */
public class UnSafeTrustManager implements X509TrustManager {
    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
        //do nothing，接受任意客户端证书
    }

    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
        //do nothing，接受任意服务端证书
    }

    @Override
    public X509Certificate[] getAcceptedIssuers() {
        return new X509Certificate[]{};
    }
}
```

- 自定义了`HostnameVerifier`。
  在握手期间，如果 URL 的主机名和服务器的标识主机名不匹配，则验证机制可以回调此接口的实现程序来确定是否应该允许此连接。
  如果回调内实现不恰当，默认接受所有域名，则有安全风险。代码示例。

```
/**
 * Created by chenfeiyue on 2018/6/1.
 * Description ：UnSafeHostnameVerifier
 */
public class UnSafeHostnameVerifier implements HostnameVerifier {
    @Override
    public boolean verify(String hostname, SSLSession session) {
        // Always return true，接受任意域名服务器
        return true;
    }
}

HttpsURLConnection.setDefaultHostnameVerifier(new UnSafeHostnameVerifier());
```

#### 修复方案

分而治之，针对不同的漏洞点分别描述，这里就讲的修复方案主要是针对非浏览器App，非浏览器 App 的服务端通信对象比较固定，一般都是自家服务器，可以做很多特定场景的定制化校验。如果是浏览器 App，校验策略就有更通用一些。

- 自定义X509TrustManager。前面说到，当发起 HTTPS 请求时，可能抛起一个异常，以下面这段代码为例（来自官方文档）：

```
try {
    URL url = new URL("https://certs.cac.washington.edu/CAtest/");
    URLConnection urlConnection = url.openConnection();
    InputStream in = urlConnection.getInputStream();
    copyInputStreamToOutputStream(in, System.out);
} catch (MalformedURLException e) {
    e.printStackTrace();
} catch (IOException e) {
    e.printStackTrace();
}

private void copyInputStreamToOutputStream(InputStream in, PrintStream out) throws IOException {
    byte[] buffer = new byte[1024];
    int c = 0;
    while ((c = in.read(buffer)) != -1) {
        out.write(buffer, 0, c);
    }
}
```

它会抛出一个`SSLHandshakeException`的异常。

```
javax.net.ssl.SSLHandshakeException: java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.
    at com.android.org.conscrypt.OpenSSLSocketImpl.startHandshake(OpenSSLSocketImpl.java:322)
    at com.android.okhttp.Connection.upgradeToTls(Connection.java:201)
    at com.android.okhttp.Connection.connect(Connection.java:155)
    at com.android.okhttp.internal.http.HttpEngine.connect(HttpEngine.java:276)
    at com.android.okhttp.internal.http.HttpEngine.sendRequest(HttpEngine.java:211)
    at com.android.okhttp.internal.http.HttpURLConnectionImpl.execute(HttpURLConnectionImpl.java:382)
    at com.android.okhttp.internal.http.HttpURLConnectionImpl.getResponse(HttpURLConnectionImpl.java:332)
    at com.android.okhttp.internal.http.HttpURLConnectionImpl.getInputStream(HttpURLConnectionImpl.java:199)
    at com.android.okhttp.internal.http.DelegatingHttpsURLConnection.getInputStream(DelegatingHttpsURLConnection.java:210)
    at com.android.okhttp.internal.http.HttpsURLConnectionImpl.getInputStream(HttpsURLConnectionImpl.java:25)
    at me.longerian.abcandroid.datetimepicker.TestDateTimePickerActivity$1.run(TestDateTimePickerActivity.java:236)
Caused by: java.security.cert.CertificateException: java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.
    at com.android.org.conscrypt.TrustManagerImpl.checkTrusted(TrustManagerImpl.java:318)
    at com.android.org.conscrypt.TrustManagerImpl.checkServerTrusted(TrustManagerImpl.java:219)
    at com.android.org.conscrypt.Platform.checkServerTrusted(Platform.java:114)
    at com.android.org.conscrypt.OpenSSLSocketImpl.verifyCertificateChain(OpenSSLSocketImpl.java:550)
    at com.android.org.conscrypt.NativeCrypto.SSL_do_handshake(Native Method)
    at com.android.org.conscrypt.OpenSSLSocketImpl.startHandshake(OpenSSLSocketImpl.java:318)
 ... 10 more
Caused by: java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.
 ... 16 more
```

Android 手机有一套共享证书的机制，如果目标 URL 服务器下发的证书不在已信任的证书列表里，或者该证书是自签名的，不是由权威机构颁发，那么会出异常。对于我们这种非浏览器 app 来说，如果提示用户去下载安装证书，可能会显得比较诡异。幸好还可以通过自定义的验证机制让证书通过验证。验证的思路有两种：

##### 方案1

不论是权威机构颁发的证书还是自签名的，打包一份到 app 内部，比如存放在 asset 里。通过这份内置的证书初始化一个KeyStore，然后用这个KeyStore去引导生成的TrustManager来提供验证，具体代码如下：

```
try {
  CertificateFactory cf = CertificateFactory.getInstance("X.509");
  // uwca.crt 打包在 asset 中，该证书可以从https://itconnect.uw.edu/security/securing-computer/install/safari-os-x/下载
  InputStream caInput = new BufferedInputStream(getAssets().open("uwca.crt"));
  Certificate ca;
  try {
      ca = cf.generateCertificate(caInput);
      Log.i("Longer", "ca=" + ((X509Certificate) ca).getSubjectDN());
      Log.i("Longer", "key=" + ((X509Certificate) ca).getPublicKey();
  } finally {
      caInput.close();
  }

  // Create a KeyStore containing our trusted CAs
  String keyStoreType = KeyStore.getDefaultType();
  KeyStore keyStore = KeyStore.getInstance(keyStoreType);
  keyStore.load(null, null);
  keyStore.setCertificateEntry("ca", ca);

  // Create a TrustManager that trusts the CAs in our KeyStore
  String tmfAlgorithm = TrustManagerFactory.getDefaultAlgorithm();
  TrustManagerFactory tmf = TrustManagerFactory.getInstance(tmfAlgorithm);
  tmf.init(keyStore);

  // Create an SSLContext that uses our TrustManager
  SSLContext context = SSLContext.getInstance("TLSv1","AndroidOpenSSL");
  context.init(null, tmf.getTrustManagers(), null);

  URL url = new URL("https://certs.cac.washington.edu/CAtest/");
  HttpsURLConnection urlConnection =
          (HttpsURLConnection)url.openConnection();
  urlConnection.setSSLSocketFactory(context.getSocketFactory());
  InputStream in = urlConnection.getInputStream();
  copyInputStreamToOutputStream(in, System.out);
} catch (CertificateException e) {
  e.printStackTrace();
} catch (IOException e) {
  e.printStackTrace();
} catch (NoSuchAlgorithmException e) {
  e.printStackTrace();
} catch (KeyStoreException e) {
  e.printStackTrace();
} catch (KeyManagementException e) {
  e.printStackTrace();
} catch (NoSuchProviderException e) {
  e.printStackTrace();
}
```

##### 方案2

同方案1，打包一份到证书到 app 内部，但不通过`KeyStore`去引导生成的`TrustManager`，而是干脆直接自定义一个`TrustManager`，自己实现校验逻辑；校验逻辑主要包括：

- 服务器证书是否过期
- 证书签名是否合法

```
import android.content.Context;

import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.SignatureException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

import javax.net.ssl.X509TrustManager;

/**
 * Created by chenfeiyue on 2018/6/1.
 * Description ：自定义TrustManager 校验服务端证书，有效期等
 */
public class SafeTrustManager implements X509TrustManager {

    private Context mContext;

    public SafeTrustManager(Context context) {
        this.mContext = context;
    }

    /* 此处存放服务器证书密钥 */
//    private static final String PUB_KEY =
//            "30820122300d06092a864886f70d01010105000382010f003082010a0282010100add086cfc3df3bcf54bffb4e044a911cc0eadbab61ead529a96525833a1a00f75df3d746e11666dbdf4ed8594c4f9194456a49a32a3dce999d9679d2cbc59cf9082935517e35a0706f1041ad053b727c9c92a47507d0313cf5b3788c609733255a89d40c6a8b8d1a90f0761e7dacf117e43fe1b5ae093e160f902a42433ebd57f91cf27b88cd46dcebb85aa0b33c6a48771ca445ace6f6668626d60156eecd1fc2feb282809f8f835b5f5c457890694f495fbf1620070b4a18094c44680beafac05c59ba062b2e889cc8e6a5feca13c3e473700858aceeac0e25f2ba0bfdf44b1040a9ecb15a3f7ea91a366baeeed02f0af78f982d5d0db854bf9476db5f15c10203010001";

    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {

    }

    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
        for (X509Certificate cert : chain) {

            // Make sure that it hasn't expired.
            cert.checkValidity();

            // Verify the certificate's public key chain.
            try {
                X509Certificate x509Certificate = TLSSocketFactory.getX509Certificate(mContext);
                cert.verify(x509Certificate.getPublicKey());
            } catch (NoSuchAlgorithmException e) {
                e.printStackTrace();
            } catch (InvalidKeyException e) {
                e.printStackTrace();
            } catch (NoSuchProviderException e) {
                e.printStackTrace();
            } catch (SignatureException e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public X509Certificate[] getAcceptedIssuers() {
        return new X509Certificate[0];
    }
}
```

同样上述代码只能访问 certs.cac.washington.edu 相关域名地址，如果访问 https://www.taobao.com/ 或者 https://www.baidu.com/ ，则会在cert.verify(((X509Certificate) ca).getPublicKey());处抛异常，导致连接失败。

- 自定义HostnameVerifier，简单的话就是根据域名进行字符串匹配校验；业务复杂的话，还可以结合配置中心、白名单、黑名单、正则匹配等多级别动态校验；总体来说逻辑还是比较简单的，反正只要正确地实现那个方法。

```
HostnameVerifier hnv = new HostnameVerifier() {
  @Override
  public boolean verify(String hostname, SSLSession session) {
    //示例
    if("yourhostname".equals(hostname)){
      return true;
    } else {
      HostnameVerifier hv =
            HttpsURLConnection.getDefaultHostnameVerifier();
      return hv.verify(hostname, session);
    }
  }
};
```

#### 参考

[苹果核 - Android App 安全的HTTPS 通信](http://pingguohe.net/2016/02/26/Android-App-secure-ssl.html)
[通过 HTTPS 和 SSL 确保安全](https://developer.android.com/training/articles/security-ssl)