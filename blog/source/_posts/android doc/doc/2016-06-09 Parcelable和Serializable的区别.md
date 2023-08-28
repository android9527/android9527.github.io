---
title: Parcelable和Serializable的区别
date: 2016-06-09
tags:
- Android
categories: Android
---

# Parcelable和Serializable的区别

##### Android自定义对象可序列化有两个选择一个是Serializable和Parcelable

##### 一、对象为什么需要序列化


- 1.永久性保存对象，保存对象的字节序列到本地文件。

- 2.通过序列化对象在网络中传递对象。

- 3.通过序列化对象在进程间传递对象。

  ##### 二、当对象需要被序列化时如何选择所使用的接口

- 1.在使用内存的时候Parcelable比Serializable的性能高。

- 2.Serializable在序列化的时候会产生大量的临时变量，从而引起频繁的GC（内存回收）。

- 3.Parcelable不能使用在将对象存储在磁盘上这种情况，因为在外界的变化下Parcelable不能很好的保证数据的持续性。