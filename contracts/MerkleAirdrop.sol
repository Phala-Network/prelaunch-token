// Modified from https://github.com/1Hive/airdrop-app/blob/master/contracts/Airdrop.sol
pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract MerkleAirdrop is Ownable {

    struct Airdrop {
      bytes32 root;
      string dataURI;
      bool paused;
      mapping(address => bool) awarded;
    }

    /// Events
    event Start(uint id);
    event PauseChange(uint id, bool paused);
    event Award(uint id, address recipient, uint amount);

    /// State
    mapping(uint => Airdrop) public airdrops;
    IERC20 public token;
    address public approver;
    uint public airdropsCount;

    // Errors
    string private constant ERROR_AWARDED = "AWARDED";
    string private constant ERROR_INVALID = "INVALID";
    string private constant ERROR_PAUSED = "PAUSED";

    function setToken(address _token, address _approver) public onlyOwner {
        token = IERC20(_token);
        approver = _approver;
    }

    /**
     * @notice Start a new airdrop `_root` / `_dataURI`
     * @param _root New airdrop merkle root
     * @param _dataURI Data URI for airdrop data
     */
    function start(bytes32 _root, string memory _dataURI) public onlyOwner {
        uint id = ++airdropsCount;    // start at 1
        airdrops[id] = Airdrop(_root, _dataURI, false);
        emit Start(id);
    }

    /**
     * @notice Pause or resume an airdrop `_id` / `_paused`
     * @param _id The airdrop to change status
     * @param _paused Pause to resume
     */
    function setPause(uint _id, bool _paused) public onlyOwner {
        require(_id <= airdropsCount, ERROR_INVALID);
        airdrops[_id].paused = _paused;
        emit PauseChange(_id, _paused);
    }

    /**
     * @notice Award from airdrop
     * @param _id Airdrop id
     * @param _recipient Airdrop recipient
     * @param _amount The token amount
     * @param _proof Merkle proof to correspond to data supplied
     */
    function award(uint _id, address _recipient, uint256 _amount, bytes32[] memory _proof) public {
        require( _id <= airdropsCount, ERROR_INVALID );

        Airdrop storage airdrop = airdrops[_id];
        require( !airdrop.paused, ERROR_PAUSED );

        bytes32 hash = keccak256(abi.encodePacked(_recipient, _amount));
        require( validate(airdrop.root, _proof, hash), ERROR_INVALID );

        require( !airdrops[_id].awarded[_recipient], ERROR_AWARDED );

        airdrops[_id].awarded[_recipient] = true;

        token.transferFrom(approver, _recipient, _amount);

        emit Award(_id, _recipient, _amount);
    }

    /**
     * @notice Award from airdrop
     * @param _ids Airdrop ids
     * @param _recipient Recepient of award
     * @param _amounts The amounts
     * @param _proofs Merkle proofs
     * @param _proofLengths Merkle proof lengths
     */
    function awardFromMany(uint[] memory _ids, address _recipient, uint[] memory _amounts, bytes memory _proofs, uint[] memory _proofLengths) public {
        uint totalAmount;

        uint marker = 32;

        for (uint i = 0; i < _ids.length; i++) {
            uint id = _ids[i];
            require( id <= airdropsCount, ERROR_INVALID );
            require( !airdrops[id].paused, ERROR_PAUSED );

            bytes32[] memory proof = extractProof(_proofs, marker, _proofLengths[i]);
            marker += _proofLengths[i]*32;

            bytes32 hash = keccak256(abi.encodePacked(_recipient, _amounts[i]));
            require( validate(airdrops[id].root, proof, hash), ERROR_INVALID );

            require( !airdrops[id].awarded[_recipient], ERROR_AWARDED );

            airdrops[id].awarded[_recipient] = true;

            totalAmount += _amounts[i];

            emit Award(id, _recipient, _amounts[i]);
        }

        token.transferFrom(approver, _recipient, totalAmount);
    }

    function extractProof(bytes memory _proofs, uint _marker, uint proofLength) public pure returns (bytes32[] memory proof) {

        proof = new bytes32[](proofLength);

        bytes32 el;

        for (uint j = 0; j < proofLength; j++) {
            assembly {
                el := mload(add(_proofs, _marker))
            }
            proof[j] = el;
            _marker += 32;
        }

    }

    function validate(bytes32 root, bytes32[] memory proof, bytes32 hash) public pure returns (bool) {

        for (uint i = 0; i < proof.length; i++) {
            if (hash < proof[i]) {
                hash = keccak256(abi.encodePacked(hash, proof[i]));
            } else {
                hash = keccak256(abi.encodePacked(proof[i], hash));
            }
        }

        return hash == root;
    }

    /**
     * @notice Check if recipient:`_recipient` awarded from airdrop:`_id`
     * @param _id Airdrop id
     * @param _recipient Recipient to check
     */
    function awarded(uint _id, address _recipient) public view returns(bool) {
        return airdrops[_id].awarded[_recipient];
    }
}
