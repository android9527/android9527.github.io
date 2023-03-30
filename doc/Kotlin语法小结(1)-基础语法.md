# Kotlin语法小结(1)-基础语法

 发表于 2018-04-10 | 更新于: 2018-12-05 | 分类于 [Kotlin](http://android9527.com/categories/Kotlin/)

 字数统计: 1.7k | 阅读时长 ≈ 7 分钟

#### Kotlin语法特点

- 兼容性：Kotlin 与 JDK 6 完全兼容，保障了 Kotlin 应用程序可以在较旧的 Android 设备上运行而无任何问题。Kotlin 工具在 Android Studio 中会完全支持，并且兼容 Android 构建系统。
- 性能：由于非常相似的字节码结构，Kotlin 应用程序的运行速度与 Java 类似。 随着 Kotlin 对内联函数的支持，使用 lambda 表达式的代码通常比用 Java 写的代码运行得更快。
- 互操作性：Kotlin 可与 Java 进行 100％ 的互操作，允许在 Kotlin 应用程序中使用所有现有的 Android 库 。这包括注解处理，所以数据绑定和 Dagger 也是一样。
- 占用：Kotlin 具有非常紧凑的运行时库，可以通过使用 ProGuard 进一步减少。 在实际应用程序中，Kotlin 运行时只增加几百个方法以及 .apk 文件不到 100K 大小。
- 编译时长：Kotlin 支持高效的增量编译，所以对于清理构建会有额外的开销，增量构建通常与 Java 一样快或者更快。

#### 为什么选择 Kotlin？

- 简洁

使用一行代码创建一个包含 getters、 setters、 equals()、 hashCode()、 toString() 以及 copy() 的 POJO：

```kotlin
data class Customer(val name: String, val email: String, val company: String)
```

或者使用 lambda 表达式来过滤列表：

```kotlin
val positiveNumbers = list.filter { it > 0 }
```

想要单例？创建一个 object 就可以了：

```kotlin
object ThisIsASingleton {
    val companyName: String = "JetBrains"
}
```

- 安全

彻底告别那些烦人的 NPE(NullPointerException)。

```kotlin
var output: String
output = null   // 编译错误
```

Kotlin 可以保护你避免对可空类型的误操作。

```kotlin
val name: String? = null    // 可空类型
println(name.length())      // 编译错误
```

智能类型转换，编译器会为你做自动类型转换。

```kotlin
fun getStringLength(obj: Any): Int? {
    if (obj is String) {
        // `obj` 在该条件分⽀内⾃动转换成 `String`
        return obj.length
    }
    // 在离开类型检测分⽀后，`obj` 仍然是 `Any` 类型
    return null
}
```

- 互操作性

使用 JVM 上的任何现有库，因为有 100％ 的兼容性，包括 SAM(Single Abstract Method) 支持。

```kotlin
import io.reactivex.Flowable
import io.reactivex.schedulers.Schedulers

Flowable
    .fromCallable {
        Thread.sleep(1000) //  模仿高开销的计算
        "Done"
    }
    .subscribeOn(Schedulers.io())
    .observeOn(Schedulers.single())
    .subscribe(::println, Throwable::printStackTrace)
```

无论是 JVM 还是 JavaScript 目标平台，都可用 Kotlin 写代码然后部署到你想要的地方

```kotlin
import kotlin.browser.window

fun onLoad() {
    window.document.body!!.innerHTML += "<br/>Hello, Kotlin!"
}
```

- 工具友好

一门语言需要工具化，而在 JetBrains，这正是我们做得最好的地方！
[![TCP](http://android9527.com/images/kotlin/kotlin1.png)](images/kotlin/kotlin1.png)

[![TCP](http://android9527.com/images/kotlin/kotlin2.png)](images/kotlin/kotlin2.png)

Kotlin相关知识

#### 一、基础语法

##### 1、数据类型

- 基本数据类型
  在 Kotlin 中，所有东西都是对象，在这个意义上讲我们可以在任何变量上调⽤成员函数和属性。
  Kotlin 处理数字在某种程度上接近 Java， 但是并不完全相同。 例如， 对于数字没有隐式拓宽转换 （如 Java 中 int 可以隐式转换为 long)， 另外有些情况的字⾯值略有不同。
  Kotlin 提供了如下的内置类型来表⽰数字 （与 Java 很相近）

| Type   | Bit width |
| :----- | :-------- |
| Double | 64        |
| Float  | 32        |
| Long   | 64        |
| Int    | 32        |
| Short  | 16        |
| Byte   | 8         |

```kotlin
// kotlin 没有隐式转换
fun main(args: Array<String>) {
    fun test(l: Long) {
    }

    val i = 10
    test(i.toLong())
}
```

- 字符串
  字符串⽤ String 类型表⽰。 字符串是不可变的。 字符串的元素⸺字符可以使⽤索引运算符访问: s[i] 。 可以⽤ for 循环迭代字符串:

```kotlin
for (c in name) {
    println(c)
}
// Kotlin 有两种类型的字符串字⾯值: 转义字符串, 以及原⽣字符串可以包含换⾏和任意⽂本。转义字符串很像 Java 字符串:
val s = "Hello, world!\n"

// 引用原⽣字符串 使⽤三个引号（ """ ） 分界符括起来， 内部没有转义并且可以包含换⾏和任何其他字符:
val text = """ \n
    for (c in "foo")
        print(c) """
```

你可以通过 trimMargin() 函数去除前导空格：

- 字符串模板
  字符串可以包含模板表达式 ， 即⼀些⼩段代码， 会求值并把结果合并到字符串中。 模板表达式以美元符 （ $ ） 开头， 由⼀个简单的名字构成:

```kotlin
val string = "Hello World"
println("result is $string")
println("result is ${string.replace(" ", "")}")
```

##### 2、语法定义

- 定义包、定义函数、定义常量、变量、变长参数vararg

（1）定义包：

```kotlin
package my.demo
import java.util.*
//...
```

包名不必和文件夹路径一致：源文件可以放在任意位置。

（2）定义函数

定义一个函数接受两个 int 型参数，返回值为 int ：

```kotlin
fun sum(a: Int , b: Int) : Int{
    return a + b
}
```

该函数只有一个表达式函数体以及一个自推导型的返回值：

```kotlin
fun sum(a: Int, b: Int) = a + b

fun main(args: Array<String>) {
  println("sum of 19 and 23 is ${sum(19, 23)}")
}
```

kotlin没有void关键字，用Unit表示返回一个没有意义的值， Unit 的返回类型可以省略：

```kotlin
fun printSum(a: Int, b: Int): Unit {
   println("sum of $a and $b is ${a + b}")
 }

 fun printSum(a: Int, b: Int) {
   println("sum of $a and $b is ${a + b}")
 }
```

（3）定义变量、常量

```kotlin
fun main(args: Array<String>) {
   val a: Int = 1  // 立即初始化
   val b = 2   // 推导出Int型
   val c: Int  // 当没有初始化值时必须声明类型
   c = 3       // 赋值
   println("a = $a, b = $b, c = $c")
}

fun main(args: Array<String>) {
   var x = 5 // 推导出Int类型
   x += 1
   println("x = $x")
}
```

（4）变长参数 vararg

```kotlin
/**
 * kotlin 变长参数
 */
fun test(vararg arg: Int, string: String): Int {
    var sum = 0
    arg.forEach { n ->
        sum += n
    }
    return sum
}

test(1, 2, 3, string = "")
```

在java中变长参数必须放在所有参数的后面，kotlin由于具名参数的存在可以放在任何位置

- 注释

注释正如Java 和 JavaScript， Kotlin ⽀持⾏注释及块注释。

```kotlin
// 这是⼀个⾏注释
/* 这是⼀个多⾏的
 块注释。 */
/** /** */ */
```

与 Java 不同的是， Kotlin 的块注释可以嵌套。

- 可空类型 String?
  当某个变量的值可以为 null 的时候， 必须在声明处的类型后添加 ? 来标识该引⽤可为空。
  如果 str 的内容不是数字返回 null：

```kotlin
fun parseInt(str: String): Int? {
    // ……
}
```

##### 3、import引用，区间使用（参见控制流）

源⽂件通常以包声明开头:package foo.bar

- 默认导⼊

有多个包会默认导⼊到每个 Kotlin ⽂件中：
kotlin.*
kotlin.annotation.*
…
kotlin.io.*
kotlin.text.*
根据⽬标平台还会导⼊额外的包：
JVM:
java.lang.*
kotlin.jvm.*
JS:
kotlin.js.*

- 也可以导⼊⼀个作⽤域下的所有内容 （包、 类、 对象等） :
  import foo.* // “foo”中的⼀切都可访问
  如果出现名字冲突， 可以使⽤ as 关键字在本地重命名冲突项来消歧义：
  import foo.Bar // Bar 可访问
  import bar.Bar as bBar // bBar 代表“bar.Bar”
- import 并不仅限于导⼊类； 也可⽤它来导⼊其他声明：
  顶层函数及属性；
  在对象声明中声明的函数和属性;
  枚举常量。
- 与 Java 不同， Kotlin 没有单独的 “import static” 语法； 所有这些声明都⽤ import 关键字导⼊。

#### 参考

[Kotlin中文站](https://www.kotlincn.net/)

[Kotlin控制流](http://blog.csdn.net/jhj_24/article/details/53896224)