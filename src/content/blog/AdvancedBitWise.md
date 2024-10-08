---
title: Advanced BitWise
author: KK
pubDatetime: 2024-08-20T05:17:19Z
slug: AdvancedBitWise
featured: false
draft: false
tags:
  - Solidity
ogImage: ""
description: This is the Advanced BitWise.
---

# Advanced BitWise

Bitwise是对二进制各项数据的执行运算，能够让开发者操作和提取特定位，设置和清除位以及在位级别执行逻辑运算。在Solidity中总供提供下列运算符:

- `&`
    - 两个位相等为1，不等为0
- `|`
    - 两个位有一位为1就为1，否则为0
- `^`
    - 相同则为0，不同为1
- `~`
    - 按位取反
- `<<`
    - 左移
- `>>`
    - 右移

这些是最基础的BitWise，我们来看一下基础的应用：

## Basic

### **提取最后的N Bits**

```solidity
function getLastNBits(uint x, uint n) external pure returns (uint) {
	uint mask = (1 << n) — 1;
	return x & mask;
}
```

函数体只有两行代码:

1. `uint mask = (1 << n) - 1;`
    
    这一行创建了一个掩码 `mask`。掩码的作用是用于提取 `x` 的最后 `n` 位。
    
    - `1 << n` 表示将数字 1 的二进制表示向左移动 `n` 位。例如,如果 `n` 为 3,则 `1 << n` 的结果为二进制的 `1000`,即十进制的 8。
    - `(1 << n) - 1` 则将上一步的结果减去 1。在上面的例子中,`(1 << 3) - 1` 的结果为二进制的 `0111`,即十进制的 7。
    
    因此,`mask` 的二进制表示将是 `n` 个 1,后面跟着所有的 0。
    
2. `return x & mask;`
    
    这一行使用按位与操作符 `&` 将 `x` 和 `mask` 进行按位与运算,并返回结果。
    
    - 按位与操作的结果是,只有当两个操作数的对应位都为 1 时,结果的对应位才为 1,否则为 0。
    - 由于 `mask` 的最后 `n` 位都是 1,其余位都是 0,所以 `x & mask` 的结果将只保留 `x` 的最后 `n` 位,其余位都变为 0。

举个例子,如果 `x` 为十进制的 `150`(二进制为 `10010110`),`n` 为 `4`,那么:

- `mask` 将是二进制的 `00001111`(十进制的 15)。
- `x & mask` 的结果将是二进制的 `00000110`(十进制的 6),这就是 `x` 的最后 4 位。

### **找到最Significant Bit**

最高有效位 (MSB) 是二进制表示形式中最左边的位。 Solidity 提供了两种方法来查找给定数字中最高有效位的位置。

```solidity
function mostSignificantBit(uint x) external pure returns (uint) {
	uint i = 0;
	while ((x >>= 1) > 0) {
	++i;
 	}
 return i;
}

```

```solidity
function mostSignificantBit(uint x) external pure returns (uint msb) {
 assembly {
 let f := shl(7, gt(x, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF))
 x := shr(f, x)
 msb := or(msb, f)
 }
 // … (similar assembly code for other bit positions)
}

```

接下来我们来看一下，在实际的项目中，是如何运用Bitwise的:

## Advanced

```solidity
 function _bitmapGet(uint128 bitmap, uint8 index) internal pure returns (bool) {
        assert(index < MAX_NUM_VOTES);
        return bitmap & (uint128(1) << index) != 0;
    }

    function _bitmapSet(uint128 bitmap, uint8 index) internal pure returns (uint128) {
        assert(index < MAX_NUM_VOTES);
        return bitmap | (uint128(1) << index);
    }

```

- 函数首先使用 `assert` 语句确保 `index` 小于 `MAX_NUM_VOTES`。这是一个断言,用于检查条件是否满足,如果不满足就会抛出异常。这里的目的是确保索引在有效范围内。
- 然后,函数使用按位与操作符 `&` 检查 `bitmap` 在索引 `index` 处的位是否为 1。
    - `uint128(1) << index` 创建了一个掩码,其中只有第 `index` 位为 1,其他位都为 0。
    - `bitmap & (uint128(1) << index)` 执行按位与操作,如果 `bitmap` 在索引 `index` 处的位为 1,结果将不为 0;否则,结果为 0。
- 函数返回一个布尔值,表示 `bitmap` 在索引 `index` 处的值是 true 还是 false。

`_bitmapSet()`:

- 同样,函数首先使用 `assert` 语句确保 `index` 小于 `MAX_NUM_VOTES`,以检查索引是否在有效范围内。
- 然后,函数使用按位或操作符 `|` 将 `bitmap` 在索引 `index` 处的位设置为 1。
    - `uint128(1) << index` 创建了一个掩码,其中只有第 `index` 位为 1,其他位都为 0。
    - `bitmap | (uint128(1) << index)` 执行按位或操作,将 `bitmap` 在索引 `index` 处的位设置为 1,而其他位保持不变。
- 函数返回更新后的位图。

我们可以这么想:

```
Position: 6,5,4,3,2,1,0
bitmap:  [0,0,0,1,0,1,0]
index:   [0,0,0,1,0,0,0] // 1 <<3
result:  [0,0,0,1,0,0,0] // true
```

# Refer

[https://x.com/bytes032/status/1666420059525324800](https://x.com/bytes032/status/1666420059525324800)

[https://solidity-by-example.org/bitwise/](https://solidity-by-example.org/bitwise/)

[https://x.com/bytes032/status/1666420059525324800](https://x.com/bytes032/status/1666420059525324800)