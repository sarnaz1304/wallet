import ERC20 from './ERC20'
import networks from 'consts/networks'

// transfer signature hash
const sigHash = '0xa9059cbb'
const humanizer = ERC20[sigHash]

const txn = {
  "to": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  "value": "0",
  "data": "0xa9059cbb00000000000000000000000017e7ab421ddd3b7fd39c76d084ee9a1e97f436910000000000000000000000000000000000000000000000000000000000002710",
  "from": "0xe704F4Deb601854A8d49FaebCE419653EB5de2A2"
}

const network = networks.find(({ id }) => id === 'polygon')

test('transfer is humanized correctly (not extended)', async () => {
  const opts = { extended: false }
  const actions = humanizer(txn, network, opts)

  expect(actions).toEqual(
    [
      'Send 0.01 USDT to 0x17e7ab421ddD3b7fD39C76D084Ee9A1E97F43691'
  ])
})

test('transfer is humanized correctly (extended)', async () => {
  const opts = { extended: true }
  const actions = humanizer(txn, network, opts)

  expect(actions).toEqual(
    [
      [
        "Send",
        {
          "address": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
          "amount": "0.01",
          "decimals": 6,
          "symbol": "USDT",
          "type": "token",
        },
        "to",
        {
          "address": "0x17e7ab421ddD3b7fD39C76D084Ee9A1E97F43691",
          "name": "0x17e7ab421ddD3b7fD39C76D084Ee9A1E97F43691",
          "type": "address",
        },
      ]
  ])
})