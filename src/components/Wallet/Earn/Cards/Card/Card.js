import './Card.scss'

import { Select, Segments, NumberInput, Button, Loading } from '../../../../common'
import { useEffect, useState } from 'react'
import { BsArrowDownSquare, BsArrowUpSquare } from 'react-icons/bs'
import { ethers } from 'ethers'

const segments = [{ value: 'Deposit' }, { value: 'Withdraw' }]

const Card = ({ loading, unavailable, tokensItems, icon, details, onTokenSelect, onValidate }) => {    
    const [segment, setSegment] = useState(segments[0].value)
    const [tokens, setTokens] = useState([])
    const [token, setToken] = useState()
    const [amount, setAmount] = useState(0)
    const [disabled, setDisabled] = useState(true)

    const currentToken = tokens.find(({ value }) => value === token)

    const getMaxAmount = () => {
        if (!currentToken) return 0;
        const { balanceRaw, decimals } = currentToken
        return ethers.utils.formatUnits(balanceRaw, decimals)
    }

    const setMaxAmount = () => setAmount(getMaxAmount(amount))

    useEffect(() => {
        if (segment === segments[0].value) setTokens(tokensItems.filter(({ type }) => type === 'deposit'))
        if (segment === segments[1].value) setTokens(tokensItems.filter(({ type }) => type === 'withdraw'))
    }, [segment, tokensItems])

    useEffect(() => setAmount(0), [segment])

    useEffect(() => {
        onTokenSelect(token)
        setDisabled(!token || !tokens.length)
    }, [token, onTokenSelect, tokens.length])

    return (
        <div className="card">
            <div className="title">
                <img src={icon} alt="Icon" />
            </div>
            {
                loading ?
                    <Loading/>
                    :
                    unavailable ?
                        <div className="unavailable">
                            Unavailable on this Network
                        </div>
                        :
                        <div className="content">
                            <Select
                                searchable
                                disabled={disabled}
                                label="Choose Token"
                                defaultValue={token}
                                items={tokens}
                                onChange={(value) => setToken(value)}
                            />
                            {
                                !disabled ? 
                                    <ul className="details">
                                        {
                                            details.map(([type, value]) => (
                                                <li key={type}><b>{type}</b> {value}</li>
                                            ))
                                        }
                                    </ul>
                                    :
                                    <div className="details-placeholder">
                                        <div/>
                                        <div/>
                                        <div/>
                                    </div>
                            }
                            <Segments small defaultValue={segment} segments={segments} onChange={(value) => setSegment(value)}></Segments>
                            <NumberInput
                                disabled={!currentToken?.balance}
                                min="0"
                                max={currentToken?.balance}
                                value={amount}
                                label={`Available Amount: ${!disabled ? `${getMaxAmount()} ${currentToken?.symbol}` : '0'}`}
                                onInput={(value) => setAmount(value)}
                                button="MAX"
                                onButtonClick={setMaxAmount}
                            />
                            <Button 
                                disabled={disabled || amount <= 0 || amount > currentToken?.balance}
                                icon={segment === segments[0].value ? <BsArrowDownSquare/> : <BsArrowUpSquare/>}
                                onClick={() => onValidate(segment, token, amount)}>
                                    { segment }
                            </Button>
                        </div>
            }
        </div>
    )
}

export default Card