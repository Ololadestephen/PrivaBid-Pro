'use client';

import { FaInfoCircle } from 'react-icons/fa';

interface WithdrawTooltipProps {
  bid: any;
}

export default function WithdrawTooltip({ bid }: WithdrawTooltipProps) {
  if (!bid.canWithdraw) {
    return (
      <div className="mt-2 text-sm">
        <div className="flex items-center gap-1 text-yellow-400">
          <FaInfoCircle />
          <span>
            {bid.isWinner 
              ? "Winners can only withdraw after auction settlement" 
              : "Can only withdraw when auction has ended"}
          </span>
        </div>
        {bid.isWinner && !bid.settled && (
          <p className="text-xs text-gray-400 mt-1">
            The auction owner needs to settle this auction first
          </p>
        )}
      </div>
    );
  }
  return null;
}