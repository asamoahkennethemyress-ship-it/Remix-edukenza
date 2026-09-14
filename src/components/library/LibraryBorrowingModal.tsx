import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  BookOpen,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RotateCcw,
  Sparkles,
  Barcode
} from 'lucide-react';
import { LibraryResource, LibraryBorrowRecord } from '../../types/library';
import { LibraryService } from '../../services/libraryService';

interface LibraryBorrowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  resourceToBorrow?: LibraryResource | null;
  currentUserId: string;
  currentUserName: string;
  currentUserGrade?: string;
  userRole: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const LibraryBorrowingModal: React.FC<LibraryBorrowingModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  resourceToBorrow,
  currentUserId,
  currentUserName,
  currentUserGrade = 'Grade 10',
  userRole,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'checkout' | 'my_borrows' | 'scanner'>('checkout');
  const [records, setRecords] = useState<LibraryBorrowRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LibraryBorrowRecord | null>(null);
  const [daysToKeep, setDaysToKeep] = useState<number>(14);
  const [borrowing, setBorrowing] = useState<boolean>(false);
  const [barcodeInput, setBarcodeInput] = useState<string>('');

  useEffect(() => {
    if (!schoolId || !isOpen) return;
    const unsub = LibraryService.subscribeToBorrowRecords(schoolId, (data) => {
      setRecords(data);
    });
    return () => { if (unsub) unsub(); };
  }, [schoolId, isOpen]);

  if (!isOpen) return null;

  const handleConfirmCheckout = async () => {
    if (!resourceToBorrow) return;
    setBorrowing(true);
    try {
      const borrowId = await LibraryService.borrowResource(
        schoolId,
        resourceToBorrow,
        currentUserId,
        currentUserName,
        currentUserGrade,
        daysToKeep
      );
      if (showToast) showToast(`Book borrowed successfully! Due in ${daysToKeep} days.`, 'success');
      setActiveTab('my_borrows');
    } catch (e) {
      console.error('Borrow error:', e);
      if (showToast) showToast('Failed to checkout book', 'error');
    } finally {
      setBorrowing(false);
    }
  };

  const handleReturn = async (record: LibraryBorrowRecord) => {
    try {
      await LibraryService.returnResource(record.id, record.resourceId);
      if (showToast) showToast('Book returned successfully!', 'success');
    } catch (e) {
      if (showToast) showToast('Failed to return book', 'error');
    }
  };

  const handleRenew = async (record: LibraryBorrowRecord) => {
    try {
      await LibraryService.renewResource(record.id, 7);
      if (showToast) showToast('Due date extended by 7 days!', 'success');
    } catch (e) {
      if (showToast) showToast('Failed to renew book', 'error');
    }
  };

  const userRecords = records.filter(r => userRole === 'student' ? r.studentId === currentUserId : true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-[#001c38] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-[#001529] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-wider">
                EDUkenZA Library Circulation & Borrowing
              </span>
              <h2 className="text-sm font-black text-white">QR Code Checkout & Circulation Desk</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="px-6 pt-3 bg-[#001529] border-b border-slate-800 flex gap-4 text-xs font-bold">
          {resourceToBorrow && (
            <button
              onClick={() => setActiveTab('checkout')}
              className={`pb-3 border-b-2 transition cursor-pointer ${
                activeTab === 'checkout' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Checkout Current Book
            </button>
          )}
          <button
            onClick={() => setActiveTab('my_borrows')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'my_borrows' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Active Borrows ({userRecords.filter(r => r.status === 'borrowed').length})
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'scanner' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            ISBN Barcode / QR Scanner
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* CHECKOUT TAB */}
          {activeTab === 'checkout' && resourceToBorrow && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                <img
                  src={resourceToBorrow.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'}
                  alt={resourceToBorrow.title}
                  className="w-16 h-22 object-cover rounded-xl shadow border border-slate-700"
                />
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#D4AF37] text-[#002147]">
                    {resourceToBorrow.category}
                  </span>
                  <h3 className="text-sm font-black text-white mt-1">{resourceToBorrow.title}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{resourceToBorrow.author} • {resourceToBorrow.subject}</p>
                  {resourceToBorrow.isPhysical && (
                    <p className="text-amber-400 font-bold text-[11px] mt-1">
                      Available Copies: {resourceToBorrow.availablePhysicalCopies || 0} / {resourceToBorrow.totalPhysicalCopies || 0} • {resourceToBorrow.shelfLocation || 'Shelf A1'}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-300 font-bold block">Select Loan Duration (Days)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[7, 14, 21].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysToKeep(d)}
                      className={`p-3 rounded-2xl border text-center font-bold cursor-pointer transition ${
                        daysToKeep === d
                          ? 'bg-[#D4AF37] text-[#002147] border-[#D4AF37] font-black'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#001529] border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Borrower: {currentUserName}</p>
                  <p className="text-[10px] text-slate-400">Class: {currentUserGrade}</p>
                </div>
                <button
                  onClick={handleConfirmCheckout}
                  disabled={borrowing}
                  className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
                >
                  {borrowing ? 'Processing...' : 'Confirm Book Loan'}
                </button>
              </div>
            </div>
          )}

          {/* MY BORROWS TAB */}
          {activeTab === 'my_borrows' && (
            <div className="space-y-3">
              {userRecords.length === 0 ? (
                <p className="text-slate-400 italic text-center py-8">No active or historical borrowed books found.</p>
              ) : (
                userRecords.map(rec => {
                  const isOverdue = rec.status === 'borrowed' && new Date(rec.dueDate) < new Date();
                  return (
                    <div key={rec.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-bold shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-white">{rec.resourceTitle}</h4>
                          <p className="text-[11px] text-slate-400">
                            Borrowed: {new Date(rec.borrowedAt).toLocaleDateString()} • Due: <span className={isOverdue ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>{new Date(rec.dueDate).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {rec.status === 'borrowed' ? (
                          <>
                            <button
                              onClick={() => handleRenew(rec)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold cursor-pointer"
                            >
                              Renew (+7 Days)
                            </button>
                            <button
                              onClick={() => handleReturn(rec)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                            >
                              Return Book
                            </button>
                          </>
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-400 font-bold text-[10px] uppercase">
                            Returned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SCANNER SIMULATOR TAB */}
          {activeTab === 'scanner' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-slate-900 border-2 border-dashed border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                <Barcode className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Library Barcode & ISBN Quick Lookup</h3>
                <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1">
                  Scan physical book barcode sticker or enter ISBN manually to fetch library inventory record.
                </p>
              </div>

              <div className="flex gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or enter ISBN (e.g. 978-0-620-89101-2)..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                />
                <button
                  onClick={() => {
                    if (showToast) showToast(`Barcode ${barcodeInput || '978-0-620-89101-2'} scanned successfully!`, 'success');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-[#002147] font-black cursor-pointer"
                >
                  Lookup
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
