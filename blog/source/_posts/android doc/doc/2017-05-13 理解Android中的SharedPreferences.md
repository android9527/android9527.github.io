---
title: 解析Android中的SharedPreferences
date: 2017-05-13
tags:
- SharedPreferences
categories: Android
---

# 解析Android中的SharedPreferences

SharedPreferences作为Android中数据存储方式的一种，我们经常会用到，它适合用来保存那些少量的数据，特别是键值对数据，比如配置信息，登录信息等。不过要想做到正确使用SharedPreferences，就需要弄清楚下面几个问题：

<!-- more -->

（1）每次调用getSharedPreferences时都会创建一个SharedPreferences对象吗？这个对象具体是哪个类对象？
（2）在UI线程中调用getXXX有可能导致ANR吗？
（3）为什么SharedPreferences只适合用来存放少量数据，为什么不能把SharedPreferences对应的xml文件当成普通文件一样存放大量数据？
（4）commit和apply有什么区别？
（5）SharedPreferences每次写入时是增量写入吗？

要想弄清楚上面几个问题，需要查看SharedPreferences的源码实现才能解决。先从Context的getSharedPreferences开始：
我们知道Android中的Context类体系其实是使用了装饰者模式，而被装饰对象就这个mBase，它其实就是一个ContextImpl对象，ContextImpl的getSharedPreferences方法：

```
@Override
    public SharedPreferences getSharedPreferences(String name, int mode) {
        SharedPreferencesImpl sp;
        synchronized (ContextImpl.class) {
            if (sSharedPrefs == null) {
                sSharedPrefs = new ArrayMap<String, ArrayMap<String, SharedPreferencesImpl>>();
            }
            final String packageName = getPackageName();
            ArrayMap<String, SharedPreferencesImpl> packagePrefs = sSharedPrefs.get(packageName);
            if (packagePrefs == null) {
                packagePrefs = new ArrayMap<String, SharedPreferencesImpl>();
                sSharedPrefs.put(packageName, packagePrefs);
            }
            // At least one application in the world actually passes in a null
            // name.  This happened to work because when we generated the file name
            // we would stringify it to "null.xml".  Nice.
            if (mPackageInfo.getApplicationInfo().targetSdkVersion <
                    Build.VERSION_CODES.KITKAT) {
                if (name == null) {
                    name = "null";
                }
            }
            sp = packagePrefs.get(name);
            if (sp == null) {
                File prefsFile = getSharedPrefsFile(name);
                sp = new SharedPreferencesImpl(prefsFile, mode);
                packagePrefs.put(name, sp);
                return sp;
            }
        }
        if ((mode & Context.MODE_MULTI_PROCESS) != 0 ||
            getApplicationInfo().targetSdkVersion < android.os.Build.VERSION_CODES.HONEYCOMB) {
            // If somebody else (some other process) changed the prefs
            // file behind our back, we reload it.  This has been the
            // historical (if undocumented) behavior.
            sp.startReloadIfChangedUnexpectedly();
        }
        return sp;
    }
```



使用到了单例模式，sSharedPrefs 是一个ArrayMap，packagePrefs也是一个ArrayMap，它们的关系是这样的：
packagePrefs存放文件name与SharedPreferencesImpl键值对，sSharedPrefs存放包名与ArrayMap键值对。注意sSharedPrefs是static变量，也就是一个类只有一个实例，因此你每次getSharedPreferences其实拿到的都是同一个SharedPreferences对象。这里回答第一个问题，对于一个相同的SharedPreferences name，获取到的都是同一个SharedPreferences对象，它其实是SharedPreferencesImpl对象。

```
SharedPreferencesImpl(File file, int mode) {
    mFile = file;
    mBackupFile = makeBackupFile(file);
    mMode = mode;
    mLoaded = false;
    mMap = null;
    startLoadFromDisk();
}
private void startLoadFromDisk() {
    synchronized (this) {
        mLoaded = false;
    }
    new Thread("SharedPreferencesImpl-load") {
        public void run() {
            synchronized (SharedPreferencesImpl.this) {
                loadFromDiskLocked();
            }
        }
    }.start();
}
```

第一次调用getSharedPreferences时会去创建一个SharedPreferencesImpl对象，它会开启一个子线程，然后去把指定的SharedPreferences文件中的键值对全部读取出来，存放在一个Map中。

```
SharedPreferences sp = getSharedPreferences("test", Context.MODE_PRIVATE);
String name = sp.getString("name", null);
```



调用getString时那个SharedPreferencesImpl构造方法开启的子线程可能还没执行完（比如文件比较大时全部读取会比较久），这时getString当然还不能获取到相应的值，必须阻塞到那个子线程读取完为止，getString方法：

```
public String getString(String key, @Nullable String defValue) {
        synchronized (this) {
            awaitLoadedLocked();
            String v = (String)mMap.get(key);
            return v != null ? v : defValue;
        }
    }
```



显然这个awaitLoadedLocked方法就是用来等this这个锁的，在loadFromDiskLocked方法的最后我们也可以看到它调用了notifyAll方法，这时如果getString之前阻塞了就会被唤醒。那么现在这里有一个问题，我们的getString是写在UI线程中，如果那个getString被阻塞太久了，比如60s，这时就会出现ANR，因此要根据具体情况考虑是否需要把SharedPreferences的读写放在子线程中。这里回答第二个问题，在UI线程中调用getXXX可能会导致ANR。同时可以回答第三个问题，SharedPreferences只能用来存放少量数据，如果一个SharedPreferences对应的xml文件很大的话，在初始化时会把这个文件的所有数据都加载到内存中，这样就会占用大量的内存，有时我们只是想读取某个xml文件中一个key的value，结果它把整个文件都加载进来了，显然如果必要的话这里需要进行相关优化处理。

