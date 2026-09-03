const fs = require('fs');
let content = fs.readFileSync('context/AppContext.tsx', 'utf8');

const timeoutFunc = `
const setDocWithTimeout = (docRef: any, data: any, timeoutMs: number = 8000): Promise<void> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Timeout: Firebase no responde (Posible bloqueo de red o datos invalidos)."));
        }, timeoutMs);
        setDoc(docRef, data)
            .then(() => {
                clearTimeout(timer);
                resolve();
            })
            .catch((err: any) => {
                clearTimeout(timer);
                reject(err);
            });
    });
};
`;

content = content.replace('// --- Custom Hook for Local Storage with Offline Firestore Sync ---', timeoutFunc + '\n// --- Custom Hook for Local Storage with Offline Firestore Sync ---');

content = content.replace(/setDoc\(/g, 'setDocWithTimeout(');
// Revert the one inside setDocWithTimeout itself
content = content.replace('setDocWithTimeout(docRef, data)', 'setDoc(docRef, data)');

fs.writeFileSync('context/AppContext.tsx', content);
