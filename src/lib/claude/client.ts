import Groq from 'groq-sdk'

let _client: Groq | undefined

const groq = new Proxy({} as Groq, {
  get(_target, prop: string | symbol) {
    if (!_client) {
      _client = new Groq({ apiKey: process.env.GROQ_API_KEY })
    }
    const value = (_client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(_client) : value
  },
})

export default groq
