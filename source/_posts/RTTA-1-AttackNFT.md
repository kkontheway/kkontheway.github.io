---
title: RTTA-1:AttackNFT
date: 2023-12-28 17:54:49
tags:
    - NFT
    - Solidity
---
# 前言
---
ERC721
ER155

# Common Issues
---
## Reentrancy

普通的重入攻击，攻击者通过合约漏洞循环调用合约，将合约中的资产转走或者铸造大量代币。转账NFT的时候不会触发合约的fallback或者receive函数，那为什么有重入风险。

因为在NFT标准中ERC721/ERC1155,为了防止用户误把资产转入黑洞而加入了安全转账：如果转入地址为合约，则会调用该地址相应的检查函数，确保它已准备好接收NFT资产。例如 `ERC721` 的 `safeTransferFrom()` 函数会调用目标地址的 `onERC721Received()` 函数，而黑客可以把恶意代码嵌入其中进行攻击。

危险函数
| --      | Function                 | External Function |
| ------- | ------------------------ | ----------------- |
| ERC721  | safeTransferFrom         | onERC721Received  |
| ERC721  | `_safeMint`              | onERC721Received  |
| ERC1155 | safeTransferFrom         | onERC1155Received |
| ERC1155 | `_safeBatchTransferFrom` | onERC1155Received |
| ERC1155 | `_mint`                  | onERC1155Received | 

## Test

## 预防方法
1. 检查-影响-交互模式：它强调编写函数时，要先检查状态变量是否符合要求，紧接着更新状态变量（例如余额），最后再和别的合约交互。我们可以用这个模式修复有漏洞的`mint()`函数:
```
function mint() payable external {
	// 检查是否mint过
	require(mintedAddress[msg.sender] == false);
	// 增加total supply
	totalSupply++;
	// 记录mint过的地址
	mintedAddress[msg.sender] = true;
	// mint
	_safeMint(msg.sender, totalSupply);
}
```


## Logic issues特权用户抢跑
## NFT Market Issues
- **Signature verification**


## Audit Example
---
https://0xvolodya.hashnode.dev/nft-attacks

## Audit Guidelines
https://blog.quillaudits.com/2023/03/07/nft-marketplace-smart-contract-audit-guidelines/