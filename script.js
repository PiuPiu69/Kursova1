// ========== ГЛОБАЛЬНІ ЗМІННІ ==========
let currentUser = null;
let transactions = [];

// ========== ІНІЦІАЛІЗАЦІЯ Firebase (ваші дані) ==========
const firebaseConfig = {
    apiKey: "AIzaSyDu4HEpjWVfJOE4GMji2ux-KK_47-YRvfw",
    authDomain: "kursova1-4e839.firebaseapp.com",
    projectId: "kursova1-4e839",
    storageBucket: "kursova1-4e839.firebasestorage.app",
    messagingSenderId: "580567528040",
    appId: "1:580567528040:web:81c77c2a05bf9c183841dd"
};

// Ініціалізація Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// ========== ФУНКЦІЯ ВХОДУ ==========
window.signIn = () => {
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Вхід успішний:", result.user.displayName);
        })
        .catch((error) => {
            console.error("Помилка входу:", error);
            alert("Помилка входу: " + error.message);
        });
};

// ========== ФУНКЦІЯ ВИХОДУ ==========
window.logout = () => {
    auth.signOut().then(() => {
        console.log("Вихід виконано");
    }).catch((error) => {
        console.error("Помилка виходу:", error);
    });
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
    
    // Перевірка коректності суми
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Введіть коректну суму (більше 0)");
        return;
    }
    
    try {
        // Додаємо транзакцію в базу даних
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
        
        // Оновлюємо список транзакцій та баланс
        await loadTransactions();
        
        console.log("Транзакцію додано успішно!");
    } catch (error) {
        console.error("Помилка додавання транзакції:", error);
        alert("Помилка збереження: " + error.message);
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
            transactions.push({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate() || new Date()
            });
        });
        
        // Застосовуємо фільтр та оновлюємо відображення
        applyFilter();
        updateBalance();
        
        console.log(`Завантажено ${transactions.length} транзакцій`);
    } catch (error) {
        console.error("Помилка завантаження транзакцій:", error);
    }
}

// ========== ФІЛЬТРАЦІЯ ТРАНЗАКЦІЙ ==========
function applyFilter() {
    const filterCategory = document.getElementById('filter-category').value;
    let filtered = transactions;
    
    if (filterCategory !== 'all') {
        filtered = transactions.filter(t => t.category === filterCategory);
    }
    
    renderTransactions(filtered);
}

// ========== ВІДОБРАЖЕННЯ ТРАНЗАКЦІЙ ==========
function renderTransactions(transactionsList) {
    const container = document.getElementById('transactions-list');
    
    if (!transactionsList || transactionsList.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Немає транзакцій. Додайте першу!</div>';
        return;
    }
    
    container.innerHTML = transactionsList.map(t => {
        const dateStr = t.date ? t.date.toLocaleDateString('uk-UA') : new Date().toLocaleDateString('uk-UA');
        return `
            <div class="transaction-item transaction-${t.type}">
                <div>
                    <strong>${t.category}</strong>
                    <div class="transaction-category">${t.description || 'Без опису'}</div>
                    <div class="transaction-date">${dateStr}</div>
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
    
    // Оновлюємо HTML елементи
    document.getElementById('balance').innerHTML = `${balance.toFixed(2)} ₴`;
    document.getElementById('total-income').innerHTML = totalIncome.toFixed(2);
    document.getElementById('total-expense').innerHTML = totalExpense.toFixed(2);
    
    // Змінюємо колір балансу (зелений/червоний)
    const balanceElement = document.getElementById('balance');
    if (balance >= 0) {
        balanceElement.style.color = '#10b981';
    } else {
        balanceElement.style.color = '#ef4444';
    }
    
    console.log(`Баланс оновлено: доходи=${totalIncome}, витрати=${totalExpense}, баланс=${balance}`);
}

// ========== ВИДАЛЕННЯ ТРАНЗАКЦІЇ ==========
window.deleteTransaction = async (id) => {
    if (!confirm('Видалити цю транзакцію?')) return;
    
    try {
        await db.collection('transactions').doc(id).delete();
        console.log("Транзакцію видалено");
        await loadTransactions(); // Перезавантажуємо список
    } catch (error) {
        console.error("Помилка видалення:", error);
        alert("Помилка видалення: " + error.message);
    }
};

// ========== СТЕЖЕННЯ ЗА СТАТУСОМ АВТЕНТИФІКАЦІЇ ==========
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log("Користувач увійшов:", user.displayName, user.email);
        
        // Відображаємо інформацію про користувача
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/50';
        
        // Показуємо основний екран, ховаємо екран входу
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        
        // Завантажуємо транзакції
        loadTransactions();
    } else {
        currentUser = null;
        console.log("Користувач вийшов");
        
        // Показуємо екран входу, ховаємо основний екран
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
        
        // Очищаємо список транзакцій
        transactions = [];
        renderTransactions([]);
        updateBalance();
    }
});

// ========== НАЛАШТУВАННЯ ФІЛЬТРА ==========
document.getElementById('filter-category').addEventListener('change', () => {
    applyFilter();
});

console.log("Скрипт завантажено!");
