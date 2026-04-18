import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const STOCKS = [
  { ticker: 'SPY', name: 'S&P 500 ETF', current_price: 536.00, prev_close: 534.20 },
  { ticker: 'AAPL', name: 'Apple', current_price: 189.50, prev_close: 187.90 },
  { ticker: 'GOOGL', name: 'Google', current_price: 175.30, prev_close: 174.10 },
  { ticker: 'AMZN', name: 'Amazon', current_price: 198.70, prev_close: 196.40 },
  { ticker: 'TSLA', name: 'Tesla', current_price: 177.80, prev_close: 172.50 },
  { ticker: 'NVDA', name: 'Nvidia', current_price: 875.40, prev_close: 860.20 },
  { ticker: 'UBER', name: 'Uber', current_price: 76.30, prev_close: 75.80 },
  { ticker: 'GME', name: 'GameStop', current_price: 14.20, prev_close: 13.90 },
]

const updates = STOCKS.map((s) => ({
  ...s,
  updated_at: new Date().toISOString(),
}))

const { error } = await supabase
  .from('stocks')
  .upsert(updates, { onConflict: 'ticker' })

if (error) { console.error(error); process.exit(1) }

console.table(updates)
console.log('Done.')