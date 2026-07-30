import React, { useState, useEffect } from 'react';
import { LotteryMarket, BetSlip, LotteryResult, UserWallet, AdminStats, BetItem } from './types';
import { Navbar } from './components/Navbar';
import { LotteryList } from './components/LotteryList';
import { BetPanel } from './components/BetPanel';
import { MySlips } from './components/MySlips';
import { ResultsBoard } from './components/ResultsBoard';
import { RulesAndPayouts } from './components/RulesAndPayouts';
import { AdminPanel } from './components/AdminPanel';
import { TopupModal } from './components/TopupModal';

export default function App() {
  const [activeView, setActiveView] = useState<'PLAYER' | 'ADMIN'>('PLAYER');
  const [playerTab, setPlayerTab] = useState<'LOTTERIES' | 'MY_SLIPS' | 'RESULTS' | 'RULES'>('LOTTERIES');
  const [selectedLottery, setSelectedLottery] = useState<LotteryMarket | null>(null);

  // Data States
  const [lotteries, setLotteries] = useState<LotteryMarket[]>([]);
  const [wallet, setWallet] = useState<UserWallet>({
    balance: 50000,
    totalSpent: 0,
    totalWon: 0,
    transactions: []
  });
  const [slips, setSlips] = useState<BetSlip[]>([]);
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalRevenue: 0,
    totalPayout: 0,
    netProfit: 0,
    totalSlips: 0,
    pendingSlips: 0,
    wonSlips: 0
  });

  const [topupModalOpen, setTopupModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch all data from Express API
  const fetchAllData = async () => {
    try {
      const [resLotteries, resWallet, resSlips, resResults, resStats] = await Promise.all([
        fetch('/api/lotteries').then((r) => r.json()),
        fetch('/api/wallet').then((r) => r.json()),
        fetch('/api/slips').then((r) => r.json()),
        fetch('/api/results').then((r) => r.json()),
        fetch('/api/admin/stats').then((r) => r.json())
      ]);

      if (resLotteries.success) setLotteries(resLotteries.data);
      if (resWallet.success) setWallet(resWallet.data);
      if (resSlips.success) setSlips(resSlips.data);
      if (resResults.success) setResults(resResults.data);
      if (resStats.success) setAdminStats(resStats.data);
    } catch (err) {
      console.error('Failed to fetch data from server', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handlers
  const handleSubmitSlip = async (
    lotteryId: string,
    items: Omit<BetItem, 'id' | 'status' | 'winAmount'>[]
  ) => {
    const res = await fetch('/api/slips/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lotteryId, items })
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.message || 'ส่งโพยไม่สำเร็จ');
      return;
    }

    await fetchAllData();
    setSelectedLottery(null);
    setPlayerTab('MY_SLIPS');
  };

  const handleTopup = async (amount: number) => {
    const res = await fetch('/api/wallet/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (data.success) {
      await fetchAllData();
    }
  };

  const handleCancelSlip = async (slipId: string) => {
    const res = await fetch(`/api/slips/${slipId}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      await fetchAllData();
    } else {
      alert(data.message);
    }
  };

  // Admin Handlers
  const handleToggleMarket = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    await fetch(`/api/admin/lotteries/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    await fetchAllData();
  };

  const handleUpdatePayouts = async (id: string, payoutRates: any) => {
    await fetch(`/api/admin/lotteries/${id}/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payoutRates })
    });
    await fetchAllData();
  };

  const handleDrawLottery = async (
    id: string,
    data: { full6Digits?: string; top3?: string; bottom2?: string }
  ) => {
    await fetch(`/api/admin/lotteries/${id}/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await fetchAllData();
  };

  const handleAutoDrawLottery = async (id: string) => {
    await fetch(`/api/admin/lotteries/${id}/auto-draw`, { method: 'POST' });
    await fetchAllData();
  };

  const handleResetSystem = async () => {
    await fetch('/api/admin/reset', { method: 'POST' });
    await fetchAllData();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E0E0E0] font-sans selection:bg-[#C5A059] selection:text-black pb-16">
      {/* Navigation Header */}
      <Navbar
        wallet={wallet}
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          setSelectedLottery(null);
        }}
        playerTab={playerTab}
        setPlayerTab={(t) => {
          setPlayerTab(t);
          setSelectedLottery(null);
        }}
        onOpenTopup={() => setTopupModalOpen(true)}
        onRefreshData={fetchAllData}
      />

      {/* Main Container Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="text-xs text-[#888888] font-semibold">กำลังเชื่อมต่อฐานข้อมูลระบบหวย...</div>
          </div>
        ) : activeView === 'PLAYER' ? (
          /* PLAYER VIEW */
          selectedLottery ? (
            <BetPanel
              lottery={selectedLottery}
              wallet={wallet}
              onBack={() => setSelectedLottery(null)}
              onSubmitSlip={handleSubmitSlip}
              onOpenTopup={() => setTopupModalOpen(true)}
            />
          ) : (
            <>
              {playerTab === 'LOTTERIES' && (
                <LotteryList lotteries={lotteries} onSelectLottery={(l) => setSelectedLottery(l)} />
              )}
              {playerTab === 'MY_SLIPS' && <MySlips slips={slips} onCancelSlip={handleCancelSlip} />}
              {playerTab === 'RESULTS' && <ResultsBoard results={results} />}
              {playerTab === 'RULES' && <RulesAndPayouts />}
            </>
          )
        ) : (
          /* ADMIN BACKEND VIEW */
          <AdminPanel
            lotteries={lotteries}
            slips={slips}
            stats={adminStats}
            wallet={wallet}
            onToggleMarket={handleToggleMarket}
            onUpdatePayouts={handleUpdatePayouts}
            onDrawLottery={handleDrawLottery}
            onAutoDrawLottery={handleAutoDrawLottery}
            onCancelSlip={handleCancelSlip}
            onTopupWallet={handleTopup}
            onResetSystem={handleResetSystem}
          />
        )}
      </main>

      {/* Topup Modal */}
      <TopupModal isOpen={topupModalOpen} onClose={() => setTopupModalOpen(false)} onTopup={handleTopup} />
    </div>
  );
}
