import { useEffect, useState } from "react"
import useDynamicModal from "hooks/useDynamicModals";
import { Button, ToolTip } from "components/common";
import { WalletTokenModal } from "components/Modals";
import useClaimableWalletToken from "./useClaimableWalletToken";

const WalletTokenButton = ({ rewardsData, account, network, hidePrivateValue, addRequest }) => {
    const claimableWalletToken = useClaimableWalletToken({ account, network, addRequest })
    const { claimableNow, currentClaimStatus, currentClaimStatus } = claimableWalletToken
    const claimableTokensTotal = currentClaimStatus ?
        (claimableNow + (currentClaimStatus.mintableVesting || 0)).toFixed(3) : '...'
    
    const [rewards, setRewards] = useState({})
    const { isLoading, data, errMsg } = rewardsData
    
    const showWalletTokenModal = useDynamicModal(WalletTokenModal, { claimableWalletToken }, { rewards })

    useEffect(() => {
        if (errMsg || !data || !data.success) return

        const { rewards, multipliers } = data
        if (!rewards.length) return

        const rewardsDetails = Object.fromEntries(rewards.map(({ _id, rewards }) => [_id, rewards[account.id] || 0]))
        rewardsDetails.multipliers = multipliers
        rewardsDetails.walletTokenAPY = data.walletTokenAPY
        rewardsDetails.adxTokenAPY = data.adxTokenAPY
        rewardsDetails.walletUsdPrice = data.usdPrice
        setRewards(rewardsDetails)
    }, [data, errMsg, account])

    return (
        !isLoading && (errMsg || !data || currentClaimStatus.error) ?
            <ToolTip label="WALLET rewards are not available without a connection to the relayer">
                <Button small border disabled onClick={showWalletTokenModal}>Unavailable</Button>
            </ToolTip>
            :
            <Button small border disabled={isLoading} onClick={showWalletTokenModal}>{ hidePrivateValue(claimableTokensTotal) } WALLET</Button>
    )
}

export default WalletTokenButton