SharedPreferences的初始化和读取比较简单，写操作就相对复杂了点，我们知道写一个SharedPreferences文件都是先要调用edit方法获取到一个Editor对象：

```
public Editor edit() {
    synchronized (this) {
        awaitLoadedLocked();
    }
    return new EditorImpl();
}
```



其实拿到的是一个EditorImpl对象，它是SharedPreferencesImpl的内部类：

```
public final class EditorImpl implements Editor {
    private final Map<String, Object> mModified = Maps.newHashMap();
    private boolean mClear = false;
}
```



可以看到它有一个Map对象mModified，用来保存“脏数据”，也就是你每次put的时候其实是把那个键值对放到这个mModified 中，最后调用apply或者commit才会真正把数据写入文件中，比如看putString：

```
public Editor putString(String key, @Nullable String value) {
    synchronized (this) {
        mModified.put(key, value);
        return this;
    }
}
```



其它putXXX代码基本也是一样的。EditorImpl类的关键就是apply和commit，不过它们有一些区别，先看commit方法：

```
public boolean commit() {
            MemoryCommitResult mcr = commitToMemory();
            SharedPreferencesImpl.this.enqueueDiskWrite(
                mcr, null /* sync write on this thread okay */);
            try {
                mcr.writtenToDiskLatch.await();
            } catch (InterruptedException e) {
                return false;
            }
            notifyListeners(mcr);
            return mcr.writeToDiskResult;
        }
```



关键有两步，先调用commitToMemory，再调用enqueueDiskWrite，commitToMemory就是产生一个“合适”的MemoryCommitResult对象mcr，然后调用enqueueDiskWrite时需要把这个对象传进去，commitToMemory方法：

这里需要弄清楚两个对象mMap和mModified，mMap是存放当前SharedPreferences文件中的键值对，而mModified是存放此时edit时put进去的键值对。mDiskWritesInFlight表示正在等待写的操作数量。可以看到这个方法中首先处理了clear标志，它调用的是mMap.clear()，然后再遍历mModified将新的键值对put进mMap，也就是说在一次commit事务中，如果同时put一些键值对和调用clear，那么clear掉的只是之前的键值对，这次put进去的键值对还是会被写入的。遍历mModified时，需要处理一个特殊情况，就是如果一个键值对的value是this（SharedPreferencesImpl）或者是null那么表示将此键值对删除，这个在remove方法中可以看到：

commit接下来就是调用enqueueDiskWrite方法：

```
private void enqueueDiskWrite(final MemoryCommitResult mcr,
                              final Runnable postWriteRunnable) {
    final Runnable writeToDiskRunnable = new Runnable() {
            public void run() {
                synchronized (mWritingToDiskLock) {
                    writeToFile(mcr);
                }
                synchronized (SharedPreferencesImpl.this) {
                    mDiskWritesInFlight--;
                }
                if (postWriteRunnable != null) {
                    postWriteRunnable.run();
                }
            }
        };
    final boolean isFromSyncCommit = (postWriteRunnable == null);
    // Typical #commit() path with fewer allocations, doing a write on
    // the current thread.
    if (isFromSyncCommit) {
        boolean wasEmpty = false;
        synchronized (SharedPreferencesImpl.this) {
            wasEmpty = mDiskWritesInFlight == 1;
        }
        if (wasEmpty) {
            writeToDiskRunnable.run();
            return;
        }
    }
    QueuedWork.singleThreadExecutor().execute(writeToDiskRunnable);
}
```



先定义一个Runnable，注意实现Runnable与继承Thread的区别，Runnable表示一个任务，不一定要在子线程中执行，一般优先考虑使用Runnable。这个Runnable中先调用writeToFile进行写操作，写操作需要先获得mWritingToDiskLock，也就是写锁。然后执行mDiskWritesInFlight–，表示正在等待写的操作减少1。最后判断postWriteRunnable是否为null，调用commit时它为null，而调用apply时它不为null。
Runnable定义完，就判断这次是commit还是apply，如果是commit，即isFromSyncCommit为true，而且有1个写操作需要执行，那么就调用writeToDiskRunnable.run()，注意这个调用是在当前线程中进行的。如果不是commit，那就是apply，这时调用QueuedWork.singleThreadExecutor().execute(writeToDiskRunnable)，这个QueuedWork类其实很简单，里面有一个SingleThreadExecutor，用于异步执行这个writeToDiskRunnable。
这里就可以回答第四个问题了，commit的写操作是在调用线程中执行的，而apply内部是用一个单线程的线程池实现的，因此写操作是在子线程中执行的。

说一下那个mBackupFile，SharedPreferences在写入时会先把之前的xml文件改成名成一个备份文件，然后再将要写入的数据写到一个新的文件中，如果这个过程执行成功的话，就会把备份文件删除。由此可见每次即使只是添加一个键值对，也会重新写入整个文件的数据，这也说明SharedPreferences只适合保存少量数据，文件太大会有性能问题。这里回答第五个问题，SharedPreferences每次写入都是整个文件重新写入，不是增量写入。

SharedPreferences几种模式：
Context.MODE_PRIVATE：应用私有，只有相同的UID才能进行读写
Context.MODE_MULTI_PROCESS：多进程安全标志，Android2.3之前该标志是默认被设置的，Android2.3开始需要自己设置。
MODE_APPEND：首次创建时如果文件存在不会删除文件。
注意这些模式可以使用位与进行设置，比如MODE_PRIVATE | MODE_APPEND。