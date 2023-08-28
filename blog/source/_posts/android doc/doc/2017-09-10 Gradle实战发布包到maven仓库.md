---
title: Gradle实战:发布包到maven仓库
date: 2017-09-10
categories: Gradle
tags:
- Gradle
---

# Gradle实战:发布包到maven仓库

#### Maven简介

#### 参考链接：http://xiedeliang.com/2017/07/30/Maven简介

<!-- more -->

#### AAR简介

AAR文件是Google为Android开发所设计的一种library格式，全名为Android Archive Library，与Java Jar Library不同的是，aar除了java code之外还包含资源文件，即xml文件、图片、文字等。

#### Jar简介

JAR 文件格式以流行的 ZIP 文件格式为基础。与 ZIP 文件不同的是，JAR 文件不仅用于压缩和发布，而且还用于部署和封装库、组件和插件程序，并可被像编译器和 JVM 这样的工具直接使用。在 JAR 中包含特殊的文件，如 manifests 和部署描述符，用来指示工具如何处理特定的 JAR。

#### 环境

- 开发工具 Android Studio
- Maven仓库
- 工程必须是lib工程，即该工程对应的build.gradle文件中要引用：apply plugin: ‘com.android.library’
- 在根目录的build.gradle文件中添加如下配置：

```
allprojects {
    apply plugin: 'idea'
    apply plugin: 'maven'
       configurations {
        deployerJars
    }
}

configurations.all {
       resolutionStrategy.cacheChangingModulesFor 0, 'seconds'//不使用缓存，使用仓库中最新的包
}

subprojects {  //表示除主工程外所有子模块
    dependencies {
        deployerJars "org.apache.maven.wagon:wagon-http:2.2"
    }
}

ext { //仓库选择标记
    repoType = "remote" //发布到远程仓库（下文中会用到）
    // repoType = "local" //发布到本地仓库，方便调试，避免调试期间频繁上传到maven仓库（下文中会用到）
}
```

- 在gradle.properties文件中添加：

  ```
  releaseRepositoryUrl=xxx  //正式包仓库地址（下文中会用到）
  snapshotRepositoryUrl=xxx //测试包仓库地址（下文中会用到）
  repositoryGroup=com.company.appname // 定义要上传的aar所在仓库的Group，可自定义，但后续引用处要与此一致
  ```

- 在工程根目录下新建一个名为“mavenAccount.properties”文件，并将该文件加入到ignore 中，该文件用于存放访问maven仓库的账户和密码以及本地仓库地址，只有该模块的开发者才有权发布该aar包。

  ```
  repositoryUserName=xxx
  repositoryPassword=xxx
  localRepositoryUrl=file:///Users/admin/Documents/Android/repo/
  ```

- 编写上传脚本:

- 生成AAR包：在工程根目录下新建一个名为“release-as-aar.gradle”的文件，其中脚本如下：

  ```
  uploadArchives() {
      repositories {
          mavenDeployer {
              configuration = configurations.deployerJars
              println 'repoType : ' + rootProject.ext.repoType
              if ((rootProject.ext.repoType).equals("remote")) { //发布到远程仓库
                  snapshotRepository(url: snapshotRepositoryUrl) { // 测试包
                  //从本地文件读取仓库账号和密码
              def File propFile = new File('../mavenAccount.properties')
              if (propFile.canRead()) {
                  def Properties props = new Properties()
                  props.load(new FileInputStream(propFile))
                      if (props != null && props.containsKey('repositoryUserName') && props.containsKey('repositoryPassword')) {
                     def repositoryUserName = props['repositoryUserName']
                      def repositoryPassword = props['repositoryPassword']
                      authentication(userName: repositoryUserName, password: repositoryPassword)
                      println '上传到远程仓库'
                  } else {
                  println '没有发布权限'
                  }
              } else {
                     println '没有发布权限'
              }
              }
  
              repository(url: releaseRepositoryUrl) { // 正式包
              def File propFile = new File('../mavenAccount.properties')
              if (propFile.canRead()) {
                     def Properties props = new Properties()
                  props.load(new FileInputStream(propFile))
                      if (props != null && props.containsKey('repositoryUserName') && props.containsKey('repositoryPassword')) {
                  def repositoryUserName = props['repositoryUserName']
                  def repositoryPassword = props['repositoryPassword']
                  authentication(userName: repositoryUserName, password: repositoryPassword)
                  println '上传到远程仓库'
                  } else {
                      println '没有发布权限'
                  }
              } else {
                  println '没有发布权限'
              }
              }
              } else { // 发布到本地仓库
                  def localRepositoryUrl
                  def File propFile = new File('../mavenAccount.properties')
                  if (propFile.canRead()) {
                     def Properties props = new Properties()
                  props.load(new FileInputStream(propFile))
                  if (props != null && props.containsKey('localRepositoryUrl')) {
                      localRepositoryUrl = props['localRepositoryUrl']
                      snapshotRepository(url: localRepositoryUrl)
                      repository(url: localRepositoryUrl)
                      println '上传到本地仓库'
                  } else {
                      println '没有发布权限'
                  }
                  } else {
                  println '没有发布权限'
                  }
              }
          }
      }
  }
  ```

