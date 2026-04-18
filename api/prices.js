const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`
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

module.exports = async function handler(req, res) {
  if (!process.env.FINNHUB_API_KEY) {
    return res.status(500).json({ error: 'missing finnhub api key' })
  }

  const updates = await Promise.all(TICKERS.map(getQuote))

  const { error } = await supabase
    .from('stocks')
    .upsert(updates, { onConflict: 'ticker' })

  if (error) return res.status(500).json({ error: error.message })

  res.json({ ok: true, updated: updates.length, prices: updates })
}