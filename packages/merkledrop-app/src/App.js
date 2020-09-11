import React, { useEffect, Suspense, useState, useMemo } from 'react';
import { GeistProvider, CssBaseline, Button, Card, Description, Link, Page, Radio, Row, Text, useMediaQuery } from '@geist-ui/react'
import * as Icon from '@geist-ui/react-icons'
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import pAny from 'p-any';
// import '@zeit-ui/themes/index.css'
import { combineProofs } from '@phala/merkledrop-lib';

import Web3 from "web3";
import Web3Modal from "web3modal";

import './App.css';
import { network, etherscanBase, loadMerkleAirdropContract } from './contracts';

const NETWORK = network;
const IPFS_BASES = [
  'https://10.via0.com/ipfs',
  'https://ipfs.io/ipfs',
  'https://ipfs.leiyun.org/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
];

const providerOptions = {};
const web3Modal = new Web3Modal({
  network: NETWORK, // optional
  cacheProvider: true, // optional
  providerOptions // required
});

function Loading() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Loading</h1>
      </header>
    </div>
  );
}

function etherscanAccountLink (account) {
  return `${etherscanBase}/address/${account}`;
}

function etherscanTxLink (tx) {
  return `${etherscanBase}/tx/${tx}`;
}

async function agumentedIpfsGet(hash) {
  const promises = IPFS_BASES.map(ipfsBase => axios.get(`${ipfsBase}/${hash}`));
  if (Promise.any) {
    return await Promise.any(promises);
  } else {
    console.warn('No Promise.any, fallback to p-any');
    return await pAny(promises);
  }
}

async function getAirdropPlan(uri) {
  const hash = uri.replace('/ipfs/', '');
  const resp = await agumentedIpfsGet(hash);
  return resp.data;
}

async function getAirdropLists(contract) {
  console.log('### 1');
  const numAirdrop = await contract.methods.airdropsCount().call();
  const uriPromises = []
  console.log('### 2');
  for (let i = 1; i <= numAirdrop; i++) {
    uriPromises.push(contract.methods.airdrops(i).call());
  }
  const airdrops = await Promise.all(uriPromises);
  console.log('airdrops', airdrops);
  const plans = await Promise.all(
    airdrops.map(a => getAirdropPlan(a.dataURI))
  );
  const plansWithStatus = plans.map((a, idx) => {
    return {...a, paused: airdrops[idx].paused};
  });

  console.log('plans', plansWithStatus);
  return plansWithStatus;
}

async function checkAwarded(contract, id, address) {
  return await contract.methods.awarded(id, address).call();
}

