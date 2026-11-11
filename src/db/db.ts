import Dexie, { type EntityTable } from 'dexie'

export interface Profile {
  id: number
  name: string
}

export const db = new Dexie('gymtracker') as Dexie & {
  profiles: EntityTable<Profile, 'id'>
}

db.version(1).stores({
  profiles: '++id, name',
})

export async function ensureDefaultProfiles() {
  if ((await db.profiles.count()) === 0) {
    await db.profiles.bulkAdd([{ name: 'You' }, { name: 'Buddy' }] as Profile[])
  }
}
