# Android APP项目改进部分

 发表于 2018-03-15 | 更新于: 2018-04-12

 字数统计: 2.8k | 阅读时长 ≈ 11 分钟

#### 摘要

主要回顾一下项目中修改的地方，以及目前存在的问题和改进的方向



#### 一、gradle依赖库版本统一管理，所有support包使用同一版本v4、v7、RecycleView减少冲突

依赖库版本不同容易引起冲突

#### 二、所有接口json数据序列化修改

增加YKResponseDataWrapper类，增加统一的成功、错误处理，TokenError等

YKJsonUtil实体类数据解析功能，使用泛型解决数据类型转换问题

修改前后对比：

```
public class YKMyInfoParser extends YKBaseJsonParser {

    private static final String TAG = "YKMyInfoParser";
    private YKUserInfo userInfo = new YKUserInfo();

    @Override
    protected void parseData() {
        JsonObject dataObj = getResultJsonObject();
        if (dataObj.has("headPortraitUrl")) {
            userInfo.headPortraitUrl = dataObj.get("headPortraitUrl").getAsString();
        }
        if (dataObj.has("nickName")) {
            userInfo.nickName = dataObj.get("nickName").getAsString();
        }
        if (dataObj.has("mobile")) {
            userInfo.mobile = dataObj.get("mobile").getAsString();
        }
        if (dataObj.has("realName")) {
            userInfo.userName = dataObj.get("realName").getAsString();
        }
        ...
    }

    public YKUserInfo getUserInfo() {
        return userInfo;
    }
}
/**
 * 个人信息
 */
private fun handleUserData(data: ByteArray, encode: String) {
    val dataWrapper = YKJsonUtil.parseResponse(data, YKNewMineDataEntity::class.java, encode) ?: return

    // TODO 使用MOCK数据
    // val dataWrapper = YKJsonUtil.parseResponse(MineDataMock.getMockData(), YKNewMineDataEntity::class.java)
    if (!dataWrapper.isSuccess) {
        YKToastUtil.showShort(dataWrapper.message)
        return
    }
    ...
}
```

注意：

- 1、要特别注意数据字段类型和字段名要和服务端对应
- 2、使用-keep class 防止字段名混淆

#### 三、把一些常用功能以及基础UI和工具库（网络模块、缓存管理、线程池管理、主题样式、自定义控件等）提取到单独的module中

ykdata、ykcommon等可以直接移植到其他项目中使用，也是进行项目模块化的第一步

部分依赖库上传至maven服务器，使用aar集成形式，一定程度上加快编译速度

#### 四、模块化（参考https://zhuanlan.zhihu.com/p/26744821）

（1）整个项目分为三层，从下至上分别是：
Basic Component Layer: 基础组件层，顾名思义就是一些基础组件，包含了各种开源库以及和业务无关的各种自研工具库；
Business Component Layer: 业务组件层，这一层的所有组件都是业务相关的，例如上图中的支付组件 AnjukePay、数据模拟组件 DataSimulator 等等；
Business Module Layer: 业务 Module 层，在 Android Studio 中每块业务对应一个单独的 Module。例如安居客用户 App 我们就可以拆分成新房 Module、二手房 Module、IM Module 等等，每个单独的 Business Module 都必须准遵守我们自己的 MVP 架构。

对于模块化项目，每个单独的 Business Module 都可以单独编译成 APK。在开发阶段需要单独打包编译，项目发布的时候又需要它作为项目的一个 Module 来整体编译打包。简单的说就是开发时是 Application，发布时是 Library。因此需要在 Business Module 的 build.gradle 中加入如下代码：

```
if (IsBuildModule.toBoolean()) {
    apply plugin: 'com.android.application'
} else {
    apply plugin: 'com.android.library'
}
```

isBuildModule 在项目根目录的 gradle.properties 中定义:
isBuildModule=false
同样 Manifest.xml 也需要有两套：

```
sourceSets {
    main {
        jniLibs.srcDirs = ['libs']
        if (IsBuildModule.toBoolean()) {
            manifest.srcFile 'src/main/module/AndroidManifest.xml'
        } else {
            manifest.srcFile 'src/main/AndroidManifest.xml'
        }
    }
}
```

（2）问题及建议

##### 1、重复依赖