生成Jar包：在工程根目录下新建一个名为“release-as-jar.gradle”的文件，其中脚本如下：

```
task androidJavadocs(type: Javadoc) {
    failOnError = false
    source = android.sourceSets.main.java.srcDirs
    ext.androidJar = "${android.sdkDirectory}/platforms/${android.compileSdkVersion}/android.jar"
    classpath += files(ext.androidJar)
}
task androidJavadocsJar(type: Jar, dependsOn: androidJavadocs) {
    classifier = 'javadoc'
    from androidJavadocs.destinationDir
}

task androidSourcesJar(type: Jar) {
    classifier = 'sources'
    from android.sourceSets.main.java.srcDirs
}

uploadArchives {
    repositories {
        mavenDeployer {
            configuration = configurations.deployerJars
            println 'repoType : ' + rootProject.ext.repoType
            if ((rootProject.ext.repoType).equals("remote")) { //发布到远程仓库
                snapshotRepository(url: snapshotRepositoryUrl) {
                    def File propFile = new File('../mavenAccount.properties')
                    if (propFile.canRead()) {
                        def Properties props = new Properties()
                        props.load(new FileInputStream(propFile))
                        if (props != null && props.containsKey('repositoryUserName') && props.containsKey('repositoryPassword')) {
                            def repositoryUserName = props['repositoryUserName']
                            def repositoryPassword = props['repositoryPassword']
                            authentication(userName: repositoryUserName, password: repositoryPassword)
                            println '上传到远程仓库'
                        } else {
                            println 'sorry，你没有上传aar包的权限'
                        }
                    } else {
                        println 'sorry，你没有上传aar包的权限'
                    }
                }

                repository(url: releaseRepositoryUrl) {
                    def File propFile = new File('../mavenAccount.properties')
                    if (propFile.canRead()) {
                        def Properties props = new Properties()
                        props.load(new FileInputStream(propFile))

                        if (props != null && props.containsKey('repositoryUserName') && props.containsKey('repositoryPassword')) {
                            def repositoryUserName = props['repositoryUserName']
                            def repositoryPassword = props['repositoryPassword']
                            authentication(userName: repositoryUserName, password: repositoryPassword)
                            println '上传到远程仓库'
                        } else {
                            println 'sorry，你没有上传aar包的权限'
                        }
                    } else {
                        println 'sorry，你没有上传aar包的权限'
                    }
                }
            } else {//发布到本地仓库
                def localRepositoryUrl
                def File propFile = new File('../mavenAccount.properties')
                if (propFile.canRead()) {
                    def Properties props = new Properties()
                    props.load(new FileInputStream(propFile))
                    if (props != null && props.containsKey('localRepositoryUrl')) {
                        localRepositoryUrl = props['localRepositoryUrl']
                        snapshotRepository(url: localRepositoryUrl)
                        repository(url: localRepositoryUrl)
                        println '上传到本地仓库'
                    } else {
                        println 'sorry，本地仓库路径不存在'
                    }
                } else {
                    println 'sorry，本地仓库路径不存在'
                }
            }
        }
    }
}

artifacts {
    archives androidSourcesJar
    archives androidJavadocsJar
}
```



- 子模块中相关配置：在子模块的build.gradle文件中添加：

  ```
  group repositoryGroup
  //version '0.0.1'
  version '0.0.1-SNAPSHOT' //表示测试版，正式发版时去掉“-SNAPSHOT”
  //打成aar格式
  apply from: '../release-as-aar.gradle' //引用上传插件
  //打成jar格式
  //apply from: '../release-as-jar.gradle'
  打包上传
  ```

- 编译通过后，打开android studio自带的终端，进入相应的module目录下，输入：

gradle uploadArchives
主项目引用

在根目录的build.gradle文件中添加如下配置：

```
maven {
  url 'http://maven.xxxx.xxxx:1111/nexus/content/groups/public/'
   } 
在项目的build.gradle文件中添加如下引用：

debugCompile 'groupId:lib-name:version-SNAPSHOT'
releaseCompile 'groupId:lib-name:version'
```