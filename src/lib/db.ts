import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Project } from '../types'

interface RujukanDB extends DBSchema {
  projects: {
    key: string
    value: Project
    indexes: { 'by-updated': number }
  }
}

const DB_NAME = 'rujukan-tugas'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<RujukanDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RujukanDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('projects', { keyPath: 'id' })
        store.createIndex('by-updated', 'updatedAt')
      },
    })
  }
  return dbPromise
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB()
  const projects = await db.getAllFromIndex('projects', 'by-updated')
  return projects.reverse()
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB()
  return db.get('projects', id)
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB()
  await db.put('projects', project)
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('projects', id)
}

export function createId(): string {
  return crypto.randomUUID()
}
