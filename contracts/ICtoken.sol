//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


interface ICToken {
    function balanceOfUnderlying(address owner) external returns (uint);
    function mint(uint mintAmount) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function underlying() external returns (address);
    function exchangeRateCurrent() external returns(uint);
    function approve(address _spender, uint _value) external returns(bool);
}