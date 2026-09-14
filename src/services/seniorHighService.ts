import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { BoardingHouse, ExeatRequest, MaintenanceWorkOrder, UserProfile } from '../types';

export const SENIOR_HIGH_PROGRAMMES = [
  'General Science',
  'General Arts',
  'Business',
  'Visual Arts',
  'Home Economics',
  'Technical',
  'Agricultural Science'
] as const;

export type SeniorHighProgramme = typeof SENIOR_HIGH_PROGRAMMES[number];

export const DEFAULT_BOARDING_HOUSES = [
  { name: 'Aggrey House', gender: 'Boys', capacity: 120 },
  { name: 'Guggisberg House', gender: 'Boys', capacity: 120 },
  { name: 'Yaa Asantewaa House', gender: 'Girls', capacity: 130 },
  { name: 'Osei Tutu House', gender: 'Girls', capacity: 130 }
] as const;

// -------------------------------------------------------------
// BOARDING HOUSES API
// -------------------------------------------------------------

export async function getBoardingHouses(schoolId: string): Promise<BoardingHouse[]> {
  try {
    const q = query(
      collection(db, 'boardingHouses'), 
      where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(q);
    const houses: BoardingHouse[] = [];
    snap.forEach((d) => {
      houses.push({ id: d.id, ...d.data() } as BoardingHouse);
    });
    return houses.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error('[SeniorHighService] Error fetching boarding houses:', err);
    return [];
  }
}

export async function addBoardingHouse(house: Omit<BoardingHouse, 'id' | 'createdAt'>): Promise<string> {
  const houseRef = doc(collection(db, 'boardingHouses'));
  const newHouse: BoardingHouse = {
    ...house,
    id: houseRef.id,
    currentOccupancy: house.currentOccupancy || 0,
    createdAt: new Date().toISOString()
  };
  await setDoc(houseRef, newHouse);
  return houseRef.id;
}

export async function updateBoardingHouse(houseId: string, data: Partial<BoardingHouse>): Promise<void> {
  const houseRef = doc(db, 'boardingHouses', houseId);
  await updateDoc(houseRef, data);
}

export async function deleteBoardingHouse(houseId: string): Promise<void> {
  await deleteDoc(doc(db, 'boardingHouses', houseId));
}

// -------------------------------------------------------------
// EXEAT REQUESTS API
// -------------------------------------------------------------

export async function getExeatRequests(schoolId: string, houseId?: string): Promise<ExeatRequest[]> {
  try {
    const constraints: any[] = [where('schoolId', '==', schoolId)];
    if (houseId) {
      constraints.push(where('houseId', '==', houseId));
    }
    const q = query(collection(db, 'exeatRequests'), ...constraints);
    const snap = await getDocs(q);
    const requests: ExeatRequest[] = [];
    snap.forEach((d) => {
      requests.push({ id: d.id, ...d.data() } as ExeatRequest);
    });
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('[SeniorHighService] Error fetching exeat requests:', err);
    return [];
  }
}

export async function submitExeatRequest(exeat: Omit<ExeatRequest, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const exeatRef = doc(collection(db, 'exeatRequests'));
  const newExeat: ExeatRequest = {
    ...exeat,
    id: exeatRef.id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  await setDoc(exeatRef, newExeat);
  return exeatRef.id;
}

export async function updateExeatStatus(
  exeatId: string, 
  status: ExeatRequest['status'], 
  approvedBy?: string, 
  notes?: string
): Promise<void> {
  const exeatRef = doc(db, 'exeatRequests', exeatId);
  const updatePayload: any = {
    status,
    ...(approvedBy ? { approvedBy } : {}),
    ...(notes ? { notes } : {})
  };
  if (status === 'returned') {
    updatePayload.actualReturnDate = new Date().toISOString();
  }
  await updateDoc(exeatRef, updatePayload);
}

// -------------------------------------------------------------
// MAINTENANCE WORK ORDERS API (Facilities & Housekeeping)
// -------------------------------------------------------------

export async function getMaintenanceWorkOrders(schoolId: string): Promise<MaintenanceWorkOrder[]> {
  try {
    const q = query(
      collection(db, 'maintenanceWorkOrders'), 
      where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(q);
    const orders: MaintenanceWorkOrder[] = [];
    snap.forEach((d) => {
      orders.push({ id: d.id, ...d.data() } as MaintenanceWorkOrder);
    });
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('[SeniorHighService] Error fetching work orders:', err);
    return [];
  }
}

export async function createMaintenanceWorkOrder(order: Omit<MaintenanceWorkOrder, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const orderRef = doc(collection(db, 'maintenanceWorkOrders'));
  const newOrder: MaintenanceWorkOrder = {
    ...order,
    id: orderRef.id,
    status: 'reported',
    createdAt: new Date().toISOString()
  };
  await setDoc(orderRef, newOrder);
  return orderRef.id;
}

export async function updateMaintenanceWorkOrderStatus(
  orderId: string, 
  status: MaintenanceWorkOrder['status'], 
  assignedTo?: string, 
  notes?: string
): Promise<void> {
  const orderRef = doc(db, 'maintenanceWorkOrders', orderId);
  const updatePayload: any = {
    status,
    ...(assignedTo ? { assignedTo } : {}),
    ...(notes ? { notes } : {})
  };
  if (status === 'completed') {
    updatePayload.completedAt = new Date().toISOString();
  }
  await updateDoc(orderRef, updatePayload);
}

// -------------------------------------------------------------
// SENIOR HIGH STAFF DIRECTORY HELPER
// -------------------------------------------------------------

export async function getSeniorHighStaff(schoolId: string): Promise<{
  academicsStaff: UserProfile[];
  domesticStaff: UserProfile[];
  leadership: UserProfile[];
}> {
  try {
    const q = query(
      collection(db, 'users'),
      where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(q);
    const academicsStaff: UserProfile[] = [];
    const domesticStaff: UserProfile[] = [];
    const leadership: UserProfile[] = [];

    snap.forEach((d) => {
      const u = { uid: d.id, ...d.data() } as UserProfile;
      if (u.role === 'school_head' || u.role === 'assistant_academics' || u.role === 'assistant_domestic') {
        leadership.push(u);
      }
      if (u.role === 'teacher' || u.role === 'assistant_academics' || u.department === 'academics') {
        academicsStaff.push(u);
      }
      if (
        u.role === 'house_master' ||
        u.role === 'housekeeping' ||
        u.role === 'facilities' ||
        u.role === 'general_services' ||
        u.role === 'assistant_domestic' ||
        u.department === 'domestic'
      ) {
        domesticStaff.push(u);
      }
    });

    return { academicsStaff, domesticStaff, leadership };
  } catch (err) {
    console.error('[SeniorHighService] Error fetching SHS staff:', err);
    return { academicsStaff: [], domesticStaff: [], leadership: [] };
  }
}
