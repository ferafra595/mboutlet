import { useCallback, useEffect, useMemo, useState } from 'react';
import Scanner from './components/Scanner.jsx';
import { categories, seedProducts, seedSales } from './data/seed.js';
import { clearStorage, readStorage, writeStorage } from './lib/storage.js';
import { calculateCommission, currentRate, euro, localDate, localTime, monthKey, monthLabel, number } from './lib/utils.js';

const ADMIN_USER = import.meta.env.VITE_ADMIN_USER || 'effedigital';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'cambia-password';
const emptyProduct = { barcode: '', name: '', size: '', color: '', category: 'Abiti', price: '', stock: 0 };

function Metric({ label, value, note, accent = false }) {
  return <article className="metric"><span>{label}</span><strong className={accent ? 'gold' : ''}>{value}</strong><small>{note}</small></article>;
}

function ProductCard({ product, onIncrease, onDecrease, onDelete }) {
  return (
    <article className="product-card">
      <div className="product-card__top">
        <div>
          <h3>{product.name}</h3>
          <code>{product.barcode}</code>
        </div>
        <span className={`stock ${product.stock === 0 ? 'stock--empty' : product.stock <= 1 ? 'stock--low' : ''}`}>{product.stock} pz</span>
      </div>
      <div className="tags">
        <span>T. {product.size || '—'}</span><span>{product.color || '—'}</span><span>{product.category}</span><b>{euro(product.price)}</b>
      </div>
      <div className="product-card__actions">
        <button className="button button--success" onClick={() => onIncrease(product)}>+ Entrata</button>
        <button className="button button--danger" onClick={() => onDecrease(product)} disabled={product.stock <= 0}>− Uscita</button>
        <button className="icon-button" title="Elimina prodotto" onClick={() => onDelete(product)}>×</button>
      </div>
    </article>
  );
}

