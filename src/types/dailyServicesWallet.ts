export type DailyServiceCategory = 
  | 'canteen'
  | 'lunch'
  | 'breakfast'
  | 'snacks'
  | 'dinner'
  | 'transport'
  | 'bus'
  | 'extra_classes'
  | 'library'
  | 'lab'
  | 'boarding'
  | 'hostel'
  | 'trips'
  | 'clubs'
  | 'sports'
  | 'shop'
  | 'printing';

export interface DailyService {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  category: DailyServiceCategory;
  dailyCost: number;
  weeklyCost?: number;
  monthlyCost?: number;
  status: 'active' | 'suspended';
  activeDates?: string[];
  applicableClasses: string[]; // e.g. ['Basic 1', 'Basic 2', 'JHS 1', 'All']
  applicableStudents?: string[]; // student UIDs/IDs
  paymentMethod: 'wallet' | 'cash' | 'auto_deduct';
  createdAt: string;
  updatedAt?: string;
}

export interface StudentServiceEnrollment {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  serviceId: string;
  serviceName: string;
  category: DailyServiceCategory;
  cost: number;
  billingFrequency: 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'paused' | 'cancelled';
  assignedDate: string;
  lastChargedDate?: string;
  expiryDate?: string;
}

export interface StudentWallet {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  walletId: string; // e.g. "WAL-EDUK-9921"
  qrCodeData: string;
  nfcCardId: string;
  balance: number;
  currency: string;
  dailyLimit: number;
  dailySpent: number;
  weeklyLimit: number;
  weeklySpent: number;
  monthlyLimit: number;
  monthlySpent: number;
  autoTopUpEnabled: boolean;
  autoTopUpThreshold: number;
  autoTopUpAmount: number;
  disabledCategories: DailyServiceCategory[];
  status: 'active' | 'frozen' | 'closed';
  lastUpdated: string;
}

export type WalletTransactionType = 
  | 'topup'
  | 'canteen_meal'
  | 'canteen_snack'
  | 'transport_fee'
  | 'shop_purchase'
  | 'library_fine'
  | 'printing'
  | 'trip_fee'
  | 'activity_fee'
  | 'refund'
  | 'daily_service_charge';

export interface WalletTransaction {
  id: string;
  walletId: string;
  studentId: string;
  studentName: string;
  schoolId: string;
  type: WalletTransactionType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  description: string;
  category: string;
  paymentMethod: 'momo_mtn' | 'telecel_cash' | 'airteltigo' | 'card_visa_mc' | 'bank_transfer' | 'cash' | 'wallet_deduction';
  reference: string;
  date: string;
  processedBy: string;
  receiptUrl?: string;
  status: 'successful' | 'pending' | 'failed';
}

export interface CanteenMenuItem {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  category: 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'drinks' | 'special';
  price: number;
  currency: string;
  imageEmoji: string;
  imageUrl?: string;
  availableDays: string[];
  stockQuantity: number;
  isAvailable: boolean;
  calories?: string;
  allergens?: string[];
}

export type MealOrderStatus = 'ordered' | 'preparing' | 'ready' | 'collected' | 'cancelled';

export interface MealPreOrder {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  parentId?: string;
  orderDate: string;
  deliveryDate: string;
  mealType: 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'drinks' | 'special';
  items: Array<{
    itemId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  currency: string;
  paymentStatus: 'paid_wallet' | 'paid_cash' | 'pending';
  orderStatus: MealOrderStatus;
  notes?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  schoolId: string;
  name: string;
  category: 'food' | 'drink' | 'uniform' | 'book' | 'stationery' | 'supplies' | 'equipment';
  unitPrice: number;
  costPrice: number;
  currency: string;
  stockCount: number;
  reorderThreshold: number;
  expiryDate?: string;
  supplierName?: string;
  lastRestocked: string;
}

export interface ShopProduct {
  id: string;
  schoolId: string;
  name: string;
  category: 'uniform' | 'book' | 'stationery' | 'equipment' | 'learning_materials';
  price: number;
  costPrice?: number;
  currency: string;
  stock: number;
  supplierName?: string;
  storeLocation?: string;
  reorderThreshold?: number;
  imageUrl?: string;
  description: string;
  sizes?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryLog {
  id: string;
  schoolId: string;
  productId: string;
  productName: string;
  type: 'stock_in' | 'stock_out' | 'sale_deduction' | 'adjustment' | 'damaged';
  quantity: number;
  previousStock: number;
  newStock: number;
  unitPrice?: number;
  supplierName?: string;
  storeLocation?: string;
  staffName: string;
  staffUid?: string;
  notes?: string;
  timestamp: string;
}

export interface TransportBus {
  id: string;
  schoolId: string;
  busNumber: string;
  licensePlate: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  routeId: string;
  routeName: string;
  active: boolean;
  gpsDeviceId?: string;
  gpsStatus?: 'connected' | 'standby' | 'offline';
  currentLocation?: {
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    lastPing?: string;
    address?: string;
  };
  assignedStudents?: string[]; // Array of student IDs
}

export interface TransportRouteStop {
  id: string;
  name: string;
  scheduledTime: string;
  lat: number;
  lng: number;
}

export interface TransportRoute {
  id: string;
  schoolId: string;
  routeName: string;
  startLocation: string;
  endLocation: string;
  stops: TransportRouteStop[];
  monthlyFee: number;
  currency: string;
  assignedStudentsCount: number;
}

export interface BusLiveStatus {
  busId: string;
  routeName: string;
  currentLat: number;
  currentLng: number;
  speed: number;
  status: 'departs_school' | 'en_route_stops' | 'approaching_stop' | 'arrived_at_school' | 'parked';
  currentStopIndex: number;
  etaMinutes: number;
  lastUpdated: string;
}

export interface TransportAttendance {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  busId: string;
  busNumber?: string;
  routeName: string;
  action: 'boarded' | 'exited';
  timestamp: string;
  stopName: string;
  scannedBy?: string;
  method?: string;
  locationLat?: number;
  locationLng?: number;
}

export interface DailyServicesMetrics {
  totalServiceRevenue: number;
  totalWalletBalance: number;
  totalActiveServices: number;
  todayCanteenOrders: number;
  todayCanteenSales: number;
  todayBusPassengersCount: number;
  lowStockItemsCount: number;
  walletTransactionsCount: number;
}
