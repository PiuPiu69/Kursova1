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

// ========== ВХІД ==========
window.signIn = () => {
    auth.signInWithPopup(provider).catch(e => console.error("Помилка входу:", e));
};

// ========== ВИХІД ==========
window.logout = () => {
    auth.signOut();
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
        
        // Очищаємо форму
        document.getElementById('trans-amount').value = '';
        document.getElementById('trans-desc').value = '';
        
        // ОНОВЛЮЄМО СПИСОК (це ключовий рядок!)
        await loadTransactions();
        
    } catch (error) {
        console.error("Помилка:", error);
        alert("Помилка: " + error.message);
    }
};

// ========== ЗАВАНТАЖЕННЯ ТРАНЗАКЦІЙ ==========
async function loadTransactions() {
    console.log("loadTransactions() викликано");
    
    if (!currentUser) {
        console.log("Немає користувача");
        return;
    }
    
    try {
        const snapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .get();
        
        console.log("Отримано документів:", snapshot.size);
        
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
        
        console.log("Транзакції:", transactions);
        
        // Відображаємо список
        displayTransactions(transactions);
        
        // Оновлюємо баланс
        updateBalance(transactions);
        
    } catch (error) {
        console.error("Помилка завантаження:", error);
    }
}

// ========== ВІДОБРАЖЕННЯ ТРАНЗАКЦІЙ ==========
function displayTransactions(transactions) {
    const container = document.getElementById('transactions-list');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Немає транзакцій. Додайте першу!</div>';
        return;
    }
    
    let html = '';
    for (const t of transactions) {
        const dateStr = t.date ? t.date.toLocaleDateString('uk-UA') : '';
        const sign = t.type === 'income' ? '+' : '-';
        const amountClass = t.type === 'income' ? 'income-text' : 'expense-text';
        
        html += `
            <div class="transaction-item transaction-${t.type}">
                <div style="flex: 2;">
                    <strong>${t.category}</strong>
                    <div class="transaction-category">${t.description || 'Без опису'}</div>
                    <div style="font-size: 12px; color: #999;">${dateStr}</div>
                </div>
                <div class="transaction-amount ${amountClass}" style="flex: 1; text-align: right;">
                    ${sign} ${t.amount.toFixed(2)} ₴
                </div>
                <button class="delete-btn" onclick="deleteTransaction('${t.id}')" style="margin-left: 10px;">🗑️</button>
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
    
    console.log(`Баланс: доходи=${totalIncome}, витрати=${totalExpense}, баланс=${balance}`);
}

// ========== ВИДАЛЕННЯ ТРАНЗАКЦІЇ ==========
window.deleteTransaction = async (id) => {
    if (!confirm('Видалити транзакцію?')) return;
    
    try {
        await db.collection('transactions').doc(id).delete();
        console.log("Видалено, ID:", id);
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

// ========== СТЕЖЕННЯ ЗА КОРИСТУВАЧЕМ ==========
auth.onAuthStateChanged((user) => {
    currentUser = user;
    
    if (user) {
        console.log("✅ Увійшов:", user.email);
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/50';
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        
        // ЗАВАНТАЖУЄМО ТРАНЗАКЦІЇ ПІСЛЯ ВХОДУ
        loadTransactions();
        
    } else {
        console.log("❌ Вийшов");
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
        
        // Очищаємо список
        document.getElementById('transactions-list').innerHTML = '<div class="empty-state">💡 Увійдіть, щоб побачити транзакції</div>';
        document.getElementById('balance').innerHTML = '0.00 ₴';
        document.getElementById('total-income').innerHTML = '0';
        document.getElementById('total-expense').innerHTML = '0';
    }
});

console.log("✅ Скрипт завантажено!");