export default function App() {
  const [products, setProducts] = useState(() => readStorage('products', seedProducts));
  const [sales, setSales] = useState(() => readStorage('sales', seedSales));
  const [area, setArea] = useState('client');
  const [isLogged, setIsLogged] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [login, setLogin] = useState({ user: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [scanMode, setScanMode] = useState(null);
  const [scannerTarget, setScannerTarget] = useState(null);
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState(null);
  const [scanError, setScanError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tutti');
  const [toast, setToast] = useState(null);

  useEffect(() => writeStorage('products', products), [products]);
  useEffect(() => writeStorage('sales', sales), [sales]);

  const notify = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const currentMonth = monthKey();
  const monthSales = useMemo(() => sales.filter((sale) => sale.date.startsWith(currentMonth)), [sales, currentMonth]);
  const monthRevenue = useMemo(() => monthSales.reduce((sum, sale) => sum + sale.price, 0), [monthSales]);
  const totalRevenue = useMemo(() => sales.reduce((sum, sale) => sum + sale.price, 0), [sales]);
  const stockTotal = useMemo(() => products.reduce((sum, product) => sum + product.stock, 0), [products]);
  const stockValue = useMemo(() => products.reduce((sum, product) => sum + product.stock * product.price, 0), [products]);
  const commission = calculateCommission(monthRevenue);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [product.name, product.barcode, product.id, product.color, product.size].some((value) => String(value).toLowerCase().includes(query));
    const matchesCategory = category === 'Tutti' || product.category === category;
    return matchesQuery && matchesCategory;
  }), [products, search, category]);

  const findProduct = useCallback((value) => products.find((product) => product.barcode === value.trim() || product.id === value.trim()), [products]);

  const searchCode = useCallback((value = code) => {
    const product = findProduct(value);
    if (!product) {
      setSelected(null);
      setScanError('Codice non trovato. Controllalo oppure aggiungi il prodotto.');
      return;
    }
    setSelected(product);
    setScanError('');
  }, [code, findProduct]);

  const handleDetected = useCallback((value) => {
    setScannerTarget(null);
    if (scanMode === 'new') {
      setForm((old) => ({ ...old, barcode: value }));
      notify('Codice acquisito.');
      return;
    }
    setCode(value);
    const product = findProduct(value);
    if (product) {
      setSelected(product);
      setScanError('');
    } else {
      setSelected(null);
      setScanError('Codice non trovato.');
    }
  }, [findProduct, notify, scanMode]);

  const recordSale = (product) => {
    if (product.stock <= 0) return notify('Prodotto esaurito.', 'error');
    const sale = { id: crypto.randomUUID?.() || String(Date.now()), productId: product.id, name: product.name, size: product.size, price: product.price, date: localDate(), time: localTime() };
    setSales((old) => [sale, ...old]);
    setProducts((old) => old.map((item) => item.id === product.id ? { ...item, stock: item.stock - 1 } : item));
    setSelected(null); setCode(''); setScanMode(null);
    notify(`Vendita registrata: ${product.name}`);
  };

  const increaseStock = (product) => {
    setProducts((old) => old.map((item) => item.id === product.id ? { ...item, stock: item.stock + 1 } : item));
    notify(`Entrata registrata: ${product.name}`);
  };

  const decreaseStock = (product) => {
    if (product.stock <= 0) return;
    setProducts((old) => old.map((item) => item.id === product.id ? { ...item, stock: item.stock - 1 } : item));
    notify(`Uscita registrata: ${product.name}`);
  };

  const addProduct = (event) => {
    event.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.barcode.trim() || !form.name.trim() || !Number.isFinite(price) || price <= 0) return notify('Compila codice, nome e prezzo.', 'error');
    if (products.some((product) => product.barcode === form.barcode.trim())) return notify('Questo codice è già presente.', 'error');
    const product = { ...form, id: `P${Date.now()}`, barcode: form.barcode.trim(), name: form.name.trim(), price, stock: Number.isFinite(stock) && stock >= 0 ? stock : 0 };
    setProducts((old) => [product, ...old]);
    setForm(emptyProduct); setShowForm(false);
    notify('Prodotto aggiunto.');
  };

  const deleteProduct = (product) => {
    if (!window.confirm(`Eliminare definitivamente “${product.name}”?`)) return;
    setProducts((old) => old.filter((item) => item.id !== product.id));
    notify('Prodotto eliminato.');
  };

  const loginSubmit = (event) => {
    event.preventDefault();
    if (login.user.trim() === ADMIN_USER && login.password === ADMIN_PASSWORD) {
      setIsLogged(true); setArea('admin'); setLoginError(''); setLogin({ user: '', password: '' });
    } else setLoginError('Credenziali non corrette.');
  };

  const exportData = () => {
    const file = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), products, sales }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url; link.download = `outlet-backup-${localDate()}.json`; link.click();
    URL.revokeObjectURL(url);
  };

  const resetData = () => {
    if (!window.confirm('Ripristinare i dati iniziali? Vendite e modifiche locali saranno cancellate.')) return;
    clearStorage(); setProducts(seedProducts); setSales(seedSales); notify('Dati ripristinati.');
  };

  const openAdmin = () => setArea(isLogged ? 'admin' : 'login');

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">EFFE DIGITAL STRATEGY</span><h1>Outlet <b>Maurizio Boutique</b></h1></div>
        <div className="topbar__actions">
          {isLogged && area === 'admin' && <button className="button button--ghost button--small" onClick={() => { setIsLogged(false); setArea('client'); }}>Esci</button>}
          <div className="switcher"><button className={area === 'client' ? 'active' : ''} onClick={() => setArea('client')}>Cliente</button><button className={area !== 'client' ? 'active' : ''} onClick={openAdmin}>Effe</button></div>
        </div>
      </header>

      <main className="page">
        {area === 'client' && (
          <section>
            <div className="hero-card"><span>GESTIONE RAPIDA</span><h2>Registra un movimento</h2><p>Scansiona il codice del capo oppure inseriscilo manualmente.</p></div>
            <div className="action-grid">
              <button className="action-card" onClick={() => { setScanMode('sale'); setSelected(null); setScanError(''); }}><span>−</span><strong>Registra vendita</strong><small>Scala un capo dal magazzino</small></button>
              <button className="action-card" onClick={() => { setScanMode('entry'); setSelected(null); setScanError(''); }}><span>+</span><strong>Registra entrata</strong><small>Aggiunge un capo allo stock</small></button>
            </div>
            {scanMode && scanMode !== 'new' && (
              <section className="panel scan-panel">
                <div className="panel__heading"><div><span>{scanMode === 'sale' ? 'VENDITA' : 'ENTRATA'}</span><h2>Cerca il prodotto</h2></div><button className="icon-button" onClick={() => { setScanMode(null); setSelected(null); }}>×</button></div>
                <button className="button" onClick={() => setScannerTarget(scanMode)}>⌁ Scansiona con fotocamera</button>
                <div className="separator"><span>oppure</span></div>
                <div className="search-row"><input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchCode()} placeholder="Codice a barre o ID" autoFocus/><button className="button button--secondary" onClick={() => searchCode()}>Cerca</button></div>
                {scanError && <p className="alert alert--error">{scanError}</p>}
                {selected && <article className="result-card"><div><span>{selected.category}</span><h3>{selected.name}</h3><p>Taglia {selected.size || '—'} · {selected.color || '—'} · Stock {selected.stock}</p></div><strong>{euro(selected.price)}</strong><button className={`button ${scanMode === 'entry' ? 'button--info' : 'button--success'}`} onClick={() => scanMode === 'sale' ? recordSale(selected) : increaseStock(selected)}>{scanMode === 'sale' ? 'Conferma vendita' : 'Conferma entrata'}</button></article>}
              </section>
            )}
            <div className="client-summary"><span>Disponibilità attuale</span><strong>{number(stockTotal)} capi</strong><small>Aggiornamento automatico su questo dispositivo</small></div>
          </section>
        )}

        {area === 'login' && (
          <form className="login-card" onSubmit={loginSubmit}><span className="eyebrow">AREA RISERVATA</span><h2>Accesso Effe</h2><label>Nome utente<input value={login.user} onChange={(e) => setLogin({ ...login, user: e.target.value })} autoComplete="username"/></label><label>Password<input type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} autoComplete="current-password"/></label>{loginError && <p className="alert alert--error">{loginError}</p>}<button className="button" type="submit">Accedi</button><button className="button button--ghost" type="button" onClick={() => setArea('client')}>Torna alla vista cliente</button></form>
        )}

        {area === 'admin' && isLogged && (
          <section>
            <nav className="tabs">{[['dashboard','Dashboard'],['warehouse','Magazzino'],['sales','Vendite']].map(([key,label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>

            {tab === 'dashboard' && (
              <>
                <div className="metrics-grid"><Metric label="Fatturato mese" value={euro(monthRevenue)} note={`${monthSales.length} vendite`} /><Metric label="Quota Effe mese" value={euro(commission.total)} note={`Aliquota marginale ${currentRate(monthRevenue)}%`} accent/><Metric label="Capi in stock" value={number(stockTotal)} note="Pezzi disponibili"/><Metric label="Valore magazzino" value={euro(stockValue)} note="A prezzo di vendita"/></div>
                <section className="panel"><div className="panel__heading"><div><span>PROVVIGIONI</span><h2>Calcolo progressivo del mese</h2></div><strong className="gold">{euro(commission.total)}</strong></div>{commission.details.map((tier) => <div className="tier" key={tier.from}><div><strong>{euro(tier.from)} – {tier.to === Infinity ? 'oltre' : euro(tier.to)}</strong><small>Quota elaborata: {euro(tier.taxable)}</small></div><span>{tier.rate}% · {euro(tier.commission)}</span></div>)}</section>
                <section className="panel"><div className="panel__heading"><div><span>STATO</span><h2>Prodotti da controllare</h2></div></div>{products.filter((product) => product.stock <= 1).length ? products.filter((product) => product.stock <= 1).map((product) => <div className="list-row" key={product.id}><div><strong>{product.name}</strong><small>T. {product.size || '—'} · {product.color || '—'}</small></div><span className={`stock ${product.stock === 0 ? 'stock--empty' : 'stock--low'}`}>{product.stock === 0 ? 'Esaurito' : '1 rimasto'}</span></div>) : <p className="empty">Nessun prodotto con stock basso.</p>}</section>
              </>
            )}

            {tab === 'warehouse' && (
              <>
                <div className="toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca nome, barcode, taglia…"/><select value={category} onChange={(e) => setCategory(e.target.value)}><option>Tutti</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><button className="button" onClick={() => setShowForm((value) => !value)}>+ Nuovo prodotto</button></div>
                {showForm && <form className="panel form-grid" onSubmit={addProduct}><div className="panel__heading form-grid__full"><div><span>MAGAZZINO</span><h2>Aggiungi prodotto</h2></div><button type="button" className="icon-button" onClick={() => setShowForm(false)}>×</button></div><div className="field-with-action"><input placeholder="Codice a barre *" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}/><button type="button" className="button button--secondary" onClick={() => { setScanMode('new'); setScannerTarget('new'); }}>Scansiona</button></div><input placeholder="Nome prodotto *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/><input placeholder="Taglia" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}/><input placeholder="Colore" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}/><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select><input type="number" min="0.01" step="0.01" placeholder="Prezzo € *" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}/><input type="number" min="0" step="1" placeholder="Stock iniziale" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}/><button className="button form-grid__full" type="submit">Salva prodotto</button></form>}
                <div className="product-list">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} onIncrease={increaseStock} onDecrease={decreaseStock} onDelete={deleteProduct}/>)}{!filteredProducts.length && <p className="empty">Nessun prodotto trovato.</p>}</div>
                <div className="data-actions"><button className="button button--ghost" onClick={exportData}>Esporta backup JSON</button><button className="button button--danger" onClick={resetData}>Ripristina dati demo</button></div>
              </>
            )}

            {tab === 'sales' && (
              <>
                <section className="panel"><div className="panel__heading"><div><span>STORICO</span><h2>Vendite registrate</h2></div><strong>{euro(totalRevenue)}</strong></div>{sales.length ? [...sales].sort((a,b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)).map((sale) => <div className="list-row" key={sale.id}><div><strong>{sale.name}</strong><small>T. {sale.size || '—'} · {sale.date} · {sale.time}</small></div><b className="gold">{euro(sale.price)}</b></div>) : <p className="empty">Non ci sono ancora vendite registrate.</p>}</section>
                <section className="panel"><div className="panel__heading"><div><span>RIEPILOGO</span><h2>Totali mensili</h2></div></div>{Object.entries(sales.reduce((acc,sale) => ({ ...acc, [sale.date.slice(0,7)]: (acc[sale.date.slice(0,7)] || 0) + sale.price }), {})).sort((a,b) => b[0].localeCompare(a[0])).map(([month,total]) => <div className="list-row" key={month}><div><strong>{monthLabel(month)}</strong><small>Quota Effe: {euro(calculateCommission(total).total)}</small></div><b>{euro(total)}</b></div>)}</section>
              </>
            )}
          </section>
        )}
      </main>

      {toast && <div className={`toast ${toast.type === 'error' ? 'toast--error' : ''}`}>{toast.text}</div>}
      {scannerTarget && <Scanner onDetect={handleDetected} onClose={() => setScannerTarget(null)}/>} 
    </div>
  );
}
