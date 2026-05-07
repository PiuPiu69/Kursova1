// ========== КОНФІГУРАЦІЯ FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyDu4HEpjWVfJOE4GMji2ux-KK_47-YRvfw",
    authDomain: "kursova1-4e839.firebaseapp.com",
    projectId: "kursova1-4e839",
    storageBucket: "kursova1-4e839.firebasestorage.app",
    messagingSenderId: "580567528040",
    appId: "1:580567528040:web:81c77c2a05bf9c183841dd"
};

// Ініціалізація
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;

// ========== ВХІД (через редирект, а не popup) ==========
window.signIn = () => {
    auth.signInWithRedirect(provider);
};

// ========== ВИХІД ==========
window.logout = () => {
    auth.signOut().then(() => {
        window.location.reload();
    });
};

// ========== ДОДАВАННЯ ТРАНЗАКЦІЇ ==========
window.addTransaction = async () => {
    if (!currentUser) {
        alert("Увійдіть спочатку!");
        return;
    }
    
    const type = document.getElementById('trans-type').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const category = document.getElementById('trans-category').value;
    const description = document.getElementById('trans-desc').value;
    
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Введіть коректну суму!");
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
        console.error("Помилка:", error);
        alert("Помилка: " + error.message);
    }
};

// ========== ЗАВАНТАЖЕННЯ ТРАНЗАКЦІЙ ==========
async function loadTransactions() {
    if (!currentUser) {
        console.log("Немає користувача");
        return;
    }
    
    try {
        const snapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        const transactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                amount: data.amount,
                type: data.type,
                category: data.category,
                description: data.description,
                date: data.date?.toDate() || new Date()
            });
        });
        
        displayTransactions(transactions);
        updateBalance(transactions);
        
    } catch (error) {
        console.error("Помилка завантаження:", error);
    }
}

// ========== ВІДОБРАЖЕННЯ ТРАНЗАКЦІЙ ==========
function displayTransactions(transactions) {
    const container = document.getElementById('transactions-list');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Немає транзакцій</div>';
        return;
    }
    
    let html = '';
    for (const t of transactions) {
        const dateStr = t.date ? t.date.toLocaleDateString('uk-UA') : '';
        const sign = t.type === 'income' ? '+' : '-';
        const amountClass = t.type === 'income' ? 'income-text' : 'expense-text';
        
        html += `
            <div class="transaction-item transaction-${t.type}">
                <div>
                    <strong>${t.category}</strong>
                    <div class="transaction-category">${t.description || 'Без опису'}</div>
                    <div style="font-size: 12px; color: #999;">${dateStr}</div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${sign} ${t.amount.toFixed(2)} ₴
                </div>
                <button class="delete-btn" onclick="deleteTransaction('${t.id}')">🗑️</button>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ========== ОНОВЛЕННЯ БАЛАНСУ ==========
function updateBalance(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    
    for (const t of transactions) {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
        }
    }
    
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
        alert("Помилка: " + error.message);
    }
};

// ========== ФІЛЬТРАЦІЯ ==========
document.getElementById('filter-category').addEventListener('change', () => {
    loadTransactions();
});

// ========== СТЕЖЕННЯ ЗА КОРИСТУВАЧЕМ (з редиректом) ==========
auth.getRedirectResult().then((result) => {
    if (result.user) {
        console.log("Користувач увійшов через редирект:", result.user.email);
    }
}).catch((error) => {
    console.error("Помилка редиректу:", error);
});

auth.onAuthStateChanged((user) => {
    currentUser = user;
    
    if (user) {
        console.log("✅ Увійшов:", user.email);
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/50';
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        loadTransactions();
    } else {
        console.log("❌ Не увійшов");
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('transactions-list').innerHTML = '<div class="empty-state">💡 Увійдіть, щоб побачити транзакції</div>';
    }
});

console.log("✅ Скрипт завантажено!!!");
