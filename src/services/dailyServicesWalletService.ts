import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { enqueueWalletTransaction } from './offlineSyncService';
import {
  DailyService,
  StudentServiceEnrollment,
  StudentWallet,
  WalletTransaction,
  WalletTransactionType,
  CanteenMenuItem,
  MealPreOrder,
  InventoryItem,
  ShopProduct,
  InventoryLog,
  TransportBus,
  TransportRoute,
  BusLiveStatus,
  TransportAttendance,
  DailyServicesMetrics,
  DailyServiceCategory
} from '../types/dailyServicesWallet';
import { sendNotification } from './notificationService';

// ==========================================
// 1. DAILY SERVICES MANAGEMENT
// ==========================================

export async function fetchDailyServices(schoolId: string): Promise<DailyService[]> {
  const path = 'dailyServices';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyService));
  } catch (err) {
    console.error('Error fetching daily services:', err);
    return [];
  }
}

export async function saveDailyService(serviceData: Omit<DailyService, 'id'> & { id?: string }): Promise<string> {
  const path = 'dailyServices';
  try {
    const now = new Date().toISOString();
    if (serviceData.id) {
      const docRef = doc(db, path, serviceData.id);
      await updateDoc(docRef, { ...serviceData, updatedAt: now });
      return serviceData.id;
    } else {
      const colRef = collection(db, path);
      const docRef = await addDoc(colRef, { ...serviceData, createdAt: now });
      return docRef.id;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function deleteDailyService(serviceId: string): Promise<void> {
  const path = `dailyServices/${serviceId}`;
  try {
    await deleteDoc(doc(db, 'dailyServices', serviceId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==========================================
// 2. STUDENT SERVICE ENROLLMENT
// ==========================================

export async function fetchStudentEnrollments(schoolId: string, studentId?: string): Promise<StudentServiceEnrollment[]> {
  const path = 'studentEnrollments';
  try {
    const colRef = collection(db, path);
    let q = query(colRef, where('schoolId', '==', schoolId));
    if (studentId) {
      q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentServiceEnrollment));
  } catch (err) {
    console.warn('Error fetching student enrollments:', err);
    return [];
  }
}

export async function enrollStudentInService(
  enrollment: Omit<StudentServiceEnrollment, 'id'>
): Promise<string> {
  const path = 'studentEnrollments';
  try {
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, {
      ...enrollment,
      assignedDate: new Date().toISOString(),
      status: 'active'
    });

    // Send notification
    await sendNotification({
      recipientId: enrollment.studentId,
      recipientRole: 'student',
      schoolId: enrollment.schoolId,
      title: `Service Enrolled: ${enrollment.serviceName}`,
      message: `You have been active enrolled in daily service '${enrollment.serviceName}' (${enrollment.billingFrequency} GHS ${enrollment.cost}).`,
      type: 'System Alert',
      createdBy: 'Daily Services Office'
    });

    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

// ==========================================
// 3. STUDENT DIGITAL WALLET & TRANSACTIONS
// ==========================================

export async function fetchStudentWallet(schoolId: string, studentId: string): Promise<StudentWallet> {
  const path = 'studentWallets';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as StudentWallet;
    }

    // Look up student details if available
    let sName = 'Student';
    let sClass = '';
    try {
      const studentQ = query(collection(db, 'students'), where('schoolId', '==', schoolId), where('studentId', '==', studentId));
      const sSnap = await getDocs(studentQ);
      if (!sSnap.empty) {
        const sData = sSnap.docs[0].data();
        sName = sData.name || sData.fullName || 'Student';
        sClass = sData.className || '';
      }
    } catch (_) {}

    const walletId = `WAL-EDUK-${Math.floor(10000 + Math.random() * 90000)}`;
    const qrCodeData = `EDUK-CARD-${studentId}-${walletId}`;

    const newWallet: Omit<StudentWallet, 'id'> = {
      schoolId,
      studentId,
      studentName: sName,
      className: sClass,
      walletId,
      qrCodeData,
      nfcCardId: `NFC-${Math.floor(1000 + Math.random() * 9000)}`,
      balance: 0.00,
      currency: 'GHS',
      dailyLimit: 50.00,
      dailySpent: 0.00,
      weeklyLimit: 250.00,
      weeklySpent: 0.00,
      monthlyLimit: 1000.00,
      monthlySpent: 0.00,
      autoTopUpEnabled: false,
      autoTopUpThreshold: 20.00,
      autoTopUpAmount: 50.00,
      disabledCategories: [],
      status: 'active',
      lastUpdated: new Date().toISOString()
    };

    const docRef = await addDoc(colRef, newWallet);
    return { id: docRef.id, ...newWallet };
  } catch (err) {
    console.warn('Error fetching wallet, returning empty structural object:', err);
    return {
      id: '',
      schoolId,
      studentId,
      studentName: 'Student',
      className: '',
      walletId: '',
      qrCodeData: '',
      nfcCardId: '',
      balance: 0.00,
      currency: 'GHS',
      dailyLimit: 50.00,
      dailySpent: 0.00,
      weeklyLimit: 250.00,
      weeklySpent: 0.00,
      monthlyLimit: 1000.00,
      monthlySpent: 0.00,
      autoTopUpEnabled: false,
      autoTopUpThreshold: 20.00,
      autoTopUpAmount: 50.00,
      disabledCategories: [],
      status: 'active',
      lastUpdated: new Date().toISOString()
    };
  }
}

export async function updateStudentWalletLimits(
  walletId: string,
  limits: {
    dailyLimit?: number;
    weeklyLimit?: number;
    monthlyLimit?: number;
    autoTopUpEnabled?: boolean;
    autoTopUpThreshold?: number;
    autoTopUpAmount?: number;
    disabledCategories?: DailyServiceCategory[];
    status?: 'active' | 'frozen' | 'closed';
  }
): Promise<void> {
  const path = `studentWallets/${walletId}`;
  try {
    const docRef = doc(db, 'studentWallets', walletId);
    await updateDoc(docRef, {
      ...limits,
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function topUpStudentWallet(params: {
  walletId: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentMethod: 'momo_mtn' | 'telecel_cash' | 'airteltigo' | 'card_visa_mc' | 'bank_transfer' | 'cash';
  reference: string;
  processedBy?: string;
}): Promise<{ newBalance: number; transactionId: string }> {
  if (params.amount <= 0) {
    throw new Error('Top-up amount must be strictly greater than zero');
  }

  const wallet = await fetchStudentWallet(params.schoolId, params.studentId);
  const walletDocRef = doc(db, 'studentWallets', wallet.id);
  const txnDocRef = doc(collection(db, 'walletTransactions'));
  const now = new Date().toISOString();
  let finalBalance = 0;

  try {
    await runTransaction(db, async (txn) => {
      const snap = await txn.get(walletDocRef);
      if (!snap.exists()) {
        throw new Error('Student wallet document not found');
      }
      const data = snap.data() as StudentWallet;
      const prevBal = Number(data.balance) || 0;
      finalBalance = prevBal + Number(params.amount);

      txn.update(walletDocRef, {
        balance: finalBalance,
        lastUpdated: now
      });

      txn.set(txnDocRef, {
        walletId: data.walletId || wallet.walletId,
        studentId: params.studentId,
        studentName: params.studentName || data.studentName,
        schoolId: params.schoolId,
        type: 'topup',
        amount: Number(params.amount),
        previousBalance: prevBal,
        newBalance: finalBalance,
        description: `Wallet Top-Up via ${params.paymentMethod.toUpperCase()}`,
        category: 'Top Up',
        paymentMethod: params.paymentMethod,
        reference: params.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        date: now,
        processedBy: params.processedBy || 'Parent Self-Service Portal',
        status: 'successful'
      });
    });

    // Notify parent & student
    await sendNotification({
      recipientId: params.studentId,
      recipientRole: 'student',
      schoolId: params.schoolId,
      title: `Wallet Top-Up Successful (+GHS ${params.amount.toFixed(2)})`,
      message: `Your student wallet has been credited with GHS ${params.amount.toFixed(2)}. New balance: GHS ${finalBalance.toFixed(2)}.`,
      type: 'Payment',
      createdBy: 'Wallet Gateway'
    });

    return { newBalance: finalBalance, transactionId: txnDocRef.id };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, `studentWallets/${wallet.id}`);
    throw err;
  }
}

export async function deductStudentWallet(params: {
  schoolId: string;
  studentId: string;
  amount: number;
  category: DailyServiceCategory | string;
  type: WalletTransactionType;
  description: string;
  processedBy?: string;
}): Promise<{ success: boolean; newBalance: number; message: string }> {
  if (params.amount <= 0) {
    return { success: false, newBalance: 0, message: 'Deduction amount must be strictly greater than zero.' };
  }

  const wallet = await fetchStudentWallet(params.schoolId, params.studentId);
  const walletDocRef = doc(db, 'studentWallets', wallet.id);
  const txnDocRef = doc(collection(db, 'walletTransactions'));
  const now = new Date().toISOString();

  // If client is offline, use sync queue safely
  if (!navigator.onLine) {
    const prev = wallet.balance || 0;
    const next = Math.max(0, prev - params.amount);
    const txnData = {
      walletId: wallet.walletId,
      studentId: params.studentId,
      studentName: wallet.studentName,
      schoolId: params.schoolId,
      type: params.type,
      amount: params.amount,
      previousBalance: prev,
      newBalance: next,
      description: params.description,
      category: params.category,
      paymentMethod: 'wallet_deduction' as const,
      reference: `DED-OFFLINE-${Date.now()}`,
      date: now,
      processedBy: params.processedBy || 'Canteen POS Terminal',
      status: 'successful' as const
    };
    await enqueueWalletTransaction(txnData);
    wallet.balance = next;
    return { success: true, newBalance: next, message: 'Transaction queued offline. Will sync with cloud securely.' };
  }

  let finalBalance = wallet.balance;

  try {
    const result = await runTransaction(db, async (txn) => {
      const snap = await txn.get(walletDocRef);
      if (!snap.exists()) {
        throw new Error('Student wallet document not found');
      }
      const data = snap.data() as StudentWallet;

      // Check frozen status
      if (data.status === 'frozen') {
        throw new Error('Wallet is currently FROZEN by parent or school administrator.');
      }

      // Check disabled categories
      if (data.disabledCategories && data.disabledCategories.includes(params.category as DailyServiceCategory)) {
        throw new Error(`Purchases in category '${params.category}' are restricted for this student.`);
      }

      const currentDailySpent = Number(data.dailySpent) || 0;
      if (data.dailyLimit && (currentDailySpent + params.amount) > data.dailyLimit) {
        throw new Error(`Exceeds daily spending limit of GHS ${data.dailyLimit.toFixed(2)}.`);
      }

      const currentBalance = Number(data.balance) || 0;
      if (currentBalance < params.amount) {
        throw new Error(`Insufficient wallet balance. Current: GHS ${currentBalance.toFixed(2)}, Required: GHS ${params.amount.toFixed(2)}.`);
      }

      const previousBalance = currentBalance;
      const newBalance = previousBalance - params.amount;
      const newDailySpent = currentDailySpent + params.amount;

      txn.update(walletDocRef, {
        balance: newBalance,
        dailySpent: newDailySpent,
        lastUpdated: now
      });

      txn.set(txnDocRef, {
        walletId: data.walletId || wallet.walletId,
        studentId: params.studentId,
        studentName: data.studentName || wallet.studentName,
        schoolId: params.schoolId,
        type: params.type,
        amount: params.amount,
        previousBalance,
        newBalance,
        description: params.description,
        category: params.category,
        paymentMethod: 'wallet_deduction',
        reference: `DED-${Math.floor(100000 + Math.random() * 900000)}`,
        date: now,
        processedBy: params.processedBy || 'Canteen POS Terminal',
        status: 'successful'
      });

      return { newBalance, autoTopUpThreshold: data.autoTopUpThreshold };
    });

    finalBalance = result.newBalance;

    // Check low balance threshold and notify
    if (finalBalance < (result.autoTopUpThreshold || 20.00)) {
      await sendNotification({
        recipientId: params.studentId,
        recipientRole: 'student',
        schoolId: params.schoolId,
        title: 'Low Wallet Balance Alert',
        message: `Your wallet balance is low (GHS ${finalBalance.toFixed(2)} remaining). Please top up soon.`,
        type: 'System Alert',
        createdBy: 'Wallet System'
      });
    }

    return { success: true, newBalance: finalBalance, message: 'Deduction successful' };
  } catch (err: any) {
    const msg = err?.message || 'Wallet transaction failed';
    return { success: false, newBalance: finalBalance, message: msg };
  }
}

export async function fetchWalletTransactions(schoolId: string, studentId?: string): Promise<WalletTransaction[]> {
  const path = 'walletTransactions';
  try {
    const colRef = collection(db, path);
    let q = query(colRef, where('schoolId', '==', schoolId), orderBy('date', 'desc'));
    if (studentId) {
      q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId), orderBy('date', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WalletTransaction));
  } catch (err) {
    console.warn('Error fetching wallet transactions:', err);
    return [];
  }
}

// ==========================================
// 4. CANTEEN MENU & MEAL PRE-ORDERS
// ==========================================

export async function fetchCanteenMenu(schoolId: string): Promise<CanteenMenuItem[]> {
  const path = 'canteenMenu';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CanteenMenuItem));
  } catch (err) {
    console.error('Error fetching canteen menu:', err);
    return [];
  }
}

export async function saveCanteenMenuItem(item: Omit<CanteenMenuItem, 'id'> & { id?: string }): Promise<string> {
  const path = 'canteenMenu';
  try {
    if (item.id) {
      const docRef = doc(db, path, item.id);
      await updateDoc(docRef, { ...item });
      return item.id;
    } else {
      const colRef = collection(db, path);
      const docRef = await addDoc(colRef, item);
      return docRef.id;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function createMealPreOrder(orderData: Omit<MealPreOrder, 'id' | 'createdAt'>): Promise<MealPreOrder> {
  const path = 'mealPreOrders';
  try {
    const now = new Date().toISOString();
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, {
      ...orderData,
      createdAt: now
    });

    // Reduce inventory / canteen menu stock automatically
    for (const item of orderData.items) {
      if (item.itemId) {
        try {
          const itemRef = doc(db, 'canteenMenu', item.itemId);
          const itemSnap = await getDoc(itemRef);
          if (itemSnap.exists()) {
            const currentStock = itemSnap.data().stockQuantity || 0;
            await updateDoc(itemRef, { stockQuantity: Math.max(0, currentStock - item.quantity) });
          }
        } catch (e) {
          console.warn('Inventory update failed for item:', item.itemId);
        }
      }
    }

    // Notify parent and canteen staff
    await sendNotification({
      recipientId: orderData.studentId,
      recipientRole: 'student',
      schoolId: orderData.schoolId,
      title: `Meal Pre-Order Confirmed (#${docRef.id.slice(0, 6).toUpperCase()})`,
      message: `Pre-order for ${orderData.mealType.toUpperCase()} on ${orderData.deliveryDate} has been confirmed. Total GHS ${orderData.totalAmount.toFixed(2)}.`,
      type: 'System Alert',
      createdBy: 'Canteen Kitchen'
    });

    return { id: docRef.id, ...orderData, createdAt: now };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function fetchMealPreOrders(schoolId: string, studentId?: string): Promise<MealPreOrder[]> {
  const path = 'mealPreOrders';
  try {
    const colRef = collection(db, path);
    let q = query(colRef, where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'));
    if (studentId) {
      q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MealPreOrder));
  } catch (err) {
    console.warn('Error fetching meal preorders:', err);
    return [];
  }
}

export async function updateMealPreOrderStatus(orderId: string, status: MealPreOrder['orderStatus']): Promise<void> {
  const path = `mealPreOrders/${orderId}`;
  try {
    const docRef = doc(db, 'mealPreOrders', orderId);
    await updateDoc(docRef, { orderStatus: status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ==========================================
// 5. INVENTORY & SCHOOL SHOP MANAGEMENT
// ==========================================

export async function fetchShopProducts(schoolId: string): Promise<ShopProduct[]> {
  const path = 'shopProducts';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ShopProduct));
  } catch (err) {
    console.error('Error fetching shop products:', err);
    return [];
  }
}

export async function saveShopProduct(product: Omit<ShopProduct, 'id'> & { id?: string }): Promise<string> {
  const path = 'shopProducts';
  try {
    if (product.id) {
      const docRef = doc(db, path, product.id);
      await updateDoc(docRef, { ...product });
      return product.id;
    } else {
      const colRef = collection(db, path);
      const docRef = await addDoc(colRef, product);
      return docRef.id;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

// ==========================================
// 6. TRANSPORT & LIVE BUS TRACKING & ATTENDANCE
// ==========================================

export async function fetchTransportBuses(schoolId: string): Promise<TransportBus[]> {
  const path = 'transportBuses';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransportBus));
  } catch (err) {
    console.error('Error fetching buses:', err);
    return [];
  }
}

export async function saveTransportBus(bus: Omit<TransportBus, 'id'> & { id?: string }): Promise<string> {
  const path = 'transportBuses';
  try {
    if (bus.id) {
      const docRef = doc(db, path, bus.id);
      await updateDoc(docRef, { ...bus });
      return bus.id;
    } else {
      const colRef = collection(db, path);
      const docRef = await addDoc(colRef, bus);
      return docRef.id;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function fetchTransportRoutes(schoolId: string): Promise<TransportRoute[]> {
  const path = 'transportRoutes';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransportRoute));
  } catch (err) {
    console.error('Error fetching routes:', err);
    return [];
  }
}

export async function saveTransportRoute(route: Omit<TransportRoute, 'id'> & { id?: string }): Promise<string> {
  const path = 'transportRoutes';
  try {
    if (route.id) {
      const docRef = doc(db, path, route.id);
      await updateDoc(docRef, { ...route });
      return route.id;
    } else {
      const colRef = collection(db, path);
      const docRef = await addDoc(colRef, route);
      return docRef.id;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function recordTransportAttendance(params: Omit<TransportAttendance, 'id' | 'timestamp'>): Promise<string> {
  const path = 'transportAttendance';
  try {
    const now = new Date().toISOString();
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, {
      ...params,
      timestamp: now
    });

    // Real-time parent notification when student boards or exits bus
    await sendNotification({
      recipientId: params.studentId,
      recipientRole: 'student',
      schoolId: params.schoolId,
      title: `Bus ${params.action.toUpperCase()} Alert`,
      message: `${params.studentName} ${params.action} ${params.routeName} at stop '${params.stopName}' (${now.slice(11, 16)}).`,
      type: 'Attendance',
      createdBy: 'Bus Attendance Scanner'
    });

    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function fetchTransportAttendanceLogs(schoolId: string, studentId?: string): Promise<TransportAttendance[]> {
  const path = 'transportAttendance';
  try {
    const colRef = collection(db, path);
    let q = query(colRef, where('schoolId', '==', schoolId), orderBy('timestamp', 'desc'));
    if (studentId) {
      q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId), orderBy('timestamp', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransportAttendance));
  } catch (err) {
    console.warn('Error fetching bus attendance logs:', err);
    return [];
  }
}

export async function recordInventoryLog(log: Omit<InventoryLog, 'id' | 'timestamp'>): Promise<string> {
  const path = 'inventoryLogs';
  try {
    const now = new Date().toISOString();
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, {
      ...log,
      timestamp: now
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function adjustProductStock(params: {
  schoolId: string;
  productId: string;
  adjustmentType: 'stock_in' | 'stock_out' | 'damaged' | 'adjustment';
  quantity: number;
  unitPrice?: number;
  supplierName?: string;
  storeLocation?: string;
  staffName: string;
  staffUid?: string;
  notes?: string;
}): Promise<{ newStock: number }> {
  const productRef = doc(db, 'shopProducts', params.productId);
  const now = new Date().toISOString();
  let resultingStock = 0;

  await runTransaction(db, async (txn) => {
    const snap = await txn.get(productRef);
    if (!snap.exists()) {
      throw new Error('Product not found');
    }
    const product = snap.data() as ShopProduct;
    const prevStock = Number(product.stock) || 0;
    const change = (params.adjustmentType === 'stock_in') ? params.quantity : -params.quantity;
    resultingStock = Math.max(0, prevStock + change);

    txn.update(productRef, {
      stock: resultingStock,
      updatedAt: now
    });

    const logRef = doc(collection(db, 'inventoryLogs'));
    txn.set(logRef, {
      schoolId: params.schoolId,
      productId: params.productId,
      productName: product.name,
      type: params.adjustmentType,
      quantity: params.quantity,
      previousStock: prevStock,
      newStock: resultingStock,
      unitPrice: params.unitPrice || product.price || 0,
      supplierName: params.supplierName || product.supplierName || '',
      storeLocation: params.storeLocation || product.storeLocation || '',
      staffName: params.staffName,
      staffUid: params.staffUid || '',
      notes: params.notes || '',
      timestamp: now
    });
  });

  return { newStock: resultingStock };
}

export function subscribeToInventoryLogs(schoolId: string, callback: (logs: InventoryLog[]) => void): Unsubscribe {
  const colRef = collection(db, 'inventoryLogs');
  const q = query(colRef, where('schoolId', '==', schoolId), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryLog)));
  }, (err) => {
    console.warn('Realtime inventoryLogs warning:', err);
  });
}

export async function updateBusTelemetry(params: {
  schoolId: string;
  busId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  address?: string;
  gpsStatus?: 'connected' | 'standby' | 'offline';
}): Promise<void> {
  const path = 'transportBuses';
  try {
    const busRef = doc(db, path, params.busId);
    const now = new Date().toISOString();
    await updateDoc(busRef, {
      gpsStatus: params.gpsStatus || 'connected',
      currentLocation: {
        lat: params.lat,
        lng: params.lng,
        speed: params.speed || 0,
        heading: params.heading || 0,
        address: params.address || '',
        lastPing: now
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

// ==========================================
// 7. AI PREDICTIVE ANALYTICS ENGINE (STRICTLY REAL DATA)
// ==========================================

export async function generateAiServicesAnalytics(schoolId: string) {
  const [services, menu, products, preorders, transactions, enrollments, studentsSnap] = await Promise.all([
    fetchDailyServices(schoolId),
    fetchCanteenMenu(schoolId),
    fetchShopProducts(schoolId),
    fetchMealPreOrders(schoolId),
    fetchWalletTransactions(schoolId),
    fetchStudentEnrollments(schoolId),
    getDocs(query(collection(db, 'students'), where('schoolId', '==', schoolId))).catch(() => ({ docs: [] } as any))
  ]);

  const studentsCount = studentsSnap.docs ? studentsSnap.docs.length : 0;

  // 1. Meal Demand Prediction from real preorders and menu
  const orderCountsByMeal: Record<string, number> = {};
  preorders.forEach(po => {
    po.items?.forEach(item => {
      orderCountsByMeal[item.name] = (orderCountsByMeal[item.name] || 0) + (item.quantity || 1);
    });
  });

  const mealDemandPrediction = menu.length > 0
    ? menu.map(m => {
        const pastOrders = orderCountsByMeal[m.name] || 0;
        const predicted = pastOrders > 0 ? Math.round(pastOrders * 1.15) : Math.max(5, Math.round((m.stockQuantity || 20) * 0.5));
        const conf = pastOrders > 5 ? 94 : (pastOrders > 0 ? 82 : 68);
        return {
          meal: m.name,
          predictedOrders: predicted,
          confidence: conf,
          recommendedPrep: `${predicted} Portions (${m.category})`
        };
      })
    : [];

  // 2. Spending Anomalies from real transactions
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const studentTodayTxns: Record<string, { count: number; total: number; name: string; categories: Set<string> }> = {};

  transactions.forEach(t => {
    if (t.type !== 'topup' && t.date && t.date.startsWith(todayStr)) {
      if (!studentTodayTxns[t.studentId]) {
        studentTodayTxns[t.studentId] = { count: 0, total: 0, name: t.studentName || 'Student', categories: new Set() };
      }
      studentTodayTxns[t.studentId].count += 1;
      studentTodayTxns[t.studentId].total += (t.amount || 0);
      if (t.category) studentTodayTxns[t.studentId].categories.add(t.category);
    }
  });

  const spendingAnomalies = Object.entries(studentTodayTxns)
    .filter(([_, data]) => data.count >= 4 || data.total > 150)
    .map(([_, data]) => ({
      studentName: data.name,
      category: Array.from(data.categories).join(', ') || 'Campus Services',
      issue: `${data.count} purchases today totaling GHS ${data.total.toFixed(2)}`,
      riskLevel: data.total > 250 ? ('high' as const) : ('medium' as const)
    }));

  // 3. Real Inventory Restock Advice from real shop products
  const inventoryRestockAdvice = products
    .filter(p => Number(p.stock) <= (p.reorderThreshold ?? 15))
    .map(p => ({
      name: p.name,
      currentStock: p.stock,
      recommendedOrder: Math.max(20, (p.reorderThreshold || 15) * 2 - p.stock),
      urgency: p.stock <= 5 ? ('high' as const) : ('medium' as const)
    }));

  // 4. Real Revenue Metrics calculated from real enrollments and services
  const totalMonthlyEnrollmentRevenue = enrollments
    .filter(e => e.status === 'active')
    .reduce((sum, e) => {
      const multiplier = e.billingFrequency === 'daily' ? 20 : (e.billingFrequency === 'weekly' ? 4 : 1);
      return sum + ((e.cost || 0) * multiplier);
    }, 0);

  const topServicesByName = services.map(s => {
    const serviceEnrollments = enrollments.filter(e => e.serviceId === s.id && e.status === 'active');
    const usagePercent = studentsCount > 0 ? Math.round((serviceEnrollments.length / studentsCount) * 100) : 0;
    const rev = serviceEnrollments.reduce((sum, e) => sum + (e.cost || 0), 0);
    return {
      name: s.name,
      usageRate: `${usagePercent}% (${serviceEnrollments.length} enrolled)`,
      monthlyRevenue: rev
    };
  });

  return {
    mealDemandPrediction,
    spendingAnomalies,
    inventoryRestockAdvice,
    revenueForecastNextMonth: totalMonthlyEnrollmentRevenue,
    topServicesByName
  };
}

// ==========================================
// REAL-TIME SUBSCRIPTIONS (FIRESTORE)
// ==========================================

export function subscribeToDailyServices(schoolId: string, callback: (services: DailyService[]) => void): Unsubscribe {
  const colRef = collection(db, 'dailyServices');
  const q = query(colRef, where('schoolId', '==', schoolId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyService)));
  }, (err) => {
    console.warn('Realtime dailyServices warning:', err);
  });
}

export function subscribeToStudentEnrollments(schoolId: string, callback: (enrollments: StudentServiceEnrollment[]) => void, studentId?: string): Unsubscribe {
  const colRef = collection(db, 'studentEnrollments');
  let q = query(colRef, where('schoolId', '==', schoolId));
  if (studentId) {
    q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId));
  }
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentServiceEnrollment)));
  }, (err) => {
    console.warn('Realtime studentEnrollments warning:', err);
  });
}

export function subscribeToStudentWallet(schoolId: string, studentId: string, callback: (wallet: StudentWallet) => void): Unsubscribe {
  const colRef = collection(db, 'studentWallets');
  const q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      callback({ id: d.id, ...d.data() } as StudentWallet);
    } else {
      fetchStudentWallet(schoolId, studentId)
        .then(fallback => callback(fallback))
        .catch(err => console.warn('[WALLET] Fetch fallback error:', err));
    }
  }, (err) => {
    console.warn('Realtime studentWallets warning:', err);
  });
}

export function subscribeToWalletTransactions(schoolId: string, callback: (txns: WalletTransaction[]) => void, studentId?: string): Unsubscribe {
  const colRef = collection(db, 'walletTransactions');
  let q = query(colRef, where('schoolId', '==', schoolId), orderBy('date', 'desc'));
  if (studentId) {
    q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId), orderBy('date', 'desc'));
  }
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WalletTransaction)));
  }, (err) => {
    console.warn('Realtime walletTransactions warning:', err);
  });
}

