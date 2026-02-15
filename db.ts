import Dexie, { type Table } from 'dexie';
import { PaymentRecord, ExpenseRecord, TenantRecord, OwnerRecord, BlockRecord, User } from './types';

export class RentalDatabase extends Dexie {
  payments!: Table<PaymentRecord>;
  expenses!: Table<ExpenseRecord>;
  tenants!: Table<TenantRecord>;
  owner!: Table<OwnerRecord>;
  blocks!: Table<BlockRecord>;
  users!: Table<User>;

  constructor() {
    super('SpaceRentDB');
    (this as any).version(7).stores({
      payments: '++id, tenantName, tenantPhone, tenantEmail, blockNumber, paymentDate, paymentMethod',
      expenses: '++id, category, blockNumber, date',
      tenants: '++id, name, blockNumber, phone, email, dueDay',
      owner: '++id',
      blocks: '++id, blockId',
      users: '++id, username'
    });
  }
}

export const db = new RentalDatabase();