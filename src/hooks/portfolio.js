import { useCallback, useEffect, useState } from 'react';

import { ZAPPER_API_KEY } from '../config';
import { fetchGet } from '../lib/fetch';
import { ZAPPER_API_ENDPOINT } from '../config'
import suportedProtocols from '../consts/supportedProtocols';
import { useToasts } from '../hooks/toasts'

const getBalances = (apiKey, network, protocol, address) => fetchGet(`${ZAPPER_API_ENDPOINT}/protocols/${protocol}/balances?addresses[]=${address}&network=${network}&api_key=${apiKey}&newBalances=true`)

let tokensByNetworks = []
let otherProtocolsByNetworks = []
let lastOtherProcolsRefresh = null

export default function usePortfolio({ currentNetwork, account }) {
    const { addToast } = useToasts()
    const [balanceByNetworks, setBalanceByNetworks] = useState([]);
    const [isBalanceLoading, setBalanceLoading] = useState(true);
    const [areAssetsLoading, setAssetsLoading] = useState(true);
    const [balance, setBalance] = useState({
        total: {
            full: 0,
            truncated: 0,
            decimals: '00'
        },
        tokens: []
    });
    const [otherBalances, setOtherBalances] = useState([]);
    const [assets, setAssets] = useState([]);
    const [collectables, setCollectables] = useState([]);

    const updateStates = useCallback((currentNetwork) => {
        const balance = balanceByNetworks.find(({ network }) => network === currentNetwork)
        if (balance) {
            setBalance(balance)
            setOtherBalances(balanceByNetworks.filter(({ network }) => network !== currentNetwork))
        }

        const tokens = tokensByNetworks.find(({ network }) => network === currentNetwork)
        const otherProtocols = otherProtocolsByNetworks.find(({ network }) => network === currentNetwork)
        if (tokens && otherProtocols) {
            setAssets([
                ...tokens.products,
                ...otherProtocols.protocols.filter(({ label }) => label !== 'NFTs')
            ])
            setCollectables(otherProtocols.protocols.find(({ label }) => label === 'NFTs')?.assets || [])
        }
    }, [balanceByNetworks])

    const fetchBalances = useCallback(async (account) => {
        try {
            let failedRequests = 0
            const requestsCount = suportedProtocols.length

            tokensByNetworks = (await Promise.all(suportedProtocols.map(async ({ network }) => {
                try {
                    const balance = await getBalances(ZAPPER_API_KEY, network, 'tokens', account)
                    if (!balance) return null

                    const { meta, products } = Object.values(balance)[0]
                    return {
                        network,
                        meta,
                        products
                    }
                } catch(_) {
                    failedRequests++
                }
            }))).filter(data => data)

            if (failedRequests >= requestsCount) throw new Error('Failed to fetch Tokens from Zapper API')

            setBalanceByNetworks(tokensByNetworks.map(({ network, meta, products }) => {
                const balanceUSD = meta.find(({ label }) => label === 'Total').value + meta.find(({ label }) => label === 'Debt').value
                const [truncated, decimals] = Number(balanceUSD.toString()).toFixed(2).split('.')
                return {
                    network,
                    total: {
                        full: balanceUSD,
                        truncated: Number(truncated).toLocaleString('en-US'),
                        decimals
                    },
                    tokens: products.map(({ assets }) => assets.map(({ tokens }) => tokens)).flat(2)
                }
            }))

            return true
        } catch (error) {
            addToast(error.message, { error: true })
            return false
        }
    }, [addToast])

    const fetchOtherProtocols = useCallback(async (account) => {
        try {
            let failedRequests = 0
            const requestsCount = suportedProtocols.reduce((acc, curr) => curr.protocols.length + acc, 0)

            otherProtocolsByNetworks = (await Promise.all(suportedProtocols.map(async ({ network, protocols }) => {
                const all = (await Promise.all(protocols.map(async protocol => {
                    try {
                        const balance = await getBalances(ZAPPER_API_KEY, network, protocol, account)
                        return balance ? Object.values(balance)[0] : null
                    } catch(_) {
                        failedRequests++
                    }
                }))).filter(data => data).flat()

                return all.length ? {
                    network,
                    protocols: all.map(({ products }) => products).flat(2)
                } : null
            }))).filter(data => data)
            
            lastOtherProcolsRefresh = Date.now()

            if (failedRequests >= requestsCount) throw new Error('Failed to fetch other Protocols from Zapper API')
            return true
        } catch (error) {
            addToast(error.message, { error: true })
            return false
        }
    }, [addToast])

    const refreshBalanceIfFocused = useCallback(() => {
        if (document.hasFocus() && !isBalanceLoading) fetchBalances(account)
    }, [isBalanceLoading, account, fetchBalances])

    const requestOtherProtocolsRefresh = async () => {
        if ((Date.now() - lastOtherProcolsRefresh) > 30000 && !areAssetsLoading) await fetchOtherProtocols(account)
    }

    // Fetch balances and protocols on account change
    useEffect(() => {
        tokensByNetworks = []
        otherProtocolsByNetworks = []

        async function loadBalance() {
            setBalanceLoading(true)
            if (await fetchBalances(account)) setBalanceLoading(false)
        }

        async function loadProtocols() {
            setAssetsLoading(true)
            if (await fetchOtherProtocols(account)) setAssetsLoading(false)
        }

        loadBalance()
        loadProtocols()
    }, [account, fetchBalances, fetchOtherProtocols])

    // Update states on network change
    useEffect(() => updateStates(currentNetwork), [updateStates, balanceByNetworks, areAssetsLoading, currentNetwork])

    // Refresh balance periodically
    useEffect(() => {
        const refreshInterval = setInterval(refreshBalanceIfFocused, 20000)
        return () => clearInterval(refreshInterval)
    }, [refreshBalanceIfFocused])

    // Refresh balance when window is focused
    useEffect(() => {
        window.addEventListener('focus', refreshBalanceIfFocused)
        return () => window.removeEventListener('focus', refreshBalanceIfFocused)
    }, [refreshBalanceIfFocused])

    return {
        isBalanceLoading,
        areAssetsLoading,
        balance,
        otherBalances,
        assets,
        collectables,
        requestOtherProtocolsRefresh
        //updatePortfolio//TODO find a non dirty way to be able to reply to getSafeBalances from the dapps, after the first refresh
    }
}
