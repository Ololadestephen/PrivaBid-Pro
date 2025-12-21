// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// SIMPLIFIED VERSION for Sepolia testing
// No FHE operations - just bond system

contract SimpleBidAuction {
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
        bool withdrawn;
    }
    
    struct Auction {
        address owner;
        string description;
        uint256 endTime;
        bool isActive;
        uint256 highestBid;
        address highestBidder;
        uint256 bidCount;
        bool settled;
    }
    
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(uint256 => Bid)) public bids;
    mapping(uint256 => mapping(address => uint256)) public bidderToIndex;
    
    uint256 public nextAuctionId;
    uint256 public constant BID_BOND = 0.01 ether;
    
    event AuctionCreated(uint256 indexed auctionId, address owner, string description, uint256 endTime);
    event BidSubmitted(uint256 indexed auctionId, address bidder, uint256 bidIndex, uint256 amount, uint256 bondPaid);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 winningBid);
    event BidWithdrawn(uint256 indexed auctionId, address bidder, uint256 bondReturned);
    event AuctionSettled(uint256 indexed auctionId, address winner);
    
    function createAuction(string memory _description, uint256 _durationMinutes) external returns (uint256) {
        uint256 auctionId = nextAuctionId++;
        
        auctions[auctionId] = Auction({
            owner: msg.sender,
            description: _description,
            endTime: block.timestamp + (_durationMinutes * 1 minutes),
            isActive: true,
            highestBid: 0,
            highestBidder: address(0),
            bidCount: 0,
            settled: false
        });
        
        emit AuctionCreated(auctionId, msg.sender, _description, auctions[auctionId].endTime);
        return auctionId;
    }
    
    function submitBid(uint256 _auctionId, uint256 _bidAmount) external payable {
        Auction storage auction = auctions[_auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value == BID_BOND + _bidAmount, "Incorrect payment");
        require(_bidAmount > auction.highestBid, "Bid too low");
        
        uint256 bidIndex = auction.bidCount;
        
        bids[_auctionId][bidIndex] = Bid({
            bidder: msg.sender,
            amount: _bidAmount,
            timestamp: block.timestamp,
            withdrawn: false
        });
        
        bidderToIndex[_auctionId][msg.sender] = bidIndex + 1;
        auction.bidCount++;
        
        // Update highest bid
        if (_bidAmount > auction.highestBid) {
            auction.highestBid = _bidAmount;
            auction.highestBidder = msg.sender;
        }
        
        emit BidSubmitted(_auctionId, msg.sender, bidIndex, _bidAmount, BID_BOND);
    }
    
    function submitSimpleBid(uint256 _auctionId) external payable {
        Auction storage auction = auctions[_auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value == BID_BOND, "Incorrect bond amount");
        
        // Simple bid with fixed amount
        uint256 bidAmount = 100 ether; // Fixed test amount
        
        uint256 bidIndex = auction.bidCount;
        
        bids[_auctionId][bidIndex] = Bid({
            bidder: msg.sender,
            amount: bidAmount,
            timestamp: block.timestamp,
            withdrawn: false
        });
        
        bidderToIndex[_auctionId][msg.sender] = bidIndex + 1;
        auction.bidCount++;
        
        // Update highest bid
        if (bidAmount > auction.highestBid) {
            auction.highestBid = bidAmount;
            auction.highestBidder = msg.sender;
        }
        
        emit BidSubmitted(_auctionId, msg.sender, bidIndex, bidAmount, BID_BOND);
    }
    
    function withdrawBid(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(!auction.isActive || block.timestamp >= auction.endTime, "Auction still active");
        
        uint256 bidIndex = bidderToIndex[_auctionId][msg.sender];
        require(bidIndex > 0, "No bid found");
        bidIndex -= 1;
        
        Bid storage bid = bids[_auctionId][bidIndex];
        require(!bid.withdrawn, "Already withdrawn");
        
        // Non-winners can withdraw bond immediately
        // Winners can withdraw after settlement
        if (msg.sender == auction.highestBidder) {
            require(auction.settled, "Winner: wait for settlement");
        }
        
        bid.withdrawn = true;
        payable(msg.sender).transfer(BID_BOND);
        
        emit BidWithdrawn(_auctionId, msg.sender, BID_BOND);
    }
    
    function endAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.owner, "Only auction owner");
        require(auction.isActive, "Auction already ended");
        require(block.timestamp >= auction.endTime, "Auction not yet ended");
        
        auction.isActive = false;
        
        emit AuctionEnded(_auctionId, auction.highestBidder, auction.highestBid);
    }
    
    function settleAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.owner, "Only auction owner");
        require(!auction.isActive, "Auction still active");
        require(!auction.settled, "Already settled");
        
        auction.settled = true;
        
        // Winner gets the bid amount (already paid) + keeps bond
        // In real auction, you'd transfer the item/NFT here
        
        emit AuctionSettled(_auctionId, auction.highestBidder);
    }
    
    // VIEW FUNCTIONS
    function getAuctionInfo(uint256 _auctionId) external view returns (
        address owner,
        string memory description,
        uint256 endTime,
        bool isActive,
        uint256 bidCount,
        address highestBidder,
        uint256 highestBid,
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
            auction.highestBidder,
            auction.highestBid,
            auction.settled,
            BID_BOND
        );
    }
    
    function getBidderInfo(uint256 _auctionId, address _bidder) external view returns (
        bool hasBid,
        uint256 bidIndex,
        bool withdrawn,
        bool isHighestBidder,
        uint256 bidAmount
    ) {
        uint256 index = bidderToIndex[_auctionId][_bidder];
        bool hasBidded = index > 0;
        uint256 bidIndex = hasBidded ? index - 1 : 0;
        
        Bid storage bid = bids[_auctionId][bidIndex];
        bool isWinner = auctions[_auctionId].highestBidder == _bidder;
        
        return (
            hasBidded,
            bidIndex,
            hasBidded ? bid.withdrawn : false,
            isWinner,
            hasBidded ? bid.amount : 0
        );
    }
    
    function canWithdraw(uint256 _auctionId, address _bidder) external view returns (bool) {
        Auction storage auction = auctions[_auctionId];
        
        uint256 bidIndex = bidderToIndex[_auctionId][_bidder];
        if (bidIndex == 0) return false;
        
        bidIndex -= 1;
        Bid storage bid = bids[_auctionId][bidIndex];
        if (bid.withdrawn) return false;
        
        if (auction.isActive && block.timestamp < auction.endTime) return false;
        
        if (_bidder == auction.highestBidder) {
            return auction.settled;
        }
        
        return !auction.isActive || block.timestamp >= auction.endTime;
    }
    
    function getAuctionCount() external view returns (uint256) {
        return nextAuctionId;
    }
    
    function getBondAmount() external pure returns (uint256) {
        return BID_BOND;
    }
    
    function getTestMessage() external pure returns (string memory) {
        return "Simplified Auction with Bid Bonds (No FHE)";
    }
}
