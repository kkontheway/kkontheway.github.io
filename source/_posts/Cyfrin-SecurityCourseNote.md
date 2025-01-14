---
title: Cyfrin-SecurityCourseNote
date: 2024-04-03 09:37:35
tags:
top: 100
---
# Prev
I spent 2 months on Cyfrin Security Courses and deep dived into each topics. Below note reords some key points during my study. Take your time and enjoy the reading!
# Lesson 0 - Setup
Although I already did the same stuff when I was learning other Cyfrin Courses, but I still spent some time to make sure all my settings are ready.
1. Foundry
2. [Slither](https://kkweb3doc.vercel.app/Web3tools/Slither)
3. Aderyn
4. halmos
5. kontrol

# Lesson 3 - PasswordStore
At the First Audit project 

1. Public Data
2. [Access Control Vuln](https://kkweb3doc.vercel.app/security/AccessControl)

# Lesson 4 - Puppy Raffle
At the second Audit, I met some problem so I went into each vulnerability.
I learned a lot from this lesson including Reentrancy, Weak Radomness, OverFlow, UnexpectedEther and etc.
And I now have a brand new understanding of CEI. The full research is in below:
1. [Reentrancy](https://kkweb3doc.vercel.app/security/Reentrancy)
2. [Weak Randomness](https://kkweb3doc.vercel.app/security/WeakRandom)
3. [Over/Under Flow]
4. [Mishandling Of ETH](https://kkweb3doc.vercel.app/security/UnexpectedEther)
5. [CEI](https://kkweb3doc.vercel.app/solidity/Basic/Check-effects)

# Lesson 5 - Tsawp
Lesson 5 is a real tough lesson, we started to audit Defi! I spent a lot of time on it.
First I read the book [How to Defi](https://landing.coingecko.com/how-to-defi/), then I watched the Crypto whiteboard's video which is an excellent Video. Everyone should check it. 
Finally, I started the lesson. Though I still feel hard to do some Invarient test, but I'm still working on it step by step.
1. [AMM](https://kkweb3doc.vercel.app/solidity/Defi/AMM)
2. [AMMAttack](https://kkweb3doc.vercel.app/security/AMMAttack)
3. Fuzz Test
4. Weird ERC20

# Lesson 6 - Thunder Loan
Lesson 6 is very interesting and I did a lot of CTF practices after the lesson. I will talk about it later.

First of all, thanks to these selfless predecessors, I benfit a lot from their great sharing. I learned Proxy from [yacademy](https://yacademy.dev/), Flashloan from [rareskills](https://www.rareskills.io/). I'll list the name who I learned from at the end.
Here is my Note for Lesson 6:
1. [Failure To Initialize](https://kkweb3doc.vercel.app/security/ProxySecurity#1unintialized-proxy-vuln)
2. [Attack FlashLoan](https://kkweb3doc.vercel.app/security/FlashLoan)
3. [ERC4626](https://kkweb3doc.vercel.app/solidity/Application/ERC4626)
4. [Oracle Manipulation](https://kkweb3doc.vercel.app/security/Oracle&PriceManipulation)
5. [Storage Collision](https://kkweb3doc.vercel.app/security/ProxySecurity#2storage-collision-vulnerability)
6. [FlashLoanAttack](https://kkweb3doc.vercel.app/security/FlashLoan)

After finishing lesson 6, I solved some CTF Challenges:
- Damn
 
# Lesson 7 - Boss bridge
In the Lesson7 I started to learn the basic knowledge of Ethereum, like Opcodes & huff & Yul.
At the beginning, I learned a lot on signature, I took a deep dive into it. Here is my research [Signature Replay](https://kkweb3doc.vercel.app/security/SignatureReply). Then we found the vul on Arbitrary From. It is similiar with web2 security. We need to check ervery parameter if it can be controlled by attacker.

After the Course, I made a little research on BridgeHacks. Here is my research [BridgeHacks](https://kkweb3doc.vercel.app/security/BridgeSecurity). 
And did some CTF Challenges to pratice: 
- Switch

# Lesson 6 - Mev&Goverence

# Lesson 7 - How to Write Audit Report(From each Lesson)