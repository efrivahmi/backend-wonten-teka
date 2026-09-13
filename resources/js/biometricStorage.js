const DB_NAME = 'wonten_teka_secure_data';
const DB_VERSION = 1;
const KEY_STORE = 'crypto_keys';
const BIOMETRIC_STORE = 'biometrics';

const openDatabase = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
        if (!db.objectStoreNames.contains(BIOMETRIC_STORE)) db.createObjectStore(BIOMETRIC_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const transactionRequest = async (storeName, mode, operation) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const request = operation(transaction.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => reject(transaction.error);
    });
};

const currentEmployeeKey = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const employeeId = user.employee?.id || user.employee_id || user.id;
    if (!employeeId) throw new Error('Identitas karyawan tidak tersedia.');
    return `employee:${employeeId}`;
};

const getEncryptionKey = async () => {
    let key = await transactionRequest(KEY_STORE, 'readonly', store => store.get('face-aes-key'));
    if (key) return key;
    key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
    await transactionRequest(KEY_STORE, 'readwrite', store => store.put(key, 'face-aes-key'));
    return key;
};

export const saveLocalFaceEmbeddings = async (embeddings) => {
    if (!Array.isArray(embeddings) || embeddings.length < 3) {
        throw new Error('Data wajah lokal tidak lengkap.');
    }
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(embeddings));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    await transactionRequest(BIOMETRIC_STORE, 'readwrite', store => store.put({
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(ciphertext)),
        updatedAt: new Date().toISOString(),
        version: 1,
    }, currentEmployeeKey()));
};

export const loadLocalFaceEmbeddings = async () => {
    const record = await transactionRequest(
        BIOMETRIC_STORE,
        'readonly',
        store => store.get(currentEmployeeKey()),
    );
    if (!record) return null;
    try {
        const key = await getEncryptionKey();
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(record.iv) },
            key,
            new Uint8Array(record.ciphertext),
        );
        const embeddings = JSON.parse(new TextDecoder().decode(plaintext));
        return Array.isArray(embeddings) && embeddings.length >= 3 ? embeddings : null;
    } catch (_) {
        return null;
    }
};
