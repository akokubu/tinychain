// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Greeter {
    string private greeting;
    uint public counter;

    constructor(string memory _greeting) {
        greeting = _greeting;
        counter = 1;
    }

    function setGreeting(string memory _greeting) public {
        counter++;
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }
}
