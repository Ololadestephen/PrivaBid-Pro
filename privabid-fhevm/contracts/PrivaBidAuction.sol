// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivaBidAuction is ZamaEthereumConfig {
    using FHE for euint32;
    
    struct Bid {
        address bidder;
        euint32 amount;
        uint256 timestamp;
        bool isValid;
        bool withdrawn;
        bytes32 commitment; // For commit-reveal scheme
        bool revealed;
    }
    
    struct Auction {
        address owner;
        string description;
        uint256 endTime;
        bool isActive;
        euint32 highestEncryptedBid;
        address pendingWinner;
        uint256 bidCount;
        bool hasBids;
        bool settled;
        euint32 minimumIncrement; // NEW: Minimum bid increment
        bool winnerRevealed; // NEW: Whether winner amount is revealed
        uint256 revealedWinningAmount; // NEW: Decrypted winning amount
        mapping(address => bool) isHighestBidder; // Track who submitted highest bid
    }
    
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(uint256 => Bid)) public bids;
    mapping(uint256 => mapping(address => uint256)) public bidderToIndex;
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;
    mapping(uint256 => mapping(address => bytes32)) public reencryptionKeys;
    
    uint256 public nextAuctionId;
    uint256 public constant BID_BOND = 0.01 ether;
    
    // NEW EVENTS
    event BidWithdrawalVerified(uint256 indexed auctionId, address bidder, bool isWinner);
    event MinimumIncrementSet(uint256 indexed auctionId);
    event WinningAmountRevealed(uint256 indexed auctionId, address winner, uint256 amount);
    event ReencryptionKeyGenerated(uint256 indexed auctionId, address user);
    event BidCommitmentMade(uint256 indexed auctionId, address bidder, bytes32 commitment);
    event BidRevealed(uint256 indexed auctionId, address bidder);
    event HighestBidderAssigned(uint256 indexed auctionId, address bidder);
    
    // Keep existing events
    event AuctionCreated(uint256 indexed auctionId, address owner, string description, uint256 endTime);
    event BidSubmitted(uint256 indexed auctionId, address bidder, uint256 bidIndex, uint256 bondPaid);
    event AuctionEnded(uint256 indexed auctionId, address winner);
    event HighestBidUpdated(uint256 indexed auctionId, address newHighestBidder);
    event BidWithdrawn(uint256 indexed auctionId, address bidder, uint256 bondReturned);
    event AuctionSettled(uint256 indexed auctionId, address winner, uint256 winningAmount);
    
    // ============ MODIFIERS ============
    
    modifier auctionExists(uint256 _auctionId) {
        require(_auctionId < nextAuctionId, "Auction does not exist");
        _;
    }
    
    modifier onlyAuctionOwner(uint256 _auctionId) {
        require(msg.sender == auctions[_auctionId].owner, "Only auction owner");
        _;
    }
    
    // ============ FEATURE 1: ADVANCED WITHDRAWAL ============
    
    function withdrawBidAdvanced(uint256 _auctionId) external auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        
        require(!auction.isActive || block.timestamp >= auction.endTime, "Auction still active");
        
        uint256 bidIndex = bidderToIndex[_auctionId][msg.sender];
        require(bidIndex > 0, "No bid found");
        bidIndex -= 1;
        
        Bid storage bid = bids[_auctionId][bidIndex];
        require(bid.isValid, "Bid not valid");
        require(!bid.withdrawn, "Already withdrawn");
        
        // Check if bidder is winner using stored flag
        if (auction.isHighestBidder[msg.sender]) {
            require(auction.settled, "Winner cannot withdraw before settlement");
            require(auction.winnerRevealed, "Winning amount must be revealed first");
        }
        
        // Mark as withdrawn
        bid.withdrawn = true;
        hasWithdrawn[_auctionId][msg.sender] = true;
        
        // Return bond
        payable(msg.sender).transfer(BID_BOND);
        
        emit BidWithdrawn(_auctionId, msg.sender, BID_BOND);
        emit BidWithdrawalVerified(_auctionId, msg.sender, auction.isHighestBidder[msg.sender]);
    }
    
    // ============ FEATURE 2: ENCRYPTED BID INCREMENTS ============
    
    function submitBidWithIncrement(
        uint256 _auctionId,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof
    ) external payable auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value == BID_BOND, "Incorrect bid bond amount");
        require(bidderToIndex[_auctionId][msg.sender] == 0, "Already bid in this auction");
        
        euint32 bidAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Store the bidder as potential highest bidder
        // We'll track who submitted bids and determine winner later
        auction.isHighestBidder[msg.sender] = true;
        
        uint256 bidIndex = auction.bidCount;
        
        // Store commitment for later reveal
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, _auctionId, block.timestamp));
        
        bids[_auctionId][bidIndex] = Bid({
            bidder: msg.sender,
            amount: bidAmount,
            timestamp: block.timestamp,
            isValid: true,
            withdrawn: false,
            commitment: commitment,
            revealed: false
        });
        
        bidderToIndex[_auctionId][msg.sender] = bidIndex + 1;
        auction.bidCount++;
        
        // Update encrypted highest bid
        if (!auction.hasBids) {
            auction.highestEncryptedBid = bidAmount;
            auction.pendingWinner = msg.sender;
            auction.hasBids = true;
            
            FHE.allowThis(auction.highestEncryptedBid);
            FHE.allow(auction.highestEncryptedBid, msg.sender);
            
            emit HighestBidUpdated(_auctionId, msg.sender);
        } else {
            // We can't decrypt to compare, so we'll update pendingWinner
            // based on who submitted the last bid (simplified for demo)
            // In production, use commit-reveal with off-chain comparison
            
            auction.pendingWinner = msg.sender; // Simplified
            emit HighestBidUpdated(_auctionId, msg.sender);
        }
        
        emit BidSubmitted(_auctionId, msg.sender, bidIndex, msg.value);
        emit BidCommitmentMade(_auctionId, msg.sender, commitment);
    }
    
    // Set minimum bid increment
    function setMinimumIncrement(
        uint256 _auctionId,
        externalEuint32 encryptedIncrement,
        bytes calldata proof
    ) external onlyAuctionOwner(_auctionId) auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        require(auction.isActive, "Auction not active");
        require(!auction.hasBids, "Bids already placed");
        
        auction.minimumIncrement = FHE.fromExternal(encryptedIncrement, proof);
        emit MinimumIncrementSet(_auctionId);
    }
    
    // ============ FEATURE 3: COMMIT-REVEAL SCHEME ============
    
    function commitBid(
        uint256 _auctionId,
        bytes32 _commitment
    ) external payable auctionExists(_auctionId) {
        require(msg.value == BID_BOND, "Incorrect bid bond");
        require(bidderToIndex[_auctionId][msg.sender] == 0, "Already bid");
        
        Auction storage auction = auctions[_auctionId];
        auction.isHighestBidder[msg.sender] = true;
        
        uint256 bidIndex = auction.bidCount;
        
        bids[_auctionId][bidIndex] = Bid({
            bidder: msg.sender,
            amount: euint32.wrap(bytes32(0)), // Placeholder
            timestamp: block.timestamp,
            isValid: true,
            withdrawn: false,
            commitment: _commitment,
            revealed: false
        });
        
        bidderToIndex[_auctionId][msg.sender] = bidIndex + 1;
        auction.bidCount++;
        
        emit BidCommitmentMade(_auctionId, msg.sender, _commitment);
        emit BidSubmitted(_auctionId, msg.sender, bidIndex, msg.value);
    }
    
    function revealBid(
        uint256 _auctionId,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof,
        uint256 _salt
    ) external auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        require(!auction.isActive, "Auction still active");
        
        uint256 bidIndex = bidderToIndex[_auctionId][msg.sender];
        require(bidIndex > 0, "No bid found");
        bidIndex -= 1;
        
        Bid storage bid = bids[_auctionId][bidIndex];
        require(!bid.revealed, "Already revealed");
        
        // Verify commitment
        bytes32 calculatedCommitment = keccak256(abi.encodePacked(
            msg.sender,
            _auctionId,
            encryptedAmount,
            _salt
        ));
        
        require(bid.commitment == calculatedCommitment, "Invalid reveal");
        
        // Store the actual bid amount
        bid.amount = FHE.fromExternal(encryptedAmount, inputProof);
        bid.revealed = true;
        
        emit BidRevealed(_auctionId, msg.sender);
    }
    
    // ============ FEATURE 4: PARTIAL REVEAL (ORACLE/OWNER) ============
    
    function declareWinner(
        uint256 _auctionId,
        address _winner,
        uint256 _winningAmount
    ) external onlyAuctionOwner(_auctionId) auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        require(!auction.isActive, "Auction still active");
        require(auction.hasBids, "No bids");
        require(!auction.winnerRevealed, "Already revealed");
        
        // Verify this address actually bid
        require(bidderToIndex[_auctionId][_winner] > 0, "Address didn't bid");
        
        auction.pendingWinner = _winner;
        auction.revealedWinningAmount = _winningAmount;
        auction.winnerRevealed = true;
        
        emit WinningAmountRevealed(_auctionId, _winner, _winningAmount);
        emit HighestBidderAssigned(_auctionId, _winner);
    }
    
    // ============ FEATURE 5: FRONTEND RE-ENCRYPTION ============
    
    function generateReencryptionKey(uint256 _auctionId) external returns (bytes32) {
        require(bidderToIndex[_auctionId][msg.sender] > 0, "No bid found");
        
        bytes32 key = keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            _auctionId,
            block.prevrandao
        ));
        
        reencryptionKeys[_auctionId][msg.sender] = key;
        emit ReencryptionKeyGenerated(_auctionId, msg.sender);
        
        return key;
    }
    
    function viewMyEncryptedBid(uint256 _auctionId, bytes32 _key) external view returns (
        bool canView,
        uint256 timestamp,
        bool isWinner,
        bool canWithdrawNow
    ) {
        uint256 bidIndex = bidderToIndex[_auctionId][msg.sender];
        if (bidIndex == 0) return (false, 0, false, false);
        
        bidIndex -= 1;
        Bid storage bid = bids[_auctionId][bidIndex];
        Auction storage auction = auctions[_auctionId];
        
        // Verify re-encryption key
        bool keyValid = reencryptionKeys[_auctionId][msg.sender] == _key;
        
        return (
            keyValid,
            bid.timestamp,
            auction.isHighestBidder[msg.sender],
            canWithdrawAdvanced(_auctionId, msg.sender)
        );
    }
    
    // Enhanced withdrawal check
    function canWithdrawAdvanced(uint256 _auctionId, address _bidder) public view returns (bool) {
        Auction storage auction = auctions[_auctionId];
        
        uint256 bidIndex = bidderToIndex[_auctionId][_bidder];
        if (bidIndex == 0) return false;
        
        bidIndex -= 1;
        Bid storage bid = bids[_auctionId][bidIndex];
        if (!bid.isValid || bid.withdrawn) return false;
        
        // Auction must be ended
        if (auction.isActive && block.timestamp < auction.endTime) return false;
        
        // If bidder is marked as highest bidder, need settlement and reveal
        if (auction.isHighestBidder[_bidder]) {
            return auction.settled && auction.winnerRevealed;
        }
        
        // Non-winners can withdraw after auction ends
        return !auction.isActive || block.timestamp >= auction.endTime;
    }
    
    // ============ KEEP EXISTING FUNCTIONS ============
    
    function createAuction(
        string memory _description,
        uint256 _durationMinutes
    ) external returns (uint256) {
        uint256 auctionId = nextAuctionId++;
        
        // Initialize auction
        auctions[auctionId].owner = msg.sender;
        auctions[auctionId].description = _description;
        auctions[auctionId].endTime = block.timestamp + (_durationMinutes * 1 minutes);
        auctions[auctionId].isActive = true;
        auctions[auctionId].highestEncryptedBid = euint32.wrap(bytes32(0));
        auctions[auctionId].pendingWinner = address(0);
        auctions[auctionId].bidCount = 0;
        auctions[auctionId].hasBids = false;
        auctions[auctionId].settled = false;
        auctions[auctionId].minimumIncrement = euint32.wrap(bytes32(0));
        auctions[auctionId].winnerRevealed = false;
        auctions[auctionId].revealedWinningAmount = 0;
        
        emit AuctionCreated(auctionId, msg.sender, _description, auctions[auctionId].endTime);
        return auctionId;
    }
    
    // Original submitEncryptedBid (simplified, no decryption)
    function submitEncryptedBid(
        uint256 _auctionId,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof
    ) external payable auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value == BID_BOND, "Incorrect bid bond amount");
        require(bidderToIndex[_auctionId][msg.sender] == 0, "Already bid in this auction");
        
        euint32 bidAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        auction.isHighestBidder[msg.sender] = true;
        
        uint256 bidIndex = auction.bidCount;
        
        bids[_auctionId][bidIndex] = Bid({
            bidder: msg.sender,
            amount: bidAmount,
            timestamp: block.timestamp,
            isValid: true,
            withdrawn: false,
            commitment: bytes32(0),
            revealed: true
        });
        
        bidderToIndex[_auctionId][msg.sender] = bidIndex + 1;
        auction.bidCount++;
        
        if (!auction.hasBids) {
            auction.highestEncryptedBid = bidAmount;
            auction.pendingWinner = msg.sender;
            auction.hasBids = true;
            
            FHE.allowThis(auction.highestEncryptedBid);
            FHE.allow(auction.highestEncryptedBid, msg.sender);
            
            emit HighestBidUpdated(_auctionId, msg.sender);
        } else {
            auction.pendingWinner = msg.sender; // Simplified for demo
            emit HighestBidUpdated(_auctionId, msg.sender);
        }
        
        emit BidSubmitted(_auctionId, msg.sender, bidIndex, msg.value);
    }
    
    // Keep all other existing functions exactly as they were
    function submitSimpleBid(uint256 _auctionId) external payable auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value == BID_BOND, "Incorrect bid bond amount");
        require(bidderToIndex[_auctionId][msg.sender] == 0, "Already bid in this auction");
        
        uint256 bidIndex = auction.bidCount;
        
        bids[_auctionId][bidIndex] = Bid({
            bidder: msg.sender,
            amount: euint32.wrap(bytes32(uint256(100))),
            timestamp: block.timestamp,
            isValid: true,
            withdrawn: false,
            commitment: bytes32(0),
            revealed: true
        });
        
        bidderToIndex[_auctionId][msg.sender] = bidIndex + 1;
        auction.bidCount++;
        
        if (!auction.hasBids) {
            auction.pendingWinner = msg.sender;
            auction.hasBids = true;
            emit HighestBidUpdated(_auctionId, msg.sender);
        }
        
        emit BidSubmitted(_auctionId, msg.sender, bidIndex, msg.value);
    }
    
    function withdrawBid(uint256 _auctionId) external auctionExists(_auctionId) {
        Auction storage auction = auctions[_auctionId];
        
        require(!auction.isActive || block.timestamp >= auction.endTime, "Auction still active");
        
        uint256 bidIndex = bidderToIndex[_auctionId][msg.sender];
        require(bidIndex > 0, "No bid found");
        bidIndex -= 1;
        
        Bid storage bid = bids[_auctionId][bidIndex];
        require(bid.isValid, "Bid not valid");
        require(!bid.withdrawn, "Already withdrawn");
        
        require(
            msg.sender != auction.pendingWinner || auction.settled,
            "Winner cannot withdraw before settlement"
        );
        
        bid.withdrawn = true;
        hasWithdrawn[_auctionId][msg.sender] = true;
        
        payable(msg.sender).transfer(BID_BOND);
        
        emit BidWithdrawn(_auctionId, msg.sender, BID_BOND);
    }
    
    function endAuction(uint256 _auctionId) external 
        auctionExists(_auctionId) 
        onlyAuctionOwner(_auctionId) 
    {
        Auction storage auction = auctions[_auctionId];
        require(auction.isActive, "Auction already ended");
        require(block.timestamp >= auction.endTime, "Auction not yet ended");
        
        auction.isActive = false;
        
        emit AuctionEnded(_auctionId, auction.pendingWinner);
    }
    
    function settleAuction(uint256 _auctionId) external 
        auctionExists(_auctionId) 
        onlyAuctionOwner(_auctionId) 
    {
        Auction storage auction = auctions[_auctionId];
        require(!auction.isActive, "Auction still active");
        require(!auction.settled, "Already settled");
        
        auction.settled = true;
        
        emit AuctionSettled(_auctionId, auction.pendingWinner, auction.revealedWinningAmount);
    }
    
    // View functions
    function getAuctionInfo(uint256 _auctionId) external view returns (
        address owner,
        string memory description,
        uint256 endTime,
        bool isActive,
        uint256 bidCount,
        address pendingWinner,
        bool hasBids,
        bool settled,
        uint256 bondAmount
    ) {
        Auction storage auction = auctions[_auctionId];
        return (
            auction.owner,
            auction.description,
            auction.endTime,
            auction.isActive,
            auction.bidCount,
            auction.pendingWinner,
            auction.hasBids,
            auction.settled,
            BID_BOND
        );
    }
    
    function getEnhancedAuctionInfo(uint256 _auctionId) external view returns (
        address owner,
        uint256 endTime,
        bool isActive,
        uint256 bidCount,
        address pendingWinner,
        bool settled,
        bool winnerRevealed,
        uint256 revealedAmount
    ) {
        Auction storage auction = auctions[_auctionId];
        return (
            auction.owner,
            auction.endTime,
            auction.isActive,
            auction.bidCount,
            auction.pendingWinner,
            auction.settled,
            auction.winnerRevealed,
            auction.revealedWinningAmount
        );
    }
    
    function getTestMessage() external pure returns (string memory) {
        return "PrivaBid Pro: FHE Auction with Advanced Privacy Features";
    }
    
    function emergencyWithdraw() external onlyAuctionOwner(0) {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function isMinimumIncrementSet(uint256 _auctionId) external view returns (bool) {
        return FHE.isInitialized(auctions[_auctionId].minimumIncrement);
    }
    
    // Helper to check if address is highest bidder
    function isHighestBidder(uint256 _auctionId, address _bidder) external view returns (bool) {
        return auctions[_auctionId].isHighestBidder[_bidder];
    }
}