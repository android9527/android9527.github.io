# Gradle maven配置

 发表于 2017-09-10 | 更新于: 2017-09-26

 字数统计: 153 | 阅读时长 ≈ 1 分钟

### gradle maven配置

#### 1、上传library到maven仓库

library module 中配置build.gradle增加

```
apply plugin: 'maven'

uploadArchives {
    repositories {
        mavenDeployer {
            // maven仓库地址，使用本地相对路径maven仓库
            repository(url: uri('../maven'))
            pom.version = '1.0-release'
            // 包名
            pom.groupId = 'groupId'
            // sdk名
            pom.artifactId = 'artifactId'
        }
    }
}
```





执行 gradlew uploadArchives 上传到远程仓库

#### 2、引用

- 在项目级build.gradle 中配置maven仓库地址

  ```
  allprojects {
      repositories {
          mavenLocal()
          jcenter()
          // 使用本地相对路径maven仓库
          maven {
              url uri('../maven')
          }
      }
  }
  ```

- 在module级build.gradle中引用，重新同步

  ```
  compile('groupId:artifactId:1.0-release@aar') { transitive = true }
  ```