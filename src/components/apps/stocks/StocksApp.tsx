import { useEffect, useState } from 'react'
import { useAuthStore } from '../../../store/authStore'
import { supabase } from '../../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────
interface Stock {
    ticker: string
    name: string
    current_price: number
    prev_close: number
}

interface Holding {
    ticker: string
    shares: number
    avg_buy_price: number
}

interface Transaction {
    id: string
    ticker: string
    type: 'buy' | 'sell'
    shares: number
    price_at_time: number
    total: number
    created_at: string
}

type Tab = 'market' | 'portfolio' | 'history'

// ── Auth gate wrapper ──────────────────────────────────────────────
export default function StocksApp({ windowId: _windowId }: { windowId: string }) {
    const { user } = useAuthStore()
    if (!user) return <StocksLogin />
    return <StocksMain />
}

// ── Login form inside the window ───────────────────────────────────
function StocksLogin() {
    const { signIn, signUp } = useAuthStore()
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        setError(null)
        setLoading(true)
        let err: string | null = null
        if (mode === 'signin') {
            err = await signIn(email, password)
        } else {
            if (!username.trim()) { setError('Username required'); setLoading(false); return }
            err = await signUp(email, password, username.trim())
        }
        if (err) setError(err)
        setLoading(false)
    }

    const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSubmit() }

    return (
        <div style={{
            width: '100%', height: '100%', background: 'var(--bg-terminal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
        }}>
            <div style={{ width: 320 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em' }}>
                        RonakOS Markets
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>
                        {mode === 'signin' ? 'sign in to trade' : 'create account'}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {mode === 'signup' && (
                        <LoginField label="username" value={username} onChange={setUsername} onKeyDown={onKey} autoFocus />
                    )}
                    <LoginField label="email" type="email" value={email} onChange={setEmail} onKeyDown={onKey} autoFocus={mode === 'signin'} />
                    <LoginField label="password" type="password" value={password} onChange={setPassword} onKeyDown={onKey} />
                </div>

                {error && <div style={{ color: 'var(--text-error)', fontSize: 11, marginTop: 10 }}>{error}</div>}

                <button onClick={handleSubmit} disabled={loading} style={{
                    marginTop: 18, width: '100%', height: 32,
                    background: loading ? 'transparent' : 'var(--accent)',
                    border: `1px solid ${loading ? 'var(--border)' : 'var(--accent)'}`,
                    borderRadius: 3, color: loading ? 'var(--text-secondary)' : '#000',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                }}>
                    {loading ? 'working...' : mode === 'signin' ? 'sign in' : 'create account'}
                </button>

                <div style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {mode === 'signin' ? "no account? " : "have an account? "}
                    <span
                        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
                        style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {mode === 'signin' ? 'sign up' : 'sign in'}
                    </span>
                </div>
            </div>
        </div>
    )
}

function LoginField({ label, value, onChange, onKeyDown, type = 'text', autoFocus = false }: {
    label: string; value: string; onChange: (v: string) => void
    onKeyDown: (e: React.KeyboardEvent) => void; type?: string; autoFocus?: boolean
}) {
    return (
        <div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.05em' }}>{label}</div>
            <input
                type={type} value={value} autoFocus={autoFocus} spellCheck={false}
                onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
                style={{
                    width: '100%', height: 30, background: 'var(--bg-window)',
                    border: '1px solid var(--border)', borderRadius: 3,
                    color: 'var(--text-primary)', fontFamily: 'inherit',
                    fontSize: 12, padding: '0 10px', outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
        </div>
    )
}

// ── Main app (authenticated) ───────────────────────────────────────
function StocksMain() {
    const { user, profile } = useAuthStore()
    const [tab, setTab] = useState<Tab>('market')
    const [stocks, setStocks] = useState<Stock[]>([])
    const [holdings, setHoldings] = useState<Holding[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [cashBalance, setCashBalance] = useState<number>(0)
    const [tradeTarget, setTradeTarget] = useState<{ ticker: string; type: 'buy' | 'sell' } | null>(null)
    const [tradeShares, setTradeShares] = useState('')
    const [tradeError, setTradeError] = useState<string | null>(null)
    const [tradeLoading, setTradeLoading] = useState(false)

    // Load stocks (and subscribe to realtime updates)
    useEffect(() => {
        supabase.from('stocks').select('*').order('ticker')
            .then(({ data }) => { if (data) setStocks(data) })

        const channel = supabase
            .channel('stocks-prices')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stocks' },
                (payload) => {
                    setStocks((prev) => prev.map((s) =>
                        s.ticker === payload.new.ticker ? { ...s, ...payload.new } : s
                    ))
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    // Load user portfolio data
    useEffect(() => {
        if (!user) return
        loadPortfolio()
    }, [user])

    async function loadPortfolio() {
        const [{ data: port }, { data: hold }, { data: tx }] = await Promise.all([
            supabase.from('portfolios').select('cash_balance').eq('user_id', user!.id).single(),
            supabase.from('holdings').select('*').eq('user_id', user!.id),
            supabase.from('transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50),
        ])
        if (port) setCashBalance(port.cash_balance)
        if (hold) setHoldings(hold)
        if (tx) setTransactions(tx)
    }

    // Portfolio value calc
    const holdingsValue = holdings.reduce((sum, h) => {
        const stock = stocks.find((s) => s.ticker === h.ticker)
        return sum + (stock ? stock.current_price * h.shares : 0)
    }, 0)
    const totalValue = cashBalance + holdingsValue

    async function executeTrade() {
        if (!tradeTarget || !user) return
        const shares = parseFloat(tradeShares)
        if (isNaN(shares) || shares <= 0) { setTradeError('Enter a valid number of shares'); return }
        const stock = stocks.find((s) => s.ticker === tradeTarget.ticker)
        if (!stock || stock.current_price <= 0) { setTradeError('Price unavailable'); return }

        setTradeLoading(true)
        setTradeError(null)

        const { data, error } = await supabase.rpc('execute_trade', {
            p_user_id: user.id,
            p_ticker: tradeTarget.ticker,
            p_type: tradeTarget.type,
            p_shares: shares,
            p_price: stock.current_price,
        })

        if (error) {
            setTradeError(error.message)
        } else if (data?.error) {
            setTradeError(data.error)
        } else {
            setTradeTarget(null)
            setTradeShares('')
            await loadPortfolio()
        }
        setTradeLoading(false)
    }

    const priceFmt = (n: number) => n > 0 ? `$${n.toFixed(2)}` : '—'
    const changePct = (s: Stock) => {
        if (!s.prev_close || s.prev_close === 0) return null
        return ((s.current_price - s.prev_close) / s.prev_close) * 100
    }

    return (
        <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            background: 'var(--bg-terminal)', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
        }}>
            {/* ── Header ── */}
            <div style={{
                padding: '10px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-window)', flexShrink: 0,
            }}>
                <div style={{ display: 'flex', gap: 24 }}>
                    <Stat label="cash" value={`$${cashBalance.toFixed(2)}`} />
                    <Stat label="holdings" value={`$${holdingsValue.toFixed(2)}`} />
                    <Stat label="total" value={`$${totalValue.toFixed(2)}`}
                        accent={totalValue >= 10000} warn={totalValue < 10000} />
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                    {profile?.username}
                    {profile?.is_admin && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>[admin]</span>}
                </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{
                display: 'flex', gap: 0, borderBottom: '1px solid var(--border)',
                background: 'var(--bg-window)', flexShrink: 0,
            }}>
                {(['market', 'portfolio', 'history'] as Tab[]).map((t) => (
                    <div key={t} onClick={() => setTab(t)} style={{
                        padding: '7px 16px', fontSize: 11, cursor: 'pointer',
                        color: tab === t ? 'var(--accent)' : 'var(--text-secondary)',
                        borderBottom: tab === t ? '1px solid var(--accent)' : '1px solid transparent',
                        transition: 'color 0.15s',
                        marginBottom: -1,
                    }}>
                        {t}
                    </div>
                ))}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>

                {/* Market tab */}
                {tab === 'market' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-secondary)', fontSize: 10, letterSpacing: '0.05em' }}>
                                <Th>ticker</Th><Th>name</Th><Th align="right">price</Th>
                                <Th align="right">change</Th><Th align="right">action</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {stocks.map((s) => {
                                const chg = changePct(s)
                                const holding = holdings.find((h) => h.ticker === s.ticker)
                                return (
                                    <tr key={s.ticker} style={{ borderTop: '1px solid var(--border)' }}>
                                        <Td><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.ticker}</span></Td>
                                        <Td><span style={{ color: 'var(--text-secondary)' }}>{s.name}</span></Td>
                                        <Td align="right">{priceFmt(s.current_price)}</Td>
                                        <Td align="right">
                                            {chg !== null ? (
                                                <span style={{ color: chg >= 0 ? 'var(--accent)' : 'var(--text-error)' }}>
                                                    {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                                                </span>
                                            ) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                                        </Td>
                                        <Td align="right">
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <TradeBtn color="var(--accent)" onClick={() => { setTradeTarget({ ticker: s.ticker, type: 'buy' }); setTradeShares(''); setTradeError(null) }}>buy</TradeBtn>
                                                {holding && holding.shares > 0 && (
                                                    <TradeBtn color="var(--text-error)" onClick={() => { setTradeTarget({ ticker: s.ticker, type: 'sell' }); setTradeShares(''); setTradeError(null) }}>sell</TradeBtn>
                                                )}
                                            </div>
                                        </Td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}

                {/* Portfolio tab */}
                {tab === 'portfolio' && (
                    holdings.length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)', marginTop: 20, textAlign: 'center' }}>
                            no holdings yet — buy something
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-secondary)', fontSize: 10, letterSpacing: '0.05em' }}>
                                    <Th>ticker</Th><Th align="right">shares</Th><Th align="right">avg cost</Th>
                                    <Th align="right">current</Th><Th align="right">value</Th><Th align="right">p&amp;l</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.map((h) => {
                                    const stock = stocks.find((s) => s.ticker === h.ticker)
                                    const currentPrice = stock?.current_price ?? 0
                                    const value = currentPrice * h.shares
                                    const cost = h.avg_buy_price * h.shares
                                    const pl = value - cost
                                    return (
                                        <tr key={h.ticker} style={{ borderTop: '1px solid var(--border)' }}>
                                            <Td><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{h.ticker}</span></Td>
                                            <Td align="right">{h.shares.toFixed(4)}</Td>
                                            <Td align="right">${h.avg_buy_price.toFixed(2)}</Td>
                                            <Td align="right">{priceFmt(currentPrice)}</Td>
                                            <Td align="right">${value.toFixed(2)}</Td>
                                            <Td align="right">
                                                <span style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--text-error)' }}>
                                                    {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
                                                </span>
                                            </Td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )
                )}

                {/* History tab */}
                {tab === 'history' && (
                    transactions.length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)', marginTop: 20, textAlign: 'center' }}>
                            no transactions yet
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-secondary)', fontSize: 10, letterSpacing: '0.05em' }}>
                                    <Th>date</Th><Th>type</Th><Th>ticker</Th>
                                    <Th align="right">shares</Th><Th align="right">price</Th><Th align="right">total</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr key={tx.id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <Td><span style={{ color: 'var(--text-secondary)' }}>{new Date(tx.created_at).toLocaleDateString()}</span></Td>
                                        <Td><span style={{ color: tx.type === 'buy' ? 'var(--accent)' : 'var(--text-error)' }}>{tx.type}</span></Td>
                                        <Td><span style={{ color: 'var(--accent)' }}>{tx.ticker}</span></Td>
                                        <Td align="right">{tx.shares.toFixed(4)}</Td>
                                        <Td align="right">${tx.price_at_time.toFixed(2)}</Td>
                                        <Td align="right">${tx.total.toFixed(2)}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>

            {/* ── Trade modal ── */}
            {tradeTarget && (
                <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                }}>
                    <div style={{
                        background: 'var(--bg-window)', border: '1px solid var(--border)',
                        borderRadius: 4, padding: 24, width: 280,
                    }}>
                        <div style={{ marginBottom: 16, fontSize: 13 }}>
                            <span style={{ color: tradeTarget.type === 'buy' ? 'var(--accent)' : 'var(--text-error)', fontWeight: 600 }}>
                                {tradeTarget.type.toUpperCase()}
                            </span>
                            {' '}<span style={{ color: 'var(--text-primary)' }}>{tradeTarget.ticker}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginLeft: 8 }}>
                                @ {priceFmt(stocks.find(s => s.ticker === tradeTarget.ticker)?.current_price ?? 0)}
                            </span>
                        </div>

                        {tradeTarget.type === 'buy' && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
                                available: ${cashBalance.toFixed(2)}
                            </div>
                        )}
                        {tradeTarget.type === 'sell' && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
                                owned: {holdings.find(h => h.ticker === tradeTarget.ticker)?.shares.toFixed(4) ?? 0} shares
                            </div>
                        )}

                        <input
                            type="number" value={tradeShares} autoFocus min="0" step="0.0001"
                            onChange={(e) => setTradeShares(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') executeTrade(); if (e.key === 'Escape') setTradeTarget(null) }}
                            placeholder="shares"
                            style={{
                                width: '100%', height: 32, background: 'var(--bg-terminal)',
                                border: '1px solid var(--accent)', borderRadius: 3,
                                color: 'var(--text-primary)', fontFamily: 'inherit',
                                fontSize: 12, padding: '0 10px', outline: 'none',
                            }}
                        />

                        {tradeShares && !isNaN(parseFloat(tradeShares)) && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                                total: ${(parseFloat(tradeShares) * (stocks.find(s => s.ticker === tradeTarget.ticker)?.current_price ?? 0)).toFixed(2)}
                            </div>
                        )}

                        {tradeError && (
                            <div style={{ color: 'var(--text-error)', fontSize: 11, marginTop: 8 }}>{tradeError}</div>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <button onClick={executeTrade} disabled={tradeLoading} style={{
                                flex: 1, height: 30, background: tradeTarget.type === 'buy' ? 'var(--accent)' : 'var(--text-error)',
                                border: 'none', borderRadius: 3, color: '#000', fontFamily: 'inherit',
                                fontSize: 12, fontWeight: 600, cursor: tradeLoading ? 'not-allowed' : 'pointer',
                            }}>
                                {tradeLoading ? '...' : 'confirm'}
                            </button>
                            <button onClick={() => { setTradeTarget(null); setTradeError(null) }} style={{
                                flex: 1, height: 30, background: 'transparent',
                                border: '1px solid var(--border)', borderRadius: 3,
                                color: 'var(--text-secondary)', fontFamily: 'inherit',
                                fontSize: 12, cursor: 'pointer',
                            }}>
                                cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Small reusable bits ────────────────────────────────────────────
function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
    return (
        <div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 13, color: accent ? 'var(--accent)' : warn ? 'var(--text-warn)' : 'var(--text-primary)', fontWeight: 600 }}>
                {value}
            </div>
        </div>
    )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
    return <th style={{ textAlign: align, padding: '6px 8px', fontWeight: 400 }}>{children}</th>
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
    return <td style={{ textAlign: align, padding: '8px 8px' }}>{children}</td>
}

function TradeBtn({ children, color, onClick }: { children: React.ReactNode; color: string; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            background: 'transparent', border: `1px solid ${color}`,
            borderRadius: 3, color, fontFamily: 'inherit',
            fontSize: 10, padding: '2px 8px', cursor: 'pointer',
            transition: 'background 0.15s',
        }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `${color}22`)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
            {children}
        </button>
    )
}