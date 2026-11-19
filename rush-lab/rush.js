const grid = document.querySelector("#products");
const cards = [...grid.querySelectorAll(".product")];
const filters = [...document.querySelectorAll("[data-filter]")];
const sort = document.querySelector("#sort");
const filterStatus = document.querySelector("#filter-status");
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const products = new Map(cards.map((card) => {
  const { id, price, cost } = card.dataset;
  return [id, {
    id,
    price: Number(price),
    cost: Number(cost),
    name: card.querySelector("h3").textContent,
    button: card.querySelector("[data-save]"),
  }];
}));

const comparators = {
  rating: (a, b) => Number(b.dataset.rating) - Number(a.dataset.rating),
  sales: (a, b) => Number(b.dataset.sales) - Number(a.dataset.sales),
  price: (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
};

let category = "all";

function updateProducts() {
  const compare = comparators[sort.value];
  const ordered = compare ? [...cards].sort(compare) : cards;
  let visible = 0;
  for (const card of ordered) {
    card.hidden = category !== "all" && card.dataset.category !== category;
    visible += Number(!card.hidden);
    grid.append(card);
  }
  filterStatus.textContent = `${visible} products shown.`;
}

for (const button of filters) {
  button.addEventListener("click", () => {
    category = button.dataset.filter;
    for (const filter of filters) {
      filter.setAttribute("aria-pressed", String(filter === button));
    }
    updateProducts();
  });
}
sort.addEventListener("change", updateProducts);

const storageKey = "rush-lab:batch-01:drop-list";

function readSaved() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(stored) ? stored.filter((id) => products.has(id)) : [];
  } catch {
    return [];
  }
}

const saved = new Set(readSaved());
const dialog = document.querySelector("#drop-list");
const count = document.querySelector("#list-count");
const list = document.querySelector("#saved-products");
const empty = document.querySelector("#empty-list");
const total = document.querySelector("#list-total");
const clear = document.querySelector("#clear-list");
const listStatus = document.querySelector("#list-status");
const heroSave = document.querySelector("#turn-save");
const featured = products.get("blue-mirror");
document.querySelector("#turn-price").textContent = money.format(featured.price / 100);
heroSave.addEventListener("click", () => featured.button.click());

function renderList() {
  count.textContent = saved.size;
  empty.hidden = saved.size > 0;
  clear.disabled = saved.size === 0;
  let subtotal = 0;
  const rows = [];
  for (const item of products.values()) {
    const included = saved.has(item.id);
    item.button.setAttribute("aria-pressed", String(included));
    item.button.textContent = included ? "Saved to Drop List" : "Save to Drop List";
    if (included) {
      subtotal += item.price;
      const row = document.createElement("li");
      const name = document.createElement("span");
      const price = document.createElement("span");
      name.textContent = item.name;
      price.textContent = money.format(item.price / 100);
      row.append(name, price);
      rows.push(row);
    }
  }
  heroSave.setAttribute("aria-pressed", featured.button.getAttribute("aria-pressed"));
  heroSave.textContent = featured.button.textContent;
  list.replaceChildren(...rows);
  total.textContent = money.format(subtotal / 100);
}

function saveList(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...saved]));
  } catch {
    // The shortlist remains available for this visit when storage is blocked.
  }
  renderList();
  listStatus.textContent = message;
}

for (const item of products.values()) {
  item.button.addEventListener("click", () => {
    if (saved.delete(item.id)) {
      saveList(`${item.name} removed from Drop List.`);
    } else {
      saved.add(item.id);
      saveList(`${item.name} saved to Drop List.`);
    }
  });
}
document.querySelector("#open-list").addEventListener("click", () => dialog.showModal());
document.querySelector("#close-list").addEventListener("click", () => dialog.close());
clear.addEventListener("click", () => {
  document.querySelector("#close-list").focus();
  saved.clear();
  saveList("Drop List cleared.");
});
renderList();

const productSelect = document.querySelector("#margin-product");
const testPrice = document.querySelector("#test-price");
const landedCost = document.querySelector("#landed-cost strong");
const margin = document.querySelector("#margin-output strong");

function updateMargin() {
  const { cost } = products.get(productSelect.value);
  landedCost.textContent = money.format(cost / 100);
  margin.textContent = testPrice.validity.valid
    ? money.format((Math.round(testPrice.valueAsNumber * 100) - cost) / 100)
    : "Enter a valid price";
}

productSelect.addEventListener("change", () => {
  testPrice.value = (products.get(productSelect.value).price / 100).toFixed(2);
  updateMargin();
});
testPrice.addEventListener("input", updateMargin);
document.querySelector("#calculator").addEventListener("submit", (event) => event.preventDefault());
updateMargin();