export function subscribeToCanteenMenu(schoolId: string, callback: (menu: CanteenMenuItem[]) => void): Unsubscribe {
  const colRef = collection(db, 'canteenMenu');
  const q = query(colRef, where('schoolId', '==', schoolId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CanteenMenuItem)));
  }, (err) => {
    console.warn('Realtime canteenMenu warning:', err);
  });
}

export function subscribeToMealPreOrders(schoolId: string, callback: (orders: MealPreOrder[]) => void, studentId?: string): Unsubscribe {
  const colRef = collection(db, 'mealPreOrders');
  let q = query(colRef, where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'));
  if (studentId) {
    q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
  }
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MealPreOrder)));
  }, (err) => {
    console.warn('Realtime mealPreOrders warning:', err);
  });
}

export function subscribeToShopProducts(schoolId: string, callback: (products: ShopProduct[]) => void): Unsubscribe {
  const colRef = collection(db, 'shopProducts');
  const q = query(colRef, where('schoolId', '==', schoolId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ShopProduct)));
  }, (err) => {
    console.warn('Realtime shopProducts warning:', err);
  });
}

export function subscribeToTransportBuses(schoolId: string, callback: (buses: TransportBus[]) => void): Unsubscribe {
  const colRef = collection(db, 'transportBuses');
  const q = query(colRef, where('schoolId', '==', schoolId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransportBus)));
  }, (err) => {
    console.warn('Realtime transportBuses warning:', err);
  });
}

export function subscribeToTransportRoutes(schoolId: string, callback: (routes: TransportRoute[]) => void): Unsubscribe {
  const colRef = collection(db, 'transportRoutes');
  const q = query(colRef, where('schoolId', '==', schoolId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransportRoute)));
  }, (err) => {
    console.warn('Realtime transportRoutes warning:', err);
  });
}

export function subscribeToTransportAttendanceLogs(schoolId: string, callback: (logs: TransportAttendance[]) => void, studentId?: string): Unsubscribe {
  const colRef = collection(db, 'transportAttendance');
  let q = query(colRef, where('schoolId', '==', schoolId), orderBy('timestamp', 'desc'));
  if (studentId) {
    q = query(colRef, where('schoolId', '==', schoolId), where('studentId', '==', studentId), orderBy('timestamp', 'desc'));
  }
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TransportAttendance)));
  }, (err) => {
    console.warn('Realtime transportAttendance warning:', err);
  });
}
