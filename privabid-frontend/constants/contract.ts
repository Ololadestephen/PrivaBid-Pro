// Correct ABI for your deployed contract
export const CONTRACT_ABI = [
  // These functions MUST exist in your deployed contract
  "function getTestMessage() view returns (string)",
  "function nextAuctionId() view returns (uint256)",
  "function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)",
  "function BID_BOND() view returns (uint256)",
  "function submitSimpleBid(uint256 auctionId) payable",
  "function createAuction(string description, uint256 durationMinutes) returns (uint256)",
  "function withdrawBid(uint256 auctionId)",
  "function canWithdrawAdvanced(uint256 auctionId, address bidder) view returns (bool)",
  "function isHighestBidder(uint256 auctionId, address bidder) view returns (bool)"
] as const;

export const CONTRACT_ADDRESS = 
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 
  '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';