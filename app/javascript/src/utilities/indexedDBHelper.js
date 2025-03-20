/**
 * Open the IndexedDB database.
 * @return {Promise} Resolves with the database object.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FileStorageDB", 1);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
  });
}

/**
 * Store a file in IndexedDB.
 * @param {File} file - The file to store.
 * @return {Promise} Resolves when the file is successfully stored.
 */
function storeFile(file) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const request = store.put(file);
      request.onsuccess = () => resolve();
      request.onerror = event => reject(event.target.error);
    });
  });
}

/**
 * Retrieve a file from IndexedDB.
 * @param {string} id - The file ID.
 * @return {Promise} Resolves with the file object.
 */
function getFileFromDB(id) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = event => reject(event.target.error);
    });
  });
}

/**
 * Delete files that are older than the given expiration time.
 * @param {number} expirationTime - Time in milliseconds.
 * @return {Promise} Resolves when all expired files are deleted.
 */
function deleteExpiredFiles(expirationTime) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const request = store.getAll();
      request.onsuccess = () => {
        const now = Date.now();
        request.result.forEach(file => {
          if (now - file.timestamp > expirationTime) {
            store.delete(file.id);
          }
        });
        resolve();
      };
      request.onerror = event => reject(event.target.error);
    });
  });
}

// Automatically clean up expired files every 24 hours (86400000 ms)
setInterval(() => {
  deleteExpiredFiles(24 * 60 * 60 * 1000)
    .then(() => console.log("Expired files successfully deleted"))
    .catch(error => console.error("Error deleting expired files:", error));
}, 24 * 60 * 60 * 1000);

export { openDB, storeFile, getFileFromDB, deleteExpiredFiles };
