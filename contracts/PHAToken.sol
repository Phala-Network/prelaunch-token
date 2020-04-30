pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/lifecycle/Pausable.sol";

contract OwnedPausalbe is Pausable, Ownable {
    modifier onlyOwnerOrNotPaused() {
        if (!isOwner()) {
            require(!paused(), "Pausable: paused");
        }
        _;
    }
}

contract PHAToken is ERC20, ERC20Detailed, OwnedPausalbe {
    constructor(uint256 initialSupply) ERC20Detailed("Phala", "PHA", 18) public {
        _mint(msg.sender, initialSupply);
        pause();
    }

    function transfer(address to, uint256 value) public onlyOwnerOrNotPaused returns (bool) {
        return super.transfer(to, value);
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        if (from != owner()) {
            require(!paused(), "Pausable: paused");
        }
        return super.transferFrom(from, to, value);
    }

    function approve(address spender, uint256 value) public onlyOwnerOrNotPaused returns (bool) {
        return super.approve(spender, value);
    }

    function increaseAllowance(address spender, uint256 addedValue) public onlyOwnerOrNotPaused returns (bool) {
        return super.increaseAllowance(spender, addedValue);
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public onlyOwnerOrNotPaused returns (bool) {
        return super.decreaseAllowance(spender, subtractedValue);
    }
}