模块化的过程中我们常常会遇到重复依赖的问题，如果是通过 aar 依赖， gradle 会自动帮我们找出新版本，而抛弃老版本的重复依赖。如果是以 project 的方式依赖，则在打包的时候会出现重复类。对于这种情况我们可以在 build.gradle 中将 compile 改为 provided，只在最终的项目中 compile 对应的 library ；
其实从前面的安居客模块化设计图上能看出来，我们的设计方案能一定程度上规避重复依赖的问题。比如我们所有的第三方库的依赖都会放到 OpenSourceLibraries 中，其他需要用到相关类库的项目，只需要依赖 OpenSourceLibraries 就好了。

##### 2、模块化过程中的建议

对于大型的商业项目，在重构过程中可能会遇到业务耦合严重，难以拆分的问题。我们需要先理清业务，再动手拆分业务模块。比如可以先在原先的项目中根据业务分包，在一定程度上将各业务解耦后拆分到不同的 package 中。比如之前新房和二手房由于同属于 app module，因此他们之前是通过隐式的 intent 跳转的，现在可以先将他们改为通过 Router 来实现跳转。又比如新房和二手房中公用的模块可以先下放到 Business Component Layer 或者 Basic Component Layer 中。在这一系列工作完成后再将各个业务拆分成多个 module 。
模块化重构需要渐进式的展开，不可一触而就，不要想着将整个项目推翻重写。线上成熟稳定的业务代码，是经过了时间和大量用户考验的；全部推翻重写往往费时费力，实际的效果通常也很不理想，各种问题层出不穷得不偿失。对于这种项目的模块化重构，我们需要一点点的改进重构，可以分散到每次的业务迭代中去，逐步淘汰掉陈旧的代码。
各业务模块间肯定会有公用的部分，按照我前面的设计图，公用的部分我们会根据业务相关性下放到业务组件层（Business Component Layer）或者基础组件层（Common Component Layer）。对于太小的公有模块不足以构成单独组件或者模块的，我们先放到类似于 CommonBusiness 的组件中，在后期不断的重构迭代中视情况进行进一步的拆分。过程中完美主义可以有，切记不可过度。
以上就是我在模块化探索实践方面的一些经验，不住之处还望大家指出。
模块化示例项目 ModularizationProject 源码地址：https://github.com/BaronZ88/ModularizationProject
路由框架 Router 源码地址：https://github.com/BaronZ88/Router

#### 五、模块间跳转通讯（Router）

目前采用阿里ARouter实现页面跳转以及传值问题
ARouter使用及问题（https://github.com/alibaba/ARouter）
EventBus消息模型

#### 六、Module间资源名冲突

对于多个Module 中资源名冲突的问题，可以通过在 build.gradle 定义前缀的方式解决：
defaultConfig { … resourcePrefix “common_” … }

#### 七、项目结构梳理

之前项目存在问题：

- 1、Activity/Fragment过于臃肿
- 2、包含网络请求以及业务处理、UI显示逻辑、用户交互事件
- 3、一个YKMineLoginFragment页面有近千行代码，给重构及增加功能带来很大困难

##### 参考MVP模式，改进步骤：

（1）引入简易MVP结构

- 1、增加BaseFragment、BasePresenter关联，增加相关的生命周期管理
- 2、逐步分离Activity/Fragment以及业务逻辑，使用Fragment主要是用于解决碎片化问题 、更加轻量级
- 3、增加BaseView 接口，增加startLoading() finishLoading() showToast()等通用接口以及默认实现
  View接口是Fragment与Presenter层的中间层，它的作用是根据具体业务的需要，为Presenter提供调用Fragment中具体UI逻辑操作的方法。

```
public class YKBaseFragmentJava<T extends YKBasePresenter> extends Fragment implements
        HasComponent, BaseMVPContract.IBaseView, View.OnClickListener {

    @Inject
    public T mPresenter;

    @Override
    public void onActivityCreated(@Nullable Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        if (mPresenter != null) {
            mPresenter.create();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (mPresenter != null) {
            mPresenter.resume();
        }
    }
    ...
}
```

YKBasePresenter.java

```
public abstract class YKBasePresenter<T extends BaseMVPContract.IBaseView> implements BaseMVPContract.Presenter, YKConnectionItemListener {

    private T mView;

    public void setView(T view) {
        this.mView = view;
    }

    public T getView() {
        return mView;
    }

    @Override
    public void create() {
    }

    @Override
    public void resume() {
    }

    @Override
    public void pause() {
    }

    @Override
    public void onResponse(YKNetworkError networkError, YKConnectionItem connectionItem) {
        // view判断
        if (mView == null || !mView.isViewAdd()) {
            return;
        }
        mView.finishLoading();
        handleResponse(networkError, connectionItem);
    }

    /**
     * 处理请求结果，子类重写
     * @param networkError networkError
     * @param connectionItem connectionItem
     */
    public abstract void handleResponse(YKNetworkError networkError, YKConnectionItem connectionItem);

    @Override
    public void destroy() {
        YKNetInterface.getInstance().removeConnectionItem(this);
    }
}
```

