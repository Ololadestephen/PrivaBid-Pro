export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xd2db4e3BB54a014177F5a58A6F00d3db3452a4a3';

export const CONTRACT_ABI = [
  "function nextAuctionId() view returns (uint256)",
  "function getAuctionInfo(uint256 auctionId) view returns (address, string, uint256, bool, uint256, address, bool, bool, uint256)",
  "function getTestMessage() view returns (string)",
  "function BID_BOND() view returns (uint256)",
  "function submitSimpleBid(uint256 auctionId) payable",
  "function createAuction(string description, uint256 durationMinutes) returns (uint256)",
  "function withdrawBid(uint256 auctionId)",
  "function canWithdrawAdvanced(uint256 auctionId, address bidder) view returns (bool)",
  "function isHighestBidder(uint256 auctionId, address bidder) view returns (bool)",
  "function endAuction(uint256 auctionId)",
  "function settleAuction(uint256 auctionId)",
  "function declareWinner(uint256 auctionId, address winner, uint256 winningAmount)"
] as const;