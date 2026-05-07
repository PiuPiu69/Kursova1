let currentUser = null;
let transactions = [];

window.initAuth = () => {
    onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('user-name').innerText = user.displayName;
            document.getElementById('user-avatar').src = user.photoURL;
            document.getElementById('auth-screen').classList.remove('active');
            document.getElementById('app-screen').classList.add('active');
            await loadTransactions();
        } else {
            document.getElementById('auth-screen').classList.add('active');
            document.getElementById('app-screen').classList.remove('active');
            currentUser = null;
        }
    });
};

window.addTransaction = async () => {
    if (!currentUser) return;
    
    const type = document.getElementById('trans-type').value;
    const amount = parseFloat(document.getElementById('trans-amount').value);
    const category = document.getElementById('trans-category').value;
    const description = document.getElementById('trans-desc').value;
    
    if (!amount || isNaN(amount)) {
        alert('Введіть суму');
        return;
    }
    
    await window.addDoc(window.collection(window.db, 'transactions'), {
        userId: currentUser.uid,
        type: type,
        amount: amount,
        category: category,
        description: description,
        date: new Date().toISOString()
    });
    
    document.getElementById('trans-amount').value = '';
    document.getElementById('trans-desc').value = '';
    await loadTransactions();
};

async function loadTransactions() {
    if (!currentUser) return;
    
    const q = window.query(
        window.collection(window.db, 'transactions'),
        window.where('userId', '==', currentUser.uid),
        window.orderBy('date', 'desc')
    );
    
    const snapshot = await window.getDocs(q);
    transactions = [];
    snapshot.forEach(doc => {
        transactions.push({ id: doc.id, ...doc.data() });
    });
    
    applyFilter();
    updateBalance();
}

async function deleteTransaction(id) {
    await window.deleteDoc(window.doc(window.db, 'transactions', id));
    await loadTransactions();
}

function applyFilter() {
    const filterCategory = document.getElementById('filter-category').value;
    let filtered = transactions;
    
    if (filterCategory !== 'all') {
        filtered = transactions.filter(t => t.category === filterCategory);
    }
    
    renderTransactions(filtered);
}

function renderTransactions(transactionsList) {
    const container = document.getElementById('transactions-list');
    
    if (transactionsList.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Немає транзакцій</div>';
        return;
    }
    
    container.innerHTML = transactionsList.map(t => `
        <div class="transaction-item transaction-${t.type}">
            <div>
                <strong>${t.category}</strong>
                <div class="transaction-category">${t.description || 'Без опису'}</div>
                <div>${new Date(t.date).toLocaleDateString('uk-UA')}</div>
            </div>
            <div class="transaction-amount ${t.type === 'income' ? 'income-text' : 'expense-text'}">
                ${t.type === 'income' ? '+' : '-'} ${t.amount} ₴
            </div>
            <button class="delete-btn" onclick="deleteTransaction('${t.id}')">🗑️</button>
        </div>
    `).join('');
}

function updateBalance() {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
    });
    
    const balance = totalIncome - totalExpense;
    document.getElementById('balance').innerText = `${balance.toFixed(2)} ₴`;
    document.getElementById('total-income').innerText = totalIncome.toFixed(2);
    document.getElementById('total-expense').innerText = totalExpense.toFixed(2);
}

// Event listeners
document.getElementById('filter-category').addEventListener('change', () => {
    applyFilter();
});

window.deleteTransaction = deleteTransaction;

// Start
window.initAuth();
