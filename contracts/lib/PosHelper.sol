pragma solidity 0.4.26;


contract PosHelper {
    function delegateIn(address, uint256 value) public returns (bool success) {
        bytes32 f = keccak256("delegateIn(address)");
        assembly {
            let free_ptr := mload(0x40)
            mstore(free_ptr, f)
            calldatacopy(add(free_ptr, 4), 4, 32)

            let result := call(
                gas,
                0x00000000000000000000000000000000000000da,
                value,
                free_ptr,
                36,
                0,
                0
            )
            returndatacopy(free_ptr, 0, returndatasize)

            if iszero(result) {
                revert(free_ptr, returndatasize)
            }
            return(free_ptr, returndatasize)
        }
        success = true;
    }

    function delegateOut(address) public returns (bool success) {
        bytes32 f = keccak256("delegateOut(address)");
        assembly {
            let free_ptr := mload(0x40)
            mstore(free_ptr, f)
            calldatacopy(add(free_ptr, 4), 4, 32)

            let result := call(
                gas,
                0x00000000000000000000000000000000000000da,
                0,
                free_ptr,
                36,
                0,
                0
            )
            returndatacopy(free_ptr, 0, returndatasize)

            if iszero(result) {
                revert(free_ptr, returndatasize)
            }
            return(free_ptr, returndatasize)
        }
        success = true;
    }
}
