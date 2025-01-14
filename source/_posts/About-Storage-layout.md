---
title: About_Storage_layout
date: 2024-01-02 09:48:19
tags:
- Solidity
- Basic
- Storage
categories: 
- Solidity
---

## Summary
---
>Variables are declared as either storage, memory or calldata to explicity specify the location of the data     --solidity-by-example

- `storage` - variable is a state variable (store on blockchain))
- `memory` - variable is in memory and it exists while a function is being called
- `calldata` - special data location that contains function arguments

## Detail
---
State variables of contracts are stored in storage in a compact way. Sometimes multiple values may use the same storage slot. Except for dynamically-sized arrays and mappings , data is stored contiguously item after item starting with the first state variable ,start from slot 0.

According to the following rules:
- The first item in a storage slot is stored lower-order aligned.
- Value types use only as many bytes as are necessary to store them.
- If a value type does not fit the remaining part of a storage slot, it is stored in the next storage slot.
- Structs and array data always start a new slot and their items are packed tightly according to these rules.
- Items following struct or array data always start a new storage slot.

## Mapping and Dynamic Arrays
---
Due to their unpredictable size, mappings and dynamically-sized array types cannot be stored “in between” the state variables preceding and following them. Instead, they are considered to occupy only 32 bytes with regards to the rules above and the elements they contain are stored starting at a different storage slot that is computed using a Keccak-256 hash.
### Dynamic Variables
The object itself does take up a storage slot, but it doesn't contain the whole array. Instead, the storage slot contains the length of the array.

If we add a new element to the array by calling `Array.push(123)`, the array's length and the new element are stored at separate locations determined by the hash function

### Mapping
For mapping it's has a slot , but it is empty it's blank

## Temporary Variables: Function Scope
---
For variables that are declared inside a function, their existence is ephemeral and scoped merely to the span of that function. These variables do not persist inside the contract and are not stored in `Storage`. Instead, they're stashed in a different memory data structure, which deletes them as soon as the function has finished execution.
e.g:
```solidity
contract Contract{
    function test(uint val) public {
        uint nVar = val + 5;
    }
}
```
`nVar` only exists for the duration of `test()`.

## Memory Keyword: Necessary for Strings

Finally, the `memory` keyword. Primarily used with strings, `memory` is needed because strings are dynamically sized arrays. By using this keyword, we tell Solidity that string operations are to be performed not in `Storage`, but in a separate memory location.

Solidity needs this explicit instruction because arrays and mappings require more space, hence the need to ensure that space is allocated in the appropriate data structure.
Here's a code snippet using `memory` keyword with string:
```solidity
contract exampleContract{
    function getString() public pure returns (string memory) {
        return "this is a string!";
    }
}
```



## Constant & immutable
---
The Solidity dont store constant or immutable variables in storage instead the vaues will replaced in every occurrence of these variables with their assigned value in the contract’s bytecode.

## Each Variables size(Example):
```
Contract MyContract {
  uint256 zero;                          // in slot 0
  mapping(address => uint256) one;    // in slot 1
  address two;                          // in slot 2 
  bool a;                              // in slot 3 - 1 byte
  uint8 b;                             // in slot 3 - 1 byte 
  bytes16 c;                           // in slot 3 - 16 bytes
  address immutable noWhere;           // Do not stored on storage
}
```

## Use Foundry
```
forge inspect contract_name storage
```
![](../images/storageimg.png)

## refer
https://docs.soliditylang.org/en/v0.8.20/internals/layout_in_storage.html