function App() {
  const { t } = useTranslation();
  const isXS = useMediaQuery('xs');
  const width100 = isXS ? {width: '100%'} : {};

  const [provider, setProvider] = useState(null);
  // const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [airdrop, setAirdrop] = useState(null);
  const [plans, setPlans] = useState([]);
  // notconnected, loading, ready
  const [state, setState] = useState('notconnected');  

  async function connectWeb3() {
    setState('notconnected');
    const provider = await web3Modal.connect();
    if (provider) {
      if (provider.on) {
        provider.on("accountsChanged", (acc) => {
          console.log(acc);
          // setAccounts(acc);
        });
        provider.on("chainChanged", (chainId) => {
          console.log(chainId);
        });
        provider.on("connect", (info) => { // : { chainId: number }
          console.log(info);
        });
        provider.on("disconnect", (error) => {  // : { code: number; message: string }
          console.log(error);
        });
      }
      setProvider(provider);
      const web3Instance = new Web3(provider);
      // setWeb3(web3Instance);
      const contract = loadMerkleAirdropContract(web3Instance);
      setAirdrop(contract);
      const acc = await web3Instance.eth.getAccounts();
      setAccounts(acc);
      setState('loading');
      try {
        const planList = await getAirdropLists(contract);
        setPlans(planList);
        setState('ready');
      } catch (err) {
        setState('error');
        setOtherError(`Error: ${err.message}. Please refresh or try with another network connection.`);
        throw err;
      }
    }
  }

  async function disconnectWeb3() {
    if(provider.close) {
      await provider.close();
    }
    web3Modal.clearCachedProvider();
    setProvider(null);
    // setWeb3(null);
    setAccounts([]);
    setAirdrop(null);
  }

  const [myAwards, setMyAwards] = useState([]);
  async function filterMyAwards() {
    if (accounts.length === 0) {
      console.log('Cannot select my awards')
      return;
    }
    const address = accounts[0];
    if (plans.length === 0) {
      console.log('No plan', plans);
      return;
    }

    const _myAwards = [];
    for (let plan of plans) {
      for (let award of plan.awards) {
        if (award.address.toLowerCase() === address.toLowerCase()) {
          _myAwards.push({
            ...award,
            id: plan.id,
            paused: plan.paused,
          })
        }
      }
    }

    const awarded = await Promise.all(_myAwards.map(a => checkAwarded(airdrop, a.id, a.address)));
    _myAwards.forEach((a, idx) => {
      a.awarded = awarded[idx];
    });

    setMyAwards(_myAwards);
    console.log({myAwards});
  }
  useEffect(() => {
    filterMyAwards();
  }, [accounts, plans])

  const canClaimAll = useMemo(() => {
    return myAwards.length > 0 && myAwards.reduce((a, x) => a || !x.awarded, false);
  }, [myAwards])

  const [showSending, setShowSending] = useState(false);
  const [showSentTips, setShowSentTips] = useState(false);
  const [selectedAirdrop, setSelectedAirdrop] = useState(-1);
  const [sentTx, setSentTx] = useState('');
  const [sentTxError, setSentTxError] = useState('');
  const [otherError, setOtherError] = useState('');

  function linkForEthAccount () {
    if (accounts.length === 0) {
      return '';
    }
    return etherscanAccountLink(accounts[0]);
  }

  async function claimSingle (id) {
    const [award] = myAwards.filter(a => a.id === id);
    const address = award.address;

    setSentTx('');
    setShowSending(true);
    setShowSentTips(false);
    setSentTxError('');
    try {
      const receipt = await airdrop.methods
        .award(id, address, award.amountWei.toString(), award.proof)
        .send({from: accounts[0]});
      setSentTx(receipt.transactionHash);
      setShowSentTips(true);
    } catch (err) {
      setSentTxError(err.message);
    }
    setShowSending(false);
  }

  async function claimAll () {
    const toClaim = myAwards.filter(a => !a.awarded && !a.paused);
    const address = accounts[0];
    const ids = toClaim.map(a => a.id);
    const amounts = toClaim.map(a => a.amountWei);
    const proofs = toClaim.map(a => a.proof);
    const { combinedProof, proofLengths } = combineProofs(proofs);

    setSentTx('');
    setShowSending(true);
    setShowSentTips(false);
    setSentTxError('');
    try {
      const receipt = await airdrop.methods
        .awardFromMany(ids, address, amounts, combinedProof, proofLengths)
        .send({from: accounts[0]});
      setSentTx(receipt.transactionHash);
      setShowSentTips(true);
    } catch (err) {
      setSentTxError(err.message);
    }
    setShowSending(false);
  }

  async function claim () {
    if (accounts.length === 0) {
      alert('No ETH account found.');
      return;
    }
    if (selectedAirdrop === 0) {
      await claimAll();
    } else {
      await claimSingle(selectedAirdrop);
    }
  }

  return (
    <div className="App">
      {NETWORK !== 'mainnet' && <Card type='warning'><h4>Now on {NETWORK}, not mainnet</h4></Card>}
      <Page>
        <Page.Header>
          <Text h3 style={{marginTop: '15px'}}>PHA {t('Award Claim')}</Text>
          <Text small className='links'>
            <Link href='https://phala.network/' color>Home</Link>
            <Link href='https://t.me/phalanetwork' color>Telegram</Link>
          </Text>
        </Page.Header>
        
        <Page.Content>

          <Row style={{marginBottom: '25px'}}>
            {!provider && <Button icon={<Icon.LogIn />} size='medium' onClick={connectWeb3} style={width100}>{t('Connect Wallet')}</Button>}
            {provider && <Button icon={<Icon.LogOut />} size='medium' onClick={disconnectWeb3} style={width100}>{t('Disconnect Wallet')}</Button>}
          </Row>

          {accounts.length >= 1 && (
            <>
              <Row style={{marginBottom: '20px'}}>
                <Description title={t('ETH Account')} content={accounts[0]} className='text-wrap-all' />
              </Row>

              {myAwards.length > 0
              ? (
                <>
                  <Row style={{marginBottom: '5px'}}>
                    <Text span size="0.75rem" style={{fontWeight: 500}} type="secondary">{t('YOUR AWARDS')}</Text>
                  </Row>
                  <Row style={{marginBottom: '20px'}}>
                    <Radio.Group value={selectedAirdrop} onChange={setSelectedAirdrop}>
                      {myAwards.map(award =>
                        <Radio value={award.id} key={award.id} disabled={award.awarded || award.paused}>
                          <span className='text-wrap-all'>
                            #{award.id} - {award.amount} PHA {
                              award.awarded ? `(${t('claimed')})` : award.paused ? `(${t('unavailable')})` : ''}
                          </span>
                        </Radio>
                      )}
                      <Radio value={0} disabled={!canClaimAll}>
                        <span className='text-wrap-all'>{t('Claim all')}</span>
                      </Radio>
                    </Radio.Group>
                  </Row>
                </>
              )
              : (
                <Row style={{marginBottom: '5px'}}>
                  <Text span size="0.75rem" style={{fontWeight: 500}} type="secondary">
                    {state === 'notconnected'
                      ? t('CONNECTING TO ETHEREUM...')
                      : state === 'loading'
                      ? t('LOADING AWARD LIST...')
                      : state === 'ready'
                      ? t('NO AWARD FOUND')
                      : t('CANNOT LOAD AWARD LIST')
                    }
                  </Text>
                </Row>
              )}

              <section style={{marginTop: '20px', marginBottom: '15px'}}>
                <Row>
                  <Button
                    onClick={claim} size='medium' style={width100}
                    loading={showSending} disabled={selectedAirdrop < 0}>
                      {t('Claim')}
                  </Button>
                </Row>
              </section>

              {showSentTips && (
                <Card>
                  <Description title={t('Transaction ID')} content={sentTx
                      ? (<Link href={etherscanTxLink(sentTx)} target='_blank' icon>{sentTx}</Link>)
                      : '(unknown)'
                    } className='text-wrap-all' />
                  <ul>
                    <li>{t('You will receive the token once the transaction gets confirmed')}</li>
                    <li>{t('Please check your')} <Link href={linkForEthAccount()} target='_blank' icon color>{t('Account Page at Etherscan')}</Link></li>
                  </ul>
                </Card>
              )}

              {sentTxError && (
                <Card type='error'>
                  <h4>{t('Failed to send transaction')}</h4>
                  <p>{sentTxError}</p>
                </Card>
              )}

              {otherError && (
                <Card type='error'>
                  <h4>{t('Error occurred')}</h4>
                  <p>{otherError}</p>
                </Card>
              )}
            </>
          )}
          
        </Page.Content>
      </Page>
    </div>
  );
}

const myTheme = {
  // "type": "dark",
  "palette": {
    "accents_1": "#111",
    "accents_2": "#333",
    "accents_3": "#444",
    "accents_4": "#666",
    "accents_5": "#888",
    "accents_6": "#999",
    "accents_7": "#eaeaea",
    "accents_8": "#fafafa",
    "background": "#000",
    "foreground": "#fff",
    "selection": "#D1FF52",
    "secondary": "#888",
    "success": "#D1FF52",
    "successLight": "#D1FF52",
    "successDark": "#D1FF52",
    "code": "#79ffe1",
    "border": "#333",
    "link": "#D1FF52"
  },
  "expressiveness": {
    "dropdownBoxShadow": "0 0 0 1px #333",
    "shadowSmall": "0 0 0 1px #333",
    "shadowMedium": "0 0 0 1px #333",
    "shadowLarge": "0 0 0 1px #333",
    "portalOpacity": 0.75
  }
};

function DecorateApp () {
  return (
    <GeistProvider theme={myTheme}>
      <CssBaseline />
      <Suspense fallback={<Loading />}>
        <App />
      </Suspense>
    </GeistProvider>
  );
}

export default DecorateApp;
