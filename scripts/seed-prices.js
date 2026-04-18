import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FINNHUB_KEY = process.env.FINNHUB_API_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TICKERS = {
  SPY:  'S&P 500 ETF',
  AAPL: 'Apple',
  GOOGL:'Google',
  AMZN: 'Amazon',
  TSLA: 'Tesla',
  NVDA: 'Nvidia',
  UBER: 'Uber',
  GME:  'GameStop',
}

async function getQuote(ticker) {
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`
  )
  const data = await res.json()
  return {
    ticker,
    name: TICKERS[ticker],
    current_price: data.c ?? 0,
    prev_close: data.pc ?? 0,
    updated_at: new Date().toISOString(),
  }
}

const updates = await Promise.all(Object.keys(TICKERS).map(getQuote))

const { error } = await supabase
  .from('stocks')
  .upsert(updates, { onConflict: 'ticker' })

if (error) { console.error('Supabase error:', error); process.exit(1) }

console.table(updates)
console.log('Done.')