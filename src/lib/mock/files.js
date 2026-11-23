// Mock "storage bucket": image blobs in IndexedDB, keyed by path.
// IndexedDB holds far more than localStorage, so real photos fit.

const DB_NAME = 'inspiration-board-mock'
const STORE = 'files'

let dbPromise = null

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  return dbPromise
}

async function run(mode, action) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = action(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(request?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Mock storage write failed.'))
  })
}

export function putFile(path, blob) {
  return run('readwrite', (store) => store.put(blob, path))
}

export function getFile(path) {
  return run('readonly', (store) => store.get(path))
}

export async function deleteFiles(paths) {
  const list = paths.filter(Boolean)
  if (list.length === 0) return
  await run('readwrite', (store) => {
    list.forEach((p) => store.delete(p))
  })
  list.forEach(revokeUrl)
}

export function clearFiles() {
  return run('readwrite', (store) => store.clear())
}

// Object URLs are cached per path, so each image gets one URL per page load.
const urlCache = new Map()

export async function getFileUrl(path) {
  if (!path) return null
  if (urlCache.has(path)) return urlCache.get(path)
  const blob = await getFile(path)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urlCache.set(path, url)
  return url
}

function revokeUrl(path) {
  const url = urlCache.get(path)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(path)
  }
}
