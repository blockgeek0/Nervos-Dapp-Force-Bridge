/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';
import { CONFIG } from '../config';
import * as CompiledContractArtifact from '../../build/contracts/ERC20.json';
import { ArtVoteWrapper } from '../lib/contracts/ArtVoteWrapper';
import { ARTVOTE_CONTRACT_ADDRESS, CKETH_ADDRESS, formatNumber, SUDT_ADDRESS } from './utils';

const ARTS = [
    { id: 1, url: 'https://oggusto.com/UserFiles/Image/images/Temmuz2019/van-gogh-6.jpg' },
    {
        id: 2,
        url:
            'https://www.tarihiolaylar.com/dvsthumb.php?src=/img/galeri/galeri_noon-rest-from-work-after-millet-jpg_688813015_1429193707.jpg&w=740'
    },
    {
        id: 3,
        url:
            'https://www.sanatperver.com/content/images/wordpress/2020/11/arlesteki-yatak-odasi-van-gogh-scaled.jpg'
    }
];

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };
        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

interface Art {
    artId: number;
    votes: number;
}
export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<ArtVoteWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const toastId = React.useRef(null);
    const [userDepositAddress, setUserDepositAddress] = useState<string>();
    const [sudtBalance, setSudtBalance] = useState<number>();
    const [ckethBalance, setCkethBalance] = useState<number>();
    const [arts, setArts] = useState<Art[]>();
    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (polyjuiceAddress && accounts && web3) {
            fetchCkethBalance();
            fetchSudtBalance();
        }
    }, [polyjuiceAddress, accounts, web3]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    useEffect(() => {
        if (contract && web3 && accounts) {
            getAllVotes();
        }
    }, [contract, web3, accounts]);

    async function getLayer2DepositAddress() {
        const addressTranslator = new AddressTranslator();

        const userAddress = await addressTranslator.getLayer2DepositAddress(web3, accounts?.[0]);

        setUserDepositAddress(userAddress.addressString);
    }

    async function fetchCkethBalance() {
        const _contractCketh = new web3.eth.Contract(
            CompiledContractArtifact.abi as any,
            CKETH_ADDRESS
        );

        const _balanceCketh = Number(
            await _contractCketh.methods.balanceOf(polyjuiceAddress).call({
                from: accounts?.[0]
            })
        );

        setCkethBalance(_balanceCketh);
    }

    async function fetchSudtBalance() {
        const _contractSudt = new web3.eth.Contract(
            CompiledContractArtifact.abi as any,
            SUDT_ADDRESS
        );

        const _balanceSudt = Number(
            await _contractSudt.methods.balanceOf(polyjuiceAddress).call({
                from: accounts?.[0]
            })
        );

        setSudtBalance(_balanceSudt);
    }

    async function getNewBalance() {
        setCkethBalance(undefined);
        setSudtBalance(undefined);
        setL2Balance(undefined);
        const _l2Balance = BigInt(await web3.eth.getBalance(accounts?.[0]));
        setL2Balance(_l2Balance);
        await fetchCkethBalance();
        await fetchSudtBalance();
    }

    async function getAllVotes() {
        const artlist = [];
        for (let i = 1; i <= 3; i++) {
            const art = await getArt(i);
            artlist.push(art);
        }
        setArts(artlist);
        toast('Updated all the art votes 🎨', { type: 'success' });
    }
    const account = accounts?.[0];

    async function getArt(id: number) {
        const art = await contract.getArt(id, account);

        return { artId: Number(art.artId), votes: Number(art.votes) };
    }

    async function voteArt(e: any) {
        try {
            setTransactionInProgress(true);
            await contract.voteArt(Number(e.target.id), account);
            toast('Successfully voted', { type: 'success' });
            setArts(undefined);
            await getAllVotes();
        } catch (error) {
            console.error(error);
            toast('There was an error sending your transaction. Please check developer console.');
        } finally {
            setTransactionInProgress(false);
        }
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });
            const _contract = new ArtVoteWrapper(_web3);
            setContract(_contract);
            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div className="app">
            <h1> 🎨 Vote Van Gogh</h1>
            Your ETH address: <b>{accounts?.[0]}</b>
            <br />
            <br />
            Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
            <br />
            Deployed contract address: <b>{ARTVOTE_CONTRACT_ADDRESS}</b> <br />
            <br />
            <br />
            Deployed SUDT-ERC20 Proxy contract address:{' '}
            <b>0x1900D8ecFC133DE9197d9C2305B22f56c6559bDc</b>
            <br />
            <br />
            <br />
            <br />
            Nervos Layer 2 balance:{' '}
            <b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b>
            <br />
            <br />
            ckETH:
            <b>
                {ckethBalance ? formatNumber(ckethBalance.toString(), 18) : <LoadingIndicator />}{' '}
                ckETH
            </b>
            <br />
            <br />
            <b>{sudtBalance ? (sudtBalance as number) : <LoadingIndicator />} SUDT</b>
            <br />
            <br />
            <button onClick={getNewBalance}>Refresh Balance</button>
            <br />
            <br />
            {!userDepositAddress ? (
                <button
                    style={{ backgroundColor: 'white', color: 'black' }}
                    onClick={getLayer2DepositAddress}
                >
                    📚 Get Deposit Address
                </button>
            ) : (
                <div
                    className="l2-address"
                    style={{ overflowWrap: 'break-word', wordWrap: 'break-word', width: '50vw' }}
                >
                    <b>{userDepositAddress}</b>
                    <br />
                    <br />
                    👉{' '}
                    <small style={{ color: 'white' }}>
                        Copy Layer2 Deposit Address and go to force bridge
                    </small>
                    <br />
                    <br />
                    <button
                        style={{ backgroundColor: 'rgb(126, 0, 131)', color: 'white' }}
                        onClick={() => {
                            window.open(
                                'https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos?xchain-asset=0x0000000000000000000000000000000000000000',
                                '_blank' // <- This is what makes it open in a new window.
                            );
                        }}
                    >
                        💰 Deposit ETH
                    </button>
                </div>
            )}
            <hr />
            {ARTS.map(art => (
                <div key={art.id} className="art">
                    {' '}
                    <div>
                        {' '}
                        Total Vote:{' '}
                        <b>
                            {arts && arts.length > 1 ? (
                                arts?.[art.id - 1].votes
                            ) : (
                                <LoadingIndicator />
                            )}
                        </b>{' '}
                    </div>
                    <img alt="art" src={art.url} />
                    <br />
                    <button id={art.id.toString()} onClick={voteArt}>
                        🎨 Vote
                    </button>
                </div>
            ))}
            <ToastContainer />
        </div>
    );
}
