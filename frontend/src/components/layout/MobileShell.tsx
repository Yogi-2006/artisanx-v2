import React from 'react';

interface MobileShellProps {
  children: React.ReactNode;
}

export function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="min-h-screen bg-surface-container flex justify-center">
      <div className="mobile-shell-width min-h-screen relative bg-surface shadow-2xl flex flex-col">
        {/* We use flex-1 so content expands. Note that if we use absolute positioning for modals, they should be constrained inside this shell where appropriate, or use fixed inset-0 for full screen overlay but inner max width. */}
        {children}
      </div>
    </div>
  );
}
