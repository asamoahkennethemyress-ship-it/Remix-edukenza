import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  PackageCheck, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  CheckCircle2, 
  CreditCard, 
  DollarSign, 
  BookOpen, 
  Shirt, 
  Printer, 
  Sparkles,
  Save,
  XCircle,
  History,
  TrendingDown,
  Layers
} from 'lucide-react';
import { ShopProduct, StudentWallet, InventoryLog } from '../../types/dailyServicesWallet';
import { 
  fetchShopProducts, 
  saveShopProduct, 
  fetchStudentWallet, 
  deductStudentWallet,
  subscribeToShopProducts,
  adjustProductStock,
  subscribeToInventoryLogs
} from '../../services/dailyServicesWalletService';

interface Props {
  schoolId: string;
  userRole?: 'school_admin' | 'parent' | 'student';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  students?: any[];
}

export const SchoolShopAndInventory: React.FC<Props> = ({
  schoolId,
  userRole = 'school_admin',
  showToast,
  students = []
}) => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'catalogue' | 'logs'>('catalogue');

  // Checkout State
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.studentId || students[0]?.uid || '');
  const [buyingProduct, setBuyingProduct] = useState<ShopProduct | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Modal State for New/Edit Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ShopProduct['category']>('stationery');
  const [price, setPrice] = useState(15);
  const [stock, setStock] = useState(50);
  const [description, setDescription] = useState('');

  // Restock / Stock Adjustment Modal State
  const [adjustingProduct, setAdjustingProduct] = useState<ShopProduct | null>(null);
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustReason, setAdjustReason] = useState('Supplier Delivery / Restock');
  const [adjustLoading, setAdjustLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubProducts = subscribeToShopProducts(schoolId, (data) => {
      setProducts(data);
      setLoading(false);
    });

    const unsubLogs = subscribeToInventoryLogs(schoolId, (logs) => {
      setInventoryLogs(logs);
    });

    return () => {
      unsubProducts();
      unsubLogs();
    };
  }, [schoolId]);

  const handleOpenModal = (product?: ShopProduct) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setCategory(product.category);
      setPrice(product.price);
      setStock(product.stock);
      setDescription(product.description || '');
    } else {
      setEditingProduct(null);
      setName('');
      setCategory('stationery');
      setPrice(20);
      setStock(100);
      setDescription('');
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveShopProduct({
        id: editingProduct?.id,
        schoolId,
        name,
        category,
        price: Number(price),
        currency: 'GHS',
        stock: Number(stock),
        description
      });

      if (showToast) showToast(`Shop product "${name}" saved!`, 'success');
      setIsModalOpen(false);
    } catch (err) {
      if (showToast) showToast('Failed to save shop product', 'error');
    }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustQty === 0) return;
    setAdjustLoading(true);

    try {
      const isIncrease = adjustQty > 0;
      await adjustProductStock({
        schoolId,
        productId: adjustingProduct.id,
        adjustmentType: isIncrease ? 'stock_in' : 'stock_out',
        quantity: Math.abs(adjustQty),
        notes: adjustReason,
        staffName: userRole === 'school_admin' ? 'School Admin' : 'Store Clerk'
      });

      showToast?.(`Inventory stock updated for ${adjustingProduct.name}!`, 'success');
      setAdjustingProduct(null);
    } catch (err) {
      showToast?.('Failed to adjust stock', 'error');
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleBuyProduct = async () => {
    if (!buyingProduct || buyQuantity <= 0) return;
    setCheckoutLoading(true);

    try {
      const wallet = await fetchStudentWallet(schoolId, selectedStudentId);
      const totalCost = buyingProduct.price * buyQuantity;

      const result = await deductStudentWallet({
        schoolId,
        studentId: wallet.studentId,
        amount: totalCost,
        category: 'shop',
        type: 'shop_purchase',
        description: `School Store Purchase: ${buyQuantity}x ${buyingProduct.name}`,
        processedBy: 'School Store Register'
      });

      if (!result.success) {
        if (showToast) showToast(`Checkout Failed: ${result.message}`, 'error');
        setCheckoutLoading(false);
        return;
      }

      // Deduct inventory stock atomically with audit logging
      await adjustProductStock({
        schoolId,
        productId: buyingProduct.id,
        adjustmentType: 'stock_out',
        quantity: buyQuantity,
        notes: `Student POS Checkout for ${wallet.studentName}`,
        staffName: 'POS Terminal'
      });

      if (showToast) showToast(`Purchased ${buyQuantity}x ${buyingProduct.name} via Student Wallet!`, 'success');
      setBuyingProduct(null);
    } catch (err) {
      if (showToast) showToast('Shop checkout failed', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (cat: ShopProduct['category']) => {
    switch (cat) {
      case 'uniform': return Shirt;
      case 'stationery': return BookOpen;
      case 'learning_materials': return BookOpen;
      default: return PackageCheck;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#002147] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
            School Store, Uniforms & Inventory Ecosystem
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage uniforms, exercise books, calculators, and stationery with atomic inventory tracking and wallet checkout.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {userRole === 'school_admin' && (
            <>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('catalogue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'catalogue' ? 'bg-white text-[#002147] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Store Catalog
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'logs' ? 'bg-white text-[#002147] shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Logs</span>
                </button>
              </div>

              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-[#002147] text-white rounded-xl text-xs font-bold hover:bg-[#003366] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>Add Item</span>
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'catalogue' ? (
        <>
          {/* FILTER & SEARCH */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search uniforms, books, or stationery..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Store Categories</option>
              <option value="uniform">School Uniforms</option>
              <option value="stationery">Exercise Books & Stationery</option>
              <option value="equipment">STEM & Lab Equipment</option>
              <option value="learning_materials">Learning Materials</option>
            </select>
          </div>

          {/* PRODUCTS GRID */}
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-medium">Loading inventory catalogue...</div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Store Items Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto mb-4">
                No items have been registered in the school store catalog. Click below to add textbooks, uniforms, or stationery.
              </p>
              {userRole === 'school_admin' && (
                <button
                  onClick={() => handleOpenModal()}
                  className="px-4 py-2 bg-[#002147] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                >
                  Add First Store Item
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredProducts.map((product) => {
                const Icon = getCategoryIcon(product.category);
                const isLowStock = product.stock < 20;

                return (
                  <div 
                    key={product.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-3 bg-slate-100 text-[#002147] rounded-xl">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isLowStock ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isLowStock ? `Low Stock (${product.stock})` : `In Stock (${product.stock})`}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-xs">{product.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{product.description || 'Standard school supplies item'}</p>
                      
                      <div className="text-base font-black text-[#002147] mt-3">
                        GHS {product.price.toFixed(2)}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setBuyingProduct(product);
                          setBuyQuantity(1);
                        }}
                        disabled={product.stock <= 0}
                        className="flex-1 py-2 bg-[#002147] hover:bg-[#003366] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>{product.stock <= 0 ? 'Out of Stock' : 'Wallet Buy'}</span>
                      </button>

                      {userRole === 'school_admin' && (
                        <>
                          <button
                            title="Restock / Adjust Inventory"
                            onClick={() => {
                              setAdjustingProduct(product);
                              setAdjustQty(25);
                              setAdjustReason('Supplier Restock');
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg text-[#002147] transition cursor-pointer font-bold text-xs"
                          >
                            <Layers className="w-4 h-4 text-[#D4AF37]" />
                          </button>
                          <button
                            title="Edit Item"
                            onClick={() => handleOpenModal(product)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* INVENTORY AUDIT LOGS TAB */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-base text-[#002147] flex items-center gap-2">
              <History className="w-5 h-5 text-[#D4AF37]" />
              Real-Time Inventory & Restock Audit Trail
            </h3>
            <span className="text-xs text-slate-400 font-medium">Logged securely in Firestore</span>
          </div>

          {inventoryLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No inventory adjustment records found.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {inventoryLogs.map(log => {
                const isAddition = log.type === 'stock_in' || log.type === 'adjustment';
                return (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl font-bold ${
                        isAddition ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isAddition ? `+${log.quantity}` : `-${log.quantity}`}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{log.productName}</div>
                        <div className="text-[11px] text-slate-500">
                          {log.notes || log.type} • By: {log.staffName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-700 font-mono text-[11px]">
                        {log.previousStock} → <span className="font-bold text-slate-900">{log.newStock}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* WALLET BUY CHECKOUT MODAL */}
      {buyingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-[#002147] text-white p-5 flex items-center justify-between border-b-4 border-[#D4AF37]">
              <h3 className="font-black text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                Instant Wallet Item Purchase
              </h3>
              <button onClick={() => setBuyingProduct(null)} className="text-slate-300 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs font-black text-[#002147]">{buyingProduct.name}</div>
                <div className="text-xs text-slate-600">GHS {buyingProduct.price.toFixed(2)} per unit</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Student Wallet</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  {students.length === 0 ? (
                    <option value="">No registered students found</option>
                  ) : (
                    students.map(s => (
                      <option key={s.id || s.uid} value={s.studentId || s.uid || s.id}>
                        {s.name || s.fullName || 'Student'} {s.className ? `(${s.className})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={buyingProduct.stock}
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-sm font-black text-[#002147]">
                  Total: GHS {(buyingProduct.price * buyQuantity).toFixed(2)}
                </div>

                <button
                  onClick={handleBuyProduct}
                  disabled={checkoutLoading}
                  className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#b8952b] text-[#002147] font-black rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {checkoutLoading ? 'Processing...' : 'Confirm Wallet Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESTOCK / ADJUST STOCK MODAL */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-[#002147] text-white p-5 flex items-center justify-between border-b-4 border-[#D4AF37]">
              <h3 className="font-black text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#D4AF37]" />
                Adjust / Restock Stock
              </h3>
              <button onClick={() => setAdjustingProduct(null)} className="text-slate-300 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Product</span>
                <div className="text-xs font-black text-[#002147]">{adjustingProduct.name}</div>
                <div className="text-xs text-slate-600 mt-0.5">Current In-Stock: <span className="font-bold">{adjustingProduct.stock} units</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock Delta (Use positive for restock, negative for deduction)</label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Note</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="px-5 py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {adjustLoading ? 'Updating Stock...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT/CREATE ITEM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-[#002147] text-white p-5 flex items-center justify-between border-b-4 border-[#D4AF37]">
              <h3 className="font-black text-base">
                {editingProduct ? 'Edit Store Item' : 'Add New Store Item'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="uniform">Uniforms</option>
                  <option value="stationery">Stationery</option>
                  <option value="equipment">Equipment</option>
                  <option value="learning_materials">Learning Materials</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (GHS) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002147] text-white rounded-xl text-xs font-bold hover:bg-[#003366]"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