这样基本完成一个简单的V-MP的结构，存在的问题：

- 1、结构不完善、未增加Model层逻辑
- 2、将网络请求及数据解析等逻辑放在了Presenter层，导致Presenter过重
- 3、重用性不友好，对于包含部分相同业务逻辑的场景需要多次编写相同代码
  如：多个页面需要获取用户信息做不同处理的场景

同样无法优雅处理在一个Fragment引用多个Presenter业务逻辑
如果需要对数据做不同处理，这样很有可能需要修改presenterA、PresenterB的逻辑，容易引起错误

```
public class FragmentC extends Fragment implements ViewA,ViewB {

  private PresenterA presenterA;
  private PresenterB presenterB;
  ...
  ...
  private void getData() {
      presenterA.getData();
      presenterB.getData();
  }
}
```

- （2）增加简单Model层逻辑

```
/**
 * Created by chenfeiyue on 17/12/11.
 * Description ：主页接口相关
 */
interface MainRepository : BaseRepository {

    interface MainRequestListener : RepositoryRequestListener

    /**
     * 获取启动屏幕配置
     */
    fun getSplashPic(listener: MainRequestListener, activity: Activity)

    /**
     * 获取首页数据
     */
    fun getHomeData(listener: MainRequestListener)
}
```

在Presenter引用相应的多个Model就好，各自单独处理数据

[![image](http://android9527.github.io/images/app_optimize/mvp1.png)](images/app_optimize/mvp1.png)

- （3）继续优化改进
  [![image](http://android9527.github.io/images/app_optimize/mvp2.png)](images/app_optimize/mvp2.png)

优化之后的Model层是一个庞大而且独立的模块，对外提供统一的请求数据方法与请求规则，这样做的好处有很多：

- 1、数据请求单独编写，无需配合上层界面测试。
- 2、同一个模块统一管理，修改方便。
- 3、实现不同数据源(NetAPI,cache,database)的无缝切换。

##### 优点：

- 1、各个层次之间的职责更加单一清晰，同时也很大程度上降低了代码的耦合度（可配合使用dagger2）目前的Presenter和Repository是由dagger2注入生成的
- 2、各个层次单独编写、测试，无需依赖其他。
- 3、实现不同数据源(cache，database)的无缝切换。
- 4、复用性高 各个层次均可一定程度的复用

##### 弊端：

- 1、可读性降低 各层之间大量依赖接口调用，不方便调试
- 2、代码量增加 简单的功能按照MVP模式会增加许多代码

#### 其他改进部分：

增加glide使用volley网络请求框架，配置缓存等，volley默认最大连接数是4
BaseListFragment统一控制列表加载和刷新组件
接口YKJsonBuilder约束，自动增加useId、token等参数

#### 一些需要注意的地方：

- 1、添加的监听器及时移除，add/remove，register/unregister等
- 2、在Android library中不能使用switch-case语句访问资源ID
  ButterKnife在library中的使用

```
@BindView(R2.id.tab_tv_left)
TextView mTabTvLeft;

@Override
public void onClick(View view) {
    int i = view.getId();
    if (i == R.id.act_base_back_ib) {
        mClickListener.onLeftViewClicked();
    } else if (i == R.id.act_base_right_view_tv) {
        mClickListener.onRightViewClicked();
    }
}
```

- 3、有些时候不能使用Application的Context，不然会报错（比如启动Activity，显示Dialog等）
- 4、不要通过Bundle和Msg传递大的对象，尽量避免传递Serializable类型数据（集合类除外）
- 5、在引入一个地方库的时候，一定要看文档在proguard文件中加入混淆配置，并且打release安装验证

#### 待处理问题：

- 1、Glide图片库中间层，图片框架升级
- 2、事件连续点击处理
- 3、单个Request定制HTTP Header信息以及其他信息
- 4、增加同步请求方式，将网络请求和数据解析由调用者自由控制切换线程
- 5、目前所有分页数据接口部分存在逻辑漏洞

#### 参考资料

[Android 模块化探索与实践](https://zhuanlan.zhihu.com/p/26744821)
[安居客Android项目架构演进](https://blog.csdn.net/baron_leizhang/article/details/58071773)
[Android MVP架构搭建](http://www.jcodecraeer.com/a/anzhuokaifa/2017/1020/8625.html)