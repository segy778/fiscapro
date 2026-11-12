// État global (Zustand). Agrège les données de l'année et expose le résultat
// fiscal calculé en temps réel via le moteur pur. AUCUNE logique fiscale ici :
// le store orchestre les appels au moteur de core/ et persiste via la couche
// de stockage abstraite (lib/storage).

import { create } from 'zustand';
import type { Income, Expense } from '../core/models/income';
import type { Trip, Vehicle, VehicleExpense, VehicleExpenseKind } from '../core/models/vehicle';
import type { TaxResult } from '../core/tax/types';
import { loadFiscalConfig } from '../core/tax/loadConfig';
import { computeTax } from '../core/tax/taxEngine';
import { totalDeductibleNonVehicle } from '../core/tax/expenseCalc';
import {
  summarizeKm,
  computeVehicleCosts,
  type VehicleKmSummary,
} from '../core/tax/vehicleCalc';
import { storage } from '../lib/storage';
import { checkPassword } from '../lib/crypto/passwordPolicy';
import { compressImage } from '../lib/format/image';
import {
  isEncryptionEnabled,
  isUnlocked,
  enableEncryption,
  disableEncryption,
  changePassword,
  unlock,
  lock,
} from '../lib/crypto/encryptionManager';
import {
  DEMO_INCOMES,
  DEMO_EXPENSES,
  DEMO_TRIPS,
  DEMO_VEHICLE,
} from './demoSeed';

const YEAR = 2026;
const config = loadFiscalConfig(YEAR);

const EMPTY_VEHICLE: Vehicle = { id: 'v1', name: 'Véhicule principal', expenses: [] };

export interface DashboardSummary {
  year: number;
  grossIncomeCents: number;
  deductibleExpensesCents: number;
  netIncomeCents: number;
  tax: TaxResult;
  km: VehicleKmSummary;
  vehicleTotalCents: number;
  vehicleDeductibleCents: number;
}

interface FiscalState {
  // État de données
  incomes: Income[];
  expenses: Expense[];
  trips: Trip[];
  vehicle: Vehicle;
  // Réglage : l'utilisateur est-il inscrit aux fichiers TPS/TVQ ?
  taxRegistered: boolean;
  // Chiffrement
  encryptionEnabled: boolean;
  /** true si le chiffrement est activé mais la session pas encore déverrouillée. */
  needsUnlock: boolean;
  /** Le mot de passe utilisé au déverrouillage est sous les exigences (mémoire seulement). */
  weakPassword: boolean;
  // État de chargement
  loaded: boolean;

  // Cycle de vie
  initialize: () => Promise<void>;
  resetAll: () => Promise<void>;
  setTaxRegistered: (registered: boolean) => Promise<void>;
  // Chiffrement
  enableEncryption: (password: string) => Promise<void>;
  disableEncryption: (password: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  unlockApp: (password: string) => Promise<boolean>;
  lockApp: () => void;

  // Mutations (persistées)
  addIncome: (income: Income) => Promise<void>;
  updateIncome: (income: Income) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  /** Compresse et stocke une image de facture; retourne son id. */
  attachReceiptImage: (blob: Blob) => Promise<string>;
  /** Récupère une image de facture (Blob) par id. */
  getReceiptImage: (id: string) => Promise<Blob | null>;
  /** Supprime une image de facture du stockage par id. */
  detachReceiptImage: (id: string) => Promise<void>;
  addTrip: (trip: Trip) => Promise<void>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  addVehicleExpense: (expense: VehicleExpense) => Promise<void>;
  updateVehicleExpense: (expense: VehicleExpense) => Promise<void>;
  deleteVehicleExpense: (id: string) => Promise<void>;
  setVehicleAnnualTotal: (kind: VehicleExpenseKind, cents: number) => Promise<void>;

  // Lecture dérivée
  getSummary: () => DashboardSummary;
}

export const useFiscalStore = create<FiscalState>((set, get) => ({
  incomes: [],
  expenses: [],
  trips: [],
  vehicle: EMPTY_VEHICLE,
  taxRegistered: false,
  encryptionEnabled: false,
  needsUnlock: false,
  weakPassword: false,
  loaded: false,

  initialize: async () => {
    if (get().loaded) return;
    await storage.init();

    // Si le chiffrement est activé mais la session non déverrouillée, on ne
    // charge AUCUNE donnée : on attend le mot de passe (écran de déverrouillage).
    const encEnabled = await isEncryptionEnabled();
    if (encEnabled && !isUnlocked()) {
      set({ encryptionEnabled: true, needsUnlock: true, loaded: false });
      return;
    }

    let data = await storage.loadAll();

    // Amorçage de démo UNIQUEMENT au tout premier lancement (jamais après une
    // réinitialisation volontaire). Le drapeau 'seeded' marque que l'amorçage
    // a déjà eu lieu, même si l'utilisateur a ensuite tout effacé.
    const seeded = await storage.getMeta('seeded');
    const isEmpty =
      data.incomes.length === 0 &&
      data.expenses.length === 0 &&
      data.trips.length === 0 &&
      data.vehicles.length === 0;

    if (isEmpty && !seeded) {
      await Promise.all([
        ...DEMO_INCOMES.map((i) => storage.putIncome(i)),
        ...DEMO_EXPENSES.map((e) => storage.putExpense(e)),
        ...DEMO_TRIPS.map((t) => storage.putTrip(t)),
        storage.putVehicle(DEMO_VEHICLE),
      ]);
      await storage.setMeta('seeded', '1');
      data = await storage.loadAll();
    }

    set({
      incomes: data.incomes,
      expenses: data.expenses,
      trips: data.trips,
      vehicle: data.vehicles[0] ?? EMPTY_VEHICLE,
      taxRegistered: (await storage.getMeta('taxRegistered')) === '1',
      encryptionEnabled: encEnabled,
      needsUnlock: false,
      loaded: true,
    });
  },

  enableEncryption: async (password) => {
    await enableEncryption(password);
    // Recharger depuis le stockage (désormais chiffré) pour resynchroniser
    // l'état en mémoire. Les données sont déchiffrées à la lecture.
    const data = await storage.loadAll();
    set({
      incomes: data.incomes,
      expenses: data.expenses,
      trips: data.trips,
      vehicle: data.vehicles[0] ?? EMPTY_VEHICLE,
      encryptionEnabled: true,
      needsUnlock: false,
    });
  },

  disableEncryption: async (password) => {
    const ok = await disableEncryption(password);
    if (ok) {
      // Resynchroniser depuis le stockage (désormais en clair).
      const data = await storage.loadAll();
      set({
        incomes: data.incomes,
        expenses: data.expenses,
        trips: data.trips,
        vehicle: data.vehicles[0] ?? EMPTY_VEHICLE,
        encryptionEnabled: false,
        needsUnlock: false,
      });
    }
    return ok;
  },

  changePassword: async (oldPassword, newPassword) => {
    const ok = await changePassword(oldPassword, newPassword);
    if (ok) {
      // Resynchroniser l'état depuis le stockage (rechiffré, nouvelle clé).
      const data = await storage.loadAll();
      set({
        incomes: data.incomes,
        expenses: data.expenses,
        trips: data.trips,
        vehicle: data.vehicles[0] ?? EMPTY_VEHICLE,
        weakPassword: false,
      });
    }
    return ok;
  },

  unlockApp: async (password) => {
    const ok = await unlock(password);
    if (!ok) return false;
    // Déverrouillé : charger les données (déchiffrées) et terminer l'init.
    const data = await storage.loadAll();
    set({
      incomes: data.incomes,
      expenses: data.expenses,
      trips: data.trips,
      vehicle: data.vehicles[0] ?? EMPTY_VEHICLE,
      taxRegistered: (await storage.getMeta('taxRegistered')) === '1',
      encryptionEnabled: true,
      needsUnlock: false,
      // Évalué en mémoire seulement, jamais stocké.
      weakPassword: !checkPassword(password).acceptable,
      loaded: true,
    });
    return true;
  },

  lockApp: () => {
    lock();
    set({
      incomes: [],
      expenses: [],
      trips: [],
      vehicle: EMPTY_VEHICLE,
      needsUnlock: true,
      loaded: false,
    });
  },

  setTaxRegistered: async (registered) => {
    await storage.setMeta('taxRegistered', registered ? '1' : '0');
    set({ taxRegistered: registered });
  },

  resetAll: async () => {
    await storage.clear();
    // Marquer comme amorcé pour empêcher le retour des données de démo.
    await storage.setMeta('seeded', '1');
    set({
      incomes: [],
      expenses: [],
      trips: [],
      vehicle: EMPTY_VEHICLE,
    });
  },

  addIncome: async (income) => {
    await storage.putIncome(income);
    set((s) => ({ incomes: [...s.incomes, income] }));
  },
  updateIncome: async (income) => {
    await storage.putIncome(income);
    set((s) => ({ incomes: s.incomes.map((i) => (i.id === income.id ? income : i)) }));
  },
  deleteIncome: async (id) => {
    await storage.deleteIncome(id);
    set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
  },

  addExpense: async (expense) => {
    await storage.putExpense(expense);
    set((s) => ({ expenses: [...s.expenses, expense] }));
  },
  updateExpense: async (expense) => {
    await storage.putExpense(expense);
    set((s) => ({ expenses: s.expenses.map((e) => (e.id === expense.id ? expense : e)) }));
  },
  deleteExpense: async (id) => {
    // Supprimer aussi l'image de facture associée, si présente.
    const expense = get().expenses.find((e) => e.id === id);
    if (expense?.receiptImageId) {
      await storage.deleteReceiptImage(expense.receiptImageId);
    }
    await storage.deleteExpense(id);
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },

  attachReceiptImage: async (blob) => {
    const compressed = await compressImage(blob);
    const id = crypto.randomUUID();
    await storage.putReceiptImage(id, compressed);
    return id;
  },

  getReceiptImage: async (id) => {
    return storage.getReceiptImage(id);
  },

  detachReceiptImage: async (id) => {
    await storage.deleteReceiptImage(id);
  },

  addTrip: async (trip) => {
    await storage.putTrip(trip);
    set((s) => ({ trips: [...s.trips, trip] }));
  },
  updateTrip: async (trip) => {
    await storage.putTrip(trip);
    set((s) => ({ trips: s.trips.map((t) => (t.id === trip.id ? trip : t)) }));
  },
  deleteTrip: async (id) => {
    await storage.deleteTrip(id);
    set((s) => ({ trips: s.trips.filter((t) => t.id !== id) }));
  },

  addVehicleExpense: async (expense) => {
    const vehicle = { ...get().vehicle, expenses: [...get().vehicle.expenses, expense] };
    await storage.putVehicle(vehicle);
    set({ vehicle });
  },
  updateVehicleExpense: async (expense) => {
    const current = get().vehicle;
    const vehicle = {
      ...current,
      expenses: current.expenses.map((e) => (e.id === expense.id ? expense : e)),
    };
    await storage.putVehicle(vehicle);
    set({ vehicle });
  },
  deleteVehicleExpense: async (id) => {
    const current = get().vehicle;
    const vehicle = { ...current, expenses: current.expenses.filter((e) => e.id !== id) };
    await storage.putVehicle(vehicle);
    set({ vehicle });
  },
  setVehicleAnnualTotal: async (kind, cents) => {
    const current = get().vehicle;
    const annualTotals = { ...current.annualTotals };
    if (cents > 0) {
      annualTotals[kind] = cents;
    } else {
      delete annualTotals[kind];
    }
    const vehicle = { ...current, annualTotals };
    await storage.putVehicle(vehicle);
    set({ vehicle });
  },

  getSummary: () => {
    const { incomes, expenses, trips, vehicle, taxRegistered } = get();

    const grossIncomeCents = incomes.reduce((sum, i) => sum + i.amountCents, 0);
    const nonVehicleDeductible = totalDeductibleNonVehicle(expenses, config, taxRegistered);
    const vehicleCosts = computeVehicleCosts(vehicle, trips, expenses, config, taxRegistered);
    const vehicleDeductibleCents = vehicleCosts.deductibleCents;
    const deductibleExpensesCents = nonVehicleDeductible + vehicleDeductibleCents;

    const tax = computeTax({ grossIncomeCents, deductibleExpensesCents }, config);
    const km = summarizeKm(trips);

    return {
      year: YEAR,
      grossIncomeCents,
      deductibleExpensesCents,
      netIncomeCents: tax.netBusinessIncomeCents,
      tax,
      km,
      vehicleTotalCents: vehicleCosts.totalCents,
      vehicleDeductibleCents,
    };
  },
}));
