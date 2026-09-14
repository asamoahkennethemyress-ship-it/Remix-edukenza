import React, { useState, useEffect } from 'react';
import { 
  Utensils, 
  Search, 
  QrCode, 
  CreditCard, 
  Plus, 
  Minus, 
  ShoppingBag, 
  CheckCircle2, 
  Printer, 
  Calendar, 
  Clock, 
  User, 
  Package, 
  AlertTriangle, 
  Sparkles, 
  FileText,
  DollarSign,
  Coffee,
  Sun,
  Moon,
  ChevronRight,
  XCircle
} from 'lucide-react';
import { CanteenMenuItem, MealPreOrder, StudentWallet } from '../../types/dailyServicesWallet';
import { 
  fetchCanteenMenu, 
  fetchStudentWallet, 
  deductStudentWallet, 
  createMealPreOrder, 
  fetchMealPreOrders,
  updateMealPreOrderStatus,
  subscribeToCanteenMenu,
  subscribeToMealPreOrders,
  subscribeToStudentWallet,
  saveCanteenMenuItem
} from '../../services/dailyServicesWalletService';

interface Props {
  schoolId: string;
  userRole?: 'canteen_staff' | 'school_admin' | 'parent' | 'student';
  currentStudentId?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  students?: any[];
}

export const CanteenPosAndPreOrders: React.FC<Props> = ({
  schoolId,
  userRole = 'canteen_staff',
  currentStudentId = '',
  showToast,
  students = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'preorder' | 'kitchen_prep'>('pos');
  const [menu, setMenu] = useState<CanteenMenuItem[]>([]);
  const [preOrders, setPreOrders] = useState<MealPreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Menu Item Modal State
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'breakfast' | 'lunch' | 'snacks' | 'drinks'>('lunch');
  const [newItemPrice, setNewItemPrice] = useState('15');
  const [newItemStock, setNewItemStock] = useState('50');
  const [newItemEmoji, setNewItemEmoji] = useState('🍲');
  const [isSavingMenuItem, setIsSavingMenuItem] = useState(false);

  // POS State
  const [posStudentId, setPosStudentId] = useState<string>(currentStudentId || students[0]?.studentId || students[0]?.uid || '');
  const [posWallet, setPosWallet] = useState<StudentWallet | null>(null);
  const [cart, setCart] = useState<Array<{ item: CanteenMenuItem; quantity: number }>>([]);
  const [paymentMode, setPaymentMode] = useState<'wallet' | 'cash'>('wallet');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // Meal Pre-order Form State
  const [preOrderDate, setPreOrderDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [preOrderMealType, setPreOrderMealType] = useState<'breakfast' | 'lunch' | 'snacks' | 'dinner'>('lunch');
  const [selectedPreOrderItems, setSelectedPreOrderItems] = useState<Array<{ item: CanteenMenuItem; quantity: number }>>([]);

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setIsSavingMenuItem(true);
    try {
      await saveCanteenMenuItem({
        schoolId,
        name: newItemName.trim(),
        description: `${newItemName.trim()} prepared fresh daily`,
        category: newItemCategory,
        price: parseFloat(newItemPrice) || 10,
        currency: 'GHS',
        imageEmoji: newItemEmoji || '🍲',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        stockQuantity: parseInt(newItemStock) || 50,
        isAvailable: true
      });

      if (showToast) showToast('Menu item added successfully!', 'success');
      setIsAddMenuModalOpen(false);
      setNewItemName('');
      setNewItemPrice('15');
    } catch (err) {
      if (showToast) showToast('Failed to add menu item', 'error');
    } finally {
      setIsSavingMenuItem(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubMenu = subscribeToCanteenMenu(schoolId, (m) => {
      setMenu(m);
      setLoading(false);
    });
    const unsubOrders = subscribeToMealPreOrders(schoolId, (orders) => {
      setPreOrders(orders);
    });
    const unsubWallet = subscribeToStudentWallet(schoolId, posStudentId, (w) => {
      setPosWallet(w);
    });

    return () => {
      unsubMenu();
      unsubOrders();
      unsubWallet();
    };
  }, [schoolId, posStudentId]);

  const addToCart = (menuItem: CanteenMenuItem) => {
    const existing = cart.find(c => c.item.id === menuItem.id);
    if (existing) {
      setCart(cart.map(c => c.item.id === menuItem.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item: menuItem, quantity: 1 }]);
    }
  };

  const removeFromCart = (menuItemId: string) => {
    const existing = cart.find(c => c.item.id === menuItemId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(c => c.item.id === menuItemId ? { ...c, quantity: c.quantity - 1 } : c));
    } else {
      setCart(cart.filter(c => c.item.id !== menuItemId));
    }
  };

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);

  const handleProcessPosCheckout = async () => {
    if (cart.length === 0 || !posWallet) return;
    setProcessingPayment(true);

    try {
      const itemSummary = cart.map(c => `${c.quantity}x ${c.item.name}`).join(', ');

      if (paymentMode === 'wallet') {
        const result = await deductStudentWallet({
          schoolId,
          studentId: posWallet.studentId,
          amount: cartTotal,
          category: 'canteen',
          type: 'canteen_meal',
          description: `Canteen Purchase: ${itemSummary}`,
          processedBy: 'Canteen Staff POS'
        });

        if (!result.success) {
          if (showToast) showToast(`Payment Failed: ${result.message}`, 'error');
          setProcessingPayment(false);
          return;
        }
      }

      // Generate receipt object
      const receipt = {
        receiptNo: `REC-CAN-${Math.floor(10000 + Math.random() * 90000)}`,
        studentName: posWallet.studentName,
        className: posWallet.className,
        walletId: posWallet.walletId,
        items: [...cart],
        total: cartTotal,
        paymentMode,
        timestamp: new Date().toLocaleString()
      };

      setLastReceipt(receipt);
      setCart([]);
      if (showToast) showToast(`Receipt #${receipt.receiptNo} issued! Meal recorded.`, 'success');
    } catch (err) {
      if (showToast) showToast('POS checkout error', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCreatePreOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPreOrderItems.length === 0 || !posWallet) return;

    const totalAmt = selectedPreOrderItems.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);

    // Deduct wallet for pre-order
    const result = await deductStudentWallet({
      schoolId,
      studentId: posWallet.studentId,
      amount: totalAmt,
      category: 'canteen',
      type: 'canteen_meal',
      description: `Meal Pre-Order (${preOrderMealType.toUpperCase()}) for ${preOrderDate}`,
      processedBy: 'Parent Meal Pre-Order Portal'
    });

    if (!result.success) {
      if (showToast) showToast(`Pre-order Failed: ${result.message}`, 'error');
      return;
    }

    await createMealPreOrder({
      schoolId,
      studentId: posWallet.studentId,
      studentName: posWallet.studentName,
      className: posWallet.className,
      deliveryDate: preOrderDate,
      orderDate: new Date().toISOString().slice(0, 10),
      mealType: preOrderMealType,
      items: selectedPreOrderItems.map(i => ({
        itemId: i.item.id,
        name: i.item.name,
        price: i.item.price,
        quantity: i.quantity
      })),
      totalAmount: totalAmt,
      currency: 'GHS',
      paymentStatus: 'paid_wallet',
      orderStatus: 'ordered'
    });

    if (showToast) showToast(`Meal pre-order confirmed for ${preOrderDate}!`, 'success');
    setSelectedPreOrderItems([]);
  };

  const handleUpdateStatus = async (orderId: string, status: MealPreOrder['orderStatus']) => {
    await updateMealPreOrderStatus(orderId, status);
    if (showToast) showToast(`Pre-order status updated to ${status}`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* HEADER & SUB TABS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#002147] flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#D4AF37]" />
            Canteen POS & Meal Pre-Ordering System
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Instant wallet POS terminal for canteen staff, digital meal pre-ordering for parents & daily kitchen prep board.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('pos')}
              className={`px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'pos' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Canteen POS</span>
            </button>
            <button
              onClick={() => setActiveSubTab('preorder')}
              className={`px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'preorder' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Pre-Order Meals</span>
            </button>
            <button
              onClick={() => setActiveSubTab('kitchen_prep')}
              className={`px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'kitchen_prep' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Kitchen Prep Board</span>
            </button>
          </div>

          {(userRole === 'canteen_staff' || userRole === 'school_admin') && (
            <button
              onClick={() => setIsAddMenuModalOpen(true)}
              className="px-3 py-2 bg-[#002147] hover:bg-[#003366] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Add Menu Item</span>
            </button>
          )}
        </div>
      </div>

      {/* POS TERMINAL VIEW */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* MENU SELECTION GRID */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Select Student:</span>
              </div>
              <select
                value={posStudentId}
                onChange={(e) => setPosStudentId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
              >
                {students.length === 0 ? (
                  <option value="">No registered students found</option>
                ) : (
                  students.map(s => (
                    <option key={s.id || s.uid} value={s.studentId || s.uid}>
                      {s.name || s.fullName || 'Student'} {s.className ? `(${s.className})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {menu.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
                <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No Canteen Items Found</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Add your canteen meals and snacks to start taking POS orders.</p>
                {(userRole === 'canteen_staff' || userRole === 'school_admin') && (
                  <button
                    onClick={() => setIsAddMenuModalOpen(true)}
                    className="px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-[#D4AF37]" />
                    <span>Add First Menu Item</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menu.map((menuItem) => (
                  <div 
                    key={menuItem.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147]/40 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl p-2 bg-slate-50 rounded-xl">{menuItem.imageEmoji}</div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{menuItem.name}</h4>
                        <div className="text-[11px] font-black text-[#002147] mt-0.5">GHS {menuItem.price.toFixed(2)}</div>
                        <span className="text-[9px] text-slate-400">Stock: {menuItem.stockQuantity}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => addToCart(menuItem)}
                      className="p-2 bg-[#002147] hover:bg-[#003366] text-white rounded-xl transition cursor-pointer"
                      title="Add to order"
                    >
                      <Plus className="w-4 h-4 text-[#D4AF37]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHECKOUT CART & RECEIPT SIDEBAR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-[#002147] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                  Active POS Order
                </h3>
                {posWallet && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Bal: GHS {posWallet.balance.toFixed(2)}
                  </span>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Tap meals from the menu to add to order.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto">
                  {cart.map((cartItem) => (
                    <div key={cartItem.item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{cartItem.item.name}</div>
                        <div className="text-[10px] text-slate-400">GHS {cartItem.item.price.toFixed(2)} each</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(cartItem.item.id)}
                          className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-slate-900">{cartItem.quantity}</span>
                        <button
                          onClick={() => addToCart(cartItem.item)}
                          className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-sm font-black text-[#002147]">
                  <span>Total Amount:</span>
                  <span>GHS {cartTotal.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('wallet')}
                    className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      paymentMode === 'wallet'
                        ? 'bg-[#002147] text-white border-[#002147]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Wallet Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      paymentMode === 'cash'
                        ? 'bg-[#002147] text-white border-[#002147]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Cash Pay
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleProcessPosCheckout}
              disabled={cart.length === 0 || processingPayment}
              className="w-full py-3 bg-[#D4AF37] hover:bg-[#b8952b] text-[#002147] font-black rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>{processingPayment ? 'Processing POS...' : 'Charge & Issue Receipt'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MEAL PRE-ORDER TAB */}
      {activeSubTab === 'preorder' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-base text-[#002147]">Pre-Order Daily School Meals</h3>
              <p className="text-xs text-slate-500">Select delivery date, meal type, and pay directly from student wallet.</p>
            </div>
          </div>

          <form onSubmit={handleCreatePreOrderSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Delivery Date</label>
                <input
                  type="date"
                  value={preOrderDate}
                  onChange={(e) => setPreOrderDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meal Type</label>
                <select
                  value={preOrderMealType}
                  onChange={(e) => setPreOrderMealType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="snacks">Snacks</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Student</label>
                <input
                  type="text"
                  disabled
                  value={posWallet ? `${posWallet.studentName || 'Student'} ${posWallet.className ? `(${posWallet.className})` : ''}` : 'No student selected'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Select Meals from Canteen Menu</label>
              {menu.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4">
                  <p className="text-xs font-bold text-slate-600">No menu items currently available for pre-order.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {menu.map((menuItem) => (
                    <button
                      key={menuItem.id}
                      type="button"
                      onClick={() => {
                        const exists = selectedPreOrderItems.find(i => i.item.id === menuItem.id);
                        if (exists) {
                          setSelectedPreOrderItems(selectedPreOrderItems.filter(i => i.item.id !== menuItem.id));
                        } else {
                          setSelectedPreOrderItems([...selectedPreOrderItems, { item: menuItem, quantity: 1 }]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        selectedPreOrderItems.some(i => i.item.id === menuItem.id)
                          ? 'border-[#002147] bg-slate-50 ring-2 ring-[#002147]/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <span className="text-xl mr-2">{menuItem.imageEmoji}</span>
                        <span className="text-xs font-bold text-slate-800">{menuItem.name}</span>
                        <div className="text-[11px] font-black text-[#002147]">GHS {menuItem.price.toFixed(2)}</div>
                      </div>
                      {selectedPreOrderItems.some(i => i.item.id === menuItem.id) && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm font-black text-[#002147]">
                Total: GHS {selectedPreOrderItems.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0).toFixed(2)}
              </div>

              <button
                type="submit"
                disabled={selectedPreOrderItems.length === 0}
                className="px-6 py-2.5 bg-[#002147] text-white font-bold rounded-xl text-xs hover:bg-[#003366] transition cursor-pointer"
              >
                Confirm Pre-Order & Pay
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KITCHEN PREP BOARD TAB */}
      {activeSubTab === 'kitchen_prep' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-base text-[#002147]">Today's Kitchen Preparation Report</h3>
            <span className="text-xs font-bold text-slate-500">{preOrders.length} Active Orders</span>
          </div>

          {preOrders.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No active meal orders scheduled for preparation today.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {preOrders.map((order) => (
                <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{order.studentName} ({order.className})</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {order.mealType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Items: {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={order.orderStatus}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                    >
                      <option value="ordered">Ordered</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready for Pickup</option>
                      <option value="collected">Collected</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD MENU ITEM MODAL */}
      {isAddMenuModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="bg-[#002147] text-white p-5 flex items-center justify-between border-b-4 border-[#D4AF37]">
              <h3 className="font-black text-base flex items-center gap-2">
                <Utensils className="w-5 h-5 text-[#D4AF37]" />
                Add Canteen Menu Item
              </h3>
              <button 
                onClick={() => setIsAddMenuModalOpen(false)} 
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jollof Rice with Grilled Chicken"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="lunch">Lunch</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="snacks">Snacks</option>
                    <option value="drinks">Drinks / Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (GHS) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Emoji Icon</label>
                  <input
                    type="text"
                    value={newItemEmoji}
                    onChange={(e) => setNewItemEmoji(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-center font-bold text-slate-900 focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMenuModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMenuItem}
                  className="px-5 py-2.5 bg-[#002147] hover:bg-[#003366] text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingMenuItem ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
