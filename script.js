// ========== ВАША КОНФІГУРАЦІЯ FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyDu4HEpjWVfJOE4GMji2ux-KK_47-YRvfw",
    authDomain: "kursova1-4e839.firebaseapp.com",
    projectId: "kursova1-4e839",
    storageBucket: "kursova1-4e839.firebasestorage.app",
    messagingSenderId: "580567528040",
    appId: "1:580567528040:web:81c77c2a05bf9c183841dd"
};

// Ініціалізація Firebase (Compat-версія, без імпортів)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// ========== ЗМІННІ ==========
let currentUser = null;
let transactions = [];

// ========== ФУНКЦІЯ ВХОДУ ==========
window.signIn = () => {
    auth.signInWithPopup(provider)
        .catch((error) => {
            console.error("Помилка входу:", error);
            alert("Помилка входу: " + error.message);
        });
};

// ========== ФУНКЦІЯ ВИХОДУ ==========
window.logout = () => {
    auth.signOut();
};

// ========== ФУНКЦІЯ ДОДАВАННЯ ТРАНЗАКЦІЇ ==========
window.addTransaction = async () => {
    if (!currentUser) {
        alert("Спочатку увійдіть в систему!");
        return;
    }
    
    const type = document.getElementById('trans-type').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const category = document.getElementById('trans-category').value;
    const description = document.getElementById('trans-desc').value;
    
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Введіть коректну суму (більше 0)");
        return;
    }
    
    try {
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: type,
            amount: amount,
            category: category,
            description: description || "",
            date: firebase.firestore.Timestamp.now()
        });
        
        document.getElementById('trans-amount').value = '';
        document.getElementById('trans-desc').value = '';
        await loadTransactions();
        
    } catch (error) {
        console.error("Помилка збереження:", error);
        alert("Помилка: " + error.message);
    }
};

// ========== ЗАВАНТАЖЕННЯ ТРАНЗАКЦІЙ ==========
async function loadTransactions() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        transactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                ...data,
                date: data.date?.toDate() || new Date()
            });
        });
        
        applyFilter();
        updateBalance();
        
        console.log("Завантажено транзакцій:", transactions.length);
    } catch (error) {
        console.error("Помилка завантаження:", error);
    }
}

// ========== ФІЛЬТРАЦІЯ ==========
function applyFilter() {
    const filterCategory = document.getElementById('filter-category').value;
    let filtered = transactions;
    
    if (filterCategory !== 'all') {
        filtered = transactions.filter(t => t.category === filterCategory);
    }
    
    renderTransactions(filtered);
}

// ========== ВІДОБРАЖЕННЯ ТРАНЗАКЦІЙ ==========
function renderTransactions(list) {
    const container = document.getElementById('transactions-list');
    
    if (!list || list.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Немає транзакцій</div>';
        return;
    }
    
    container.innerHTML = list.map(t => {
        const dateStr = t.date ? t.date.toLocaleDateString('uk-UA') : '';
        return `
            <div class="transaction-item transaction-${t.type}">
                <div>
                    <strong>${t.category}</strong>
                    <div class="transaction-category">${t.description || 'Без опису'}</div>
                    <div style="font-size: 12px; color: #999;">${dateStr}</div>
                </div>
                <div class="transaction-amount ${t.type === 'income' ? 'income-text' : 'expense-text'}">
                    ${t.type === 'income' ? '+' : '-'} ${t.amount.toFixed(2)} ₴
                </div>
                <button class="delete-btn" onclick="deleteTransaction('${t.id}')">🗑️</button>
            </div>
        `;
    }).join('');
}

// ========== ОНОВЛЕННЯ БАЛАНСУ ==========
function updateBalance() {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
        }
    });
    
    const balance = totalIncome - totalExpense;
    
    document.getElementById('balance').innerHTML = `${balance.toFixed(2)} ₴`;
    document.getElementById('total-income').innerHTML = totalIncome.toFixed(2);
    document.getElementById('total-expense').innerHTML = totalExpense.toFixed(2);
    
    const balanceEl = document.getElementById('balance');
    if (balance >= 0) {
        balanceEl.style.color = '#10b981';
    } else {
        balanceEl.style.color = '#ef4444';
    }
}

// ========== ВИДАЛЕННЯ ТРАНЗАКЦІЇ ==========
window.deleteTransaction = async (id) => {
    if (!confirm('Видалити транзакцію?')) return;
    
    try {
        await db.collection('transactions').doc(id).delete();
        await loadTransactions();
    } catch (error) {
        console.error("Помилка видалення:", error);
        alert("Помилка видалення: " + error.message);
    }
};

// ========== СТЕЖЕННЯ ЗА ВХОДОМ/ВИХОДОМ ==========
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/50';
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        loadTransactions();
        console.log("Користувач увійшов:", user.email);
    } else {
        currentUser = null;
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
        transactions = [];
        renderTransactions([]);
        updateBalance();
        console.log("Користувач вийшов");
    }
});

// ========== ФІЛЬТР ==========
document.getElementById('filter-category').addEventListener('change', () => {
    applyFilter();
});

console.log("Скрипт завантажено!");
