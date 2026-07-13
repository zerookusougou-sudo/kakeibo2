"use strict";

// ------- 設定 -------
const STORAGE_KEY = "kakeibo.entries.v1";

const CATEGORIES = {
  expense: ["食費", "日用品", "交通費", "住居", "水道光熱費", "娯楽", "医療", "その他"],
  income: ["給与", "ボーナス", "副収入", "お小遣い", "その他"],
};

// ------- 状態 -------
/** @type {{id:string, type:'income'|'expense', date:string, category:string, amount:number, memo:string}[]} */
let entries = loadEntries();

// ------- DOM -------
const form = document.getElementById("entryForm");
const dateInput = document.getElementById("date");
const categorySelect = document.getElementById("category");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const typeRadios = document.querySelectorAll('input[name="type"]');
const listEl = document.getElementById("entryList");
const emptyMessage = document.getElementById("emptyMessage");
const filterMonth = document.getElementById("filterMonth");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const balanceEl = document.getElementById("balance");

// ------- 初期化 -------
function init() {
  const today = new Date();
  dateInput.value = toISODate(today);
  filterMonth.value = toISOMonth(today);
  populateCategories();
  render();

  form.addEventListener("submit", handleSubmit);
  typeRadios.forEach((r) => r.addEventListener("change", populateCategories));
  filterMonth.addEventListener("change", render);
}

// ------- ユーティリティ -------
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function toISODate(d) {
  return d.toLocaleDateString("sv-SE"); // YYYY-MM-DD（ローカル時刻）
}

function toISOMonth(d) {
  return toISODate(d).slice(0, 7); // YYYY-MM
}

function formatYen(n) {
  return "¥" + n.toLocaleString("ja-JP");
}

function getSelectedType() {
  return document.querySelector('input[name="type"]:checked').value;
}

// ------- カテゴリ -------
function populateCategories() {
  const type = getSelectedType();
  categorySelect.innerHTML = "";
  CATEGORIES[type].forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });
}

// ------- 追加 -------
function handleSubmit(e) {
  e.preventDefault();
  const amount = Math.round(Number(amountInput.value));
  if (!amount || amount <= 0) {
    amountInput.focus();
    return;
  }

  entries.push({
    id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random()),
    type: getSelectedType(),
    date: dateInput.value,
    category: categorySelect.value,
    amount,
    memo: memoInput.value.trim(),
  });

  saveEntries();

  // 入力欄をリセット（日付・種別は維持）
  amountInput.value = "";
  memoInput.value = "";
  amountInput.focus();

  render();
}

// ------- 削除 -------
function deleteEntry(id) {
  entries = entries.filter((en) => en.id !== id);
  saveEntries();
  render();
}

// ------- 表示 -------
function render() {
  const month = filterMonth.value;
  const visible = entries
    .filter((en) => !month || en.date.startsWith(month))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // サマリー
  let income = 0;
  let expense = 0;
  visible.forEach((en) => {
    if (en.type === "income") income += en.amount;
    else expense += en.amount;
  });
  totalIncomeEl.textContent = formatYen(income);
  totalExpenseEl.textContent = formatYen(expense);
  balanceEl.textContent = formatYen(income - expense);

  // リスト
  listEl.innerHTML = "";
  if (visible.length === 0) {
    emptyMessage.classList.remove("hidden");
    emptyMessage.textContent = month
      ? "この月の記録はありません。"
      : "まだ記録がありません。";
    return;
  }
  emptyMessage.classList.add("hidden");

  visible.forEach((en) => listEl.appendChild(createEntryEl(en)));
}

function createEntryEl(en) {
  const li = document.createElement("li");
  li.className = "entry-item";

  const main = document.createElement("div");
  main.className = "entry-main";

  const cat = document.createElement("div");
  cat.className = "entry-category";
  cat.textContent = en.category;
  main.appendChild(cat);

  const meta = document.createElement("div");
  meta.className = "entry-meta";
  meta.textContent = en.date;
  main.appendChild(meta);

  if (en.memo) {
    const memo = document.createElement("div");
    memo.className = "entry-memo";
    memo.textContent = en.memo;
    main.appendChild(memo);
  }

  const amount = document.createElement("div");
  amount.className = "entry-amount " + en.type;
  amount.textContent = (en.type === "income" ? "+" : "-") + formatYen(en.amount);

  const del = document.createElement("button");
  del.className = "delete-btn";
  del.type = "button";
  del.setAttribute("aria-label", "削除");
  del.textContent = "✕";
  del.addEventListener("click", () => deleteEntry(en.id));

  li.append(main, amount, del);
  return li;
}

init();
