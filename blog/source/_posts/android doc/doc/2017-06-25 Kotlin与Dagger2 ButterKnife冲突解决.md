---
title: Kotlin与Dagger2 ButterKnife冲突解决
date: 2017-06-25
tags:
- Kotlin
- Dagger2
- ButterKnife
categories: Kotlin
---

# Kotlin与Dagger2 ButterKnife冲突解决

#### 1. Kotlin 与 Dagger2冲突

在kotlin中加入dagger注入代码时出现
Unresolved reference dagger的错误时
需要在 Kotlin 中则需要添加 kotlin-kapt 插件激活 kapt，并使用 kapt 替换 annotationProcessor：
在app/build.gradle文件中增加



```
apply plugin: 'kotlin-kapt'

kapt {
    generateStubs = true
}
dependencies {
    kapt "com.google.dagger:dagger-compiler:$dagger-version"
    compile "com.google.dagger:dagger:${daggerVersion}"
}
```

特别提示：kapt 也能够处理 Java 文件，所以不需要再保留 annotationProcessor 的依赖。

#### 2.出现ButterKnife不生效问题处理

在项目级 build.gradle中增加

```
dependencies {
    classpath 'com.neenbedankt.gradle.plugins:android-apt:1.8'
}
```



在 Kotlin 中使用 ButterKnife 与 Java 中完全一致。 在 Gradle 构建脚本的修改如下，后面将重点介绍代码部分的差异。
在 Gradle 依赖中添加 kotlin-kapt 插件，并使用 kapt 替代 annotationProcessor。

```
apply plugin: ‘kotlin-kapt‘
dependencies {
    ...
    compile "com.jakewharton:butterknife:$butterknife-version"
    kapt "com.jakewharton:butterknife-compiler:$butterknife-version"
    
 // 处理butterknife与support-compat冲突
    compile ("com.jakewharton:butterknife:$butterknife-version") {
        exclude group: 'com.android.support', module: 'support-compat'
    }
//    apt "com.jakewharton:butterknife-compiler:$butterknife-version"
    kapt "com.jakewharton:butterknife-compiler:$butterknife-version"
}
```