import { CircularProgress } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import Select from "react-select";
import { createTxIBCMsgTransfer } from "@tharsis/transactions";
import { cosmos } from "@tharsis/proto/dist/proto/cosmos/tx/v1beta1/tx";
import BigNumber from "bignumber.js";
import Long from "long";
import { useEffect, useState, useContext, Component } from "react";
import {
  sleep,
  suggestCrescentToKeplr,
  suggestChihuahuaToKeplr,
  suggestInjectiveToKeplr,
  suggestKujiraToKeplr,
  suggestTerraToKeplr,
  faucetAddress,
  viewingKeyErrorString,
} from "shared/utils/commons";
import {
  fromBase64,
  SecretNetworkClient,
  toBase64,
  TxResponse,
  toUtf8,
} from "secretjs";
import { chains, Token, tokens, snips } from "shared/utils/config";
import { TxRaw } from "secretjs/dist/protobuf/cosmos/tx/v1beta1/tx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faRightLeft,
  faKey,
  faXmarkCircle,
  faCheckCircle,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { IbcContext } from "ibc/Ibc";
import {
  getKeplrViewingKey,
  SecretjsContext,
  setKeplrViewingKey,
} from "shared/context/SecretjsContext";
import CopyToClipboard from "react-copy-to-clipboard";

function Deposit() {
  const { feeGrantStatus, setFeeGrantStatus, requestFeeGrant } =
    useContext(SecretjsContext);

  const { setIsWrapModalOpen, setSelectedTokenName, ibcMode, toggleIbcMode } =
    useContext(IbcContext);

  const [sourceAddress, setSourceAddress] = useState<string>("");
  const [availableBalance, setAvailableBalance] = useState<string>("");
  const [loadingTx, setLoading] = useState<boolean>(false);
  const [sourceChainSecretjs, setSourceChainSecretjs] =
    useState<SecretNetworkClient | null>(null);
  const [fetchBalanceInterval, setFetchBalanceInterval] = useState<any>(null);
  const [amountToTransfer, setAmountToTransfer] = useState<string>("");
  const { secretjs, secretAddress } = useContext(SecretjsContext);
  const queryParams = new URLSearchParams(window.location.search);

  const chainByQueryParam = queryParams.get("chain"); // "scrt", "akash", etc.
  const [selectedToken, setSelectedToken] = useState<Token>(
    tokens.filter((token) => token.name === "SCRT")[0]
  );
  const sourcePreselection = selectedToken.deposits.filter(
    (deposit) =>
      deposit.chain_name.toLowerCase() === chainByQueryParam?.toLowerCase()
  )[0]
    ? chainByQueryParam?.toLowerCase()
    : "osmosis";
  const [selectedSource, setSelectedSource] = useState<any>(
    selectedToken.deposits.filter(
      (deposit) => deposit.chain_name.toLowerCase() === sourcePreselection
    )[0]
  );

  useEffect(() => {
    setSelectedTokenName(selectedToken.name);
  }, [selectedToken]);

  function handleInputChange(e: any) {
    setAmountToTransfer(e.target.value);
  }

  const message =
    ibcMode === "deposit"
      ? `Deposit your SCRT via IBC transfer from ${selectedSource.chain_name} to Secret Network`
      : `Withdraw your SCRT via IBC transfer from Secret Network to ${selectedSource.chain_name}`;

  class ChainSelect extends Component {
    render() {
      return (
        <>
          <Select
            options={
              tokens.filter((token) => token.name === "TERP")[0].deposits
            }
            value={selectedSource}
            onChange={setSelectedSource}
            isSearchable={false}
            isDisabled={!secretjs || !secretAddress}
            formatOptionLabel={(option) => (
              <div className="flex items-center">
                <img
                  src={`https://raw.githubusercontent.com/terpnetwork/chain-registry/master/terpnetwork/images/terp.png`}
                  className="w-6 h-6 mr-2 rounded-full"
                />
                <span className="font-semibold text-sm">
                  {option.chain_name}
                </span>
              </div>
            )}
            className="react-select-container"
            classNamePrefix="react-select"
          />
        </>
      );
    }
  }

  // handles [25% | 50% | 75% | Max] Button-Group
  function setAmountByPercentage(percentage: number) {
    if (availableBalance) {
      let availableAmount =
        Number(availableBalance) * 10 ** -selectedToken.decimals;
      let potentialInput = new BigNumber(
        availableAmount * (percentage * 0.01)
      ).toFormat();
      if (Number(potentialInput) == 0) {
        setAmountToTransfer("");
      } else {
        setAmountToTransfer(potentialInput);
      }
    }
  }

  const updateCoinBalance = async () => {
    if (secretjs && secretAddress) {
      if (selectedToken.is_snip20) {
        const key = await getKeplrViewingKey(selectedToken.address);
        if (!key) {
          setAvailableBalance(viewingKeyErrorString);
          return;
        }

        try {
          const result: {
            viewing_key_error: any;
            balance: {
              amount: string;
            };
          } = await secretjs.query.compute.queryContract({
            contract_address: selectedToken.address,
            code_hash: selectedToken.code_hash,
            query: {
              balance: { address: secretAddress, key },
            },
          });

          if (result.viewing_key_error) {
            setAvailableBalance(viewingKeyErrorString);
            return;
          }

          setAvailableBalance(result.balance.amount);
        } catch (e) {
          console.error(`Error getting balance for s${selectedToken.name}`, e);

          setAvailableBalance(viewingKeyErrorString);
        }
      } else {
        try {
          const {
            balance: { amount },
          } = await secretjs.query.bank.balance({
            address: secretAddress,
            denom: selectedToken.withdrawals[0]?.from_denom,
          });
          setAvailableBalance(amount);
        } catch (e) {
          console.error(
            `Error while trying to query ${selectedToken.name}:`,
            e
          );
        }
      }
    }
  };

  const targetChain = chains["Terp Network"];

  const fetchSourceBalance = async (newAddress: String | null) => {
    if (secretjs && secretAddress) {
      if (ibcMode === "deposit") {
        const url = `${
          chains[selectedSource.chain_name].lcd
        }/cosmos/bank/v1beta1/balances/${
          newAddress ? newAddress : sourceAddress
        }`;
        try {
          const {
            balances,
          }: {
            balances: Array<{ denom: string; amount: string }>;
          } = await (await fetch(url)).json();

          const balance =
            balances.find(
              (c) =>
                c.denom ===
                selectedToken.deposits.filter(
                  (deposit) => deposit.chain_name === selectedSource.chain_name
                )[0].from_denom
            )?.amount || "0";
          setAvailableBalance(balance);
        } catch (e) {
          console.error(`Error while trying to query ${url}:`, e);
          setAvailableBalance("Error");
        }
      } else if (ibcMode === "withdrawal") {
        updateCoinBalance();
      }
    }
  };

  useEffect(() => {
    setAvailableBalance("");
    if (!(secretjs && secretAddress)) {
      return;
    }
    if (!sourceAddress) {
      return;
    }
    if (fetchBalanceInterval) {
      clearInterval(fetchBalanceInterval);
    }

    if (ibcMode === "withdrawal") {
      fetchSourceBalance(null);
    }

    const interval = setInterval(() => fetchSourceBalance(null), 10_000);
    setFetchBalanceInterval(interval);

    return () => clearInterval(interval);
  }, [
    selectedSource,
    selectedToken,
    sourceAddress,
    ibcMode,
    secretAddress,
    secretjs,
  ]);

  useEffect(() => {
    if (!(secretjs && secretAddress)) {
      return;
    }
    const possibleSnips = snips.filter(
      (token) =>
        token.deposits.find(
          (token) => token.chain_name == selectedSource.chain_name
        )!
    );
    const possibleTokens = tokens.filter(
      (token) =>
        token.deposits.find(
          (token) => token.chain_name == selectedSource.chain_name
        )!
    );
    const supportedTokens = possibleTokens.concat(possibleSnips);

    setSupportedTokens(supportedTokens);

    if (!supportedTokens.includes(selectedToken)) {
      setSelectedToken(supportedTokens[0]);
    }
    (async () => {
      while (!window.keplr || !window.getOfflineSignerOnlyAmino) {
        await sleep(100);
      }
      if (selectedSource.chain_name === "Terra") {
        await suggestTerraToKeplr(window.keplr);
      } else if (selectedSource.chain_name === "Injective") {
        await suggestInjectiveToKeplr(window.keplr);
      } else if (selectedSource.chain_name === "Crescent") {
        await suggestCrescentToKeplr(window.keplr);
      } else if (selectedSource.chain_name === "Kujira") {
        await suggestKujiraToKeplr(window.keplr);
      } else if (selectedSource.chain_name === "Chihuahua") {
        await suggestChihuahuaToKeplr(window.keplr);
      }

      // Initialize cosmjs on the source chain, because it has sendIbcTokens()
      const { chain_id, lcd, bech32_prefix } =
        chains[selectedSource.chain_name];
      await window.keplr.enable(chain_id);

      window.keplr.defaultOptions = {
        sign: {
          preferNoSetFee: false,
          disableBalanceCheck: true,
        },
      };

      const sourceOfflineSigner = window.getOfflineSignerOnlyAmino(chain_id);
      const depositFromAccounts = await sourceOfflineSigner.getAccounts();
      setSourceAddress(depositFromAccounts[0].address);

      const secretjs = new SecretNetworkClient({
        url: lcd,
        chainId: chain_id,
        wallet: sourceOfflineSigner,
        walletAddress: depositFromAccounts[0].address,
      });

      setSourceChainSecretjs(secretjs);

      fetchSourceBalance(depositFromAccounts[0].address);
    })();
  }, [
    selectedSource,
    selectedToken,
    sourceAddress,
    ibcMode,
    secretAddress,
    secretjs,
  ]);

  const [isCopied, setIsCopied] = useState<boolean>(false);

  const [supportedTokens, setSupportedTokens] = useState<Token[]>([]);

  function uiFocusInput() {
    document.getElementById("inputWrapper")?.classList.add("animate__animated");
    document
      .getElementById("inputWrapper")
      ?.classList.add("animate__headShake");
    setTimeout(() => {
      document
        .getElementById("inputWrapper")
        ?.classList.remove("animate__animated");
      document
        .getElementById("inputWrapper")
        ?.classList.remove("animate__headShake");
    }, 1000);
  }

  function SubmitButton() {
    async function submit() {
      // TODO: add validation to form, including message
      // if (!isValidAmount || amount === "") {
      //   uiFocusInput();
      //   return;
      // }

      if (ibcMode === "deposit") {
        if (!sourceChainSecretjs) {
          console.error("No cosmjs");
          return;
        }

        if (!amountToTransfer) {
          console.error("Empty deposit");
          return;
        }

        const normalizedAmount = (amountToTransfer as string).replace(/,/g, "");

        if (!(Number(normalizedAmount) > 0)) {
          console.error(`${normalizedAmount} not bigger than 0`);
          return;
        }

        setLoading(true);

        const amount = new BigNumber(normalizedAmount)
          .multipliedBy(`1e${selectedToken.decimals}`)
          .toFixed(0, BigNumber.ROUND_DOWN);

        let {
          deposit_channel_id,
          deposit_gas,
          deposit_gas_denom,
          lcd: lcdSrcChain,
        } = chains[selectedSource.chain_name];

        deposit_channel_id = selectedSource.channel_id || deposit_channel_id;
        deposit_gas = selectedSource.gas || deposit_gas;

        const toastId = toast.loading(
          `Sending ${normalizedAmount} ${selectedToken.name} from ${selectedSource.chain_name} to Secret Network`,
          {
            closeButton: true,
          }
        );

        try {
          let tx: TxResponse;
          if (!["Evmos", "Injective"].includes(selectedSource.chain_name)) {
            // Regular cosmos chain (not ethermint signing)
            tx = await sourceChainSecretjs.tx.ibc.transfer(
              {
                sender: sourceAddress,
                receiver: secretAddress,
                source_channel: deposit_channel_id,
                source_port: "transfer",
                token: {
                  amount,
                  denom: selectedToken.deposits.filter(
                    (deposit) =>
                      deposit.chain_name === selectedSource.chain_name
                  )[0].from_denom,
                },
                timeout_timestamp: String(
                  Math.floor(Date.now() / 1000) + 10 * 60
                ), // 10 minute timeout
              },
              {
                gasLimit: deposit_gas,
                ibcTxsOptions: {
                  resolveResponsesCheckIntervalMs: 10_000,
                  resolveResponsesTimeoutMs: 10.25 * 60 * 1000,
                },
              }
            );
          } else {
            // Handle IBC transfers from Ethermint chains like Evmos & Injective

            // Get Evmos/Injective account_number & sequence
            const {
              account: {
                base_account: {
                  account_number: accountNumber,
                  sequence: accountSequence,
                },
              },
            }: {
              account: {
                base_account: {
                  account_number: string;
                  sequence: string;
                };
              };
            } = await (
              await fetch(
                `${
                  chains[selectedSource.chain_name].lcd
                }/cosmos/auth/v1beta1/accounts/${sourceAddress}`
              )
            ).json();

            // Get account pubkey
            // Can't get it from the chain because an account without txs won't have its pubkey listed on-chain
            const evmosProtoSigner = window.getOfflineSigner!(
              chains[selectedSource.chain_name].chain_id
            );
            const [{ pubkey }] = await evmosProtoSigner.getAccounts();

            // Create IBC MsgTransfer tx
            const txIbcMsgTransfer = createTxIBCMsgTransfer(
              {
                chainId: 9001, // Evmos EIP155, this is ignored in Injective
                cosmosChainId: chains[selectedSource.chain_name].chain_id,
              },
              {
                accountAddress: sourceAddress,
                accountNumber: Number(accountNumber),
                sequence: Number(accountSequence),
                pubkey: toBase64(pubkey),
              },
              {
                gas: String(deposit_gas),
                amount: "0", // filled in by Keplr
                denom: "aevmos", // filled in by Keplr
              },
              "",
              {
                sourcePort: "transfer",
                sourceChannel: deposit_channel_id,
                amount,
                denom: selectedToken.deposits.filter(
                  (deposit) => deposit.chain_name === selectedSource.chain_name
                )[0].from_denom,
                receiver: secretAddress,
                revisionNumber: 0,
                revisionHeight: 0,
                timeoutTimestamp: `${
                  Math.floor(Date.now() / 1000) + 10 * 60
                }000000000`, // 10 minute timeout (ns)
              }
            );

            if (chains[selectedSource.chain_name].chain_name === "Injective") {
              const signer_info =
                txIbcMsgTransfer.signDirect.authInfo.signer_infos[0].toObject();
              signer_info.public_key!.type_url =
                "/injective.crypto.v1beta1.ethsecp256k1.PubKey";

              txIbcMsgTransfer.signDirect.authInfo.signer_infos[0] =
                cosmos.tx.v1beta1.SignerInfo.fromObject(signer_info);
            }

            // Sign the tx
            const sig = await window?.keplr?.signDirect(
              chains[selectedSource.chain_name].chain_id,
              sourceAddress,
              {
                bodyBytes: txIbcMsgTransfer.signDirect.body.serializeBinary(),
                authInfoBytes:
                  txIbcMsgTransfer.signDirect.authInfo.serializeBinary(),
                chainId: chains[selectedSource.chain_name].chain_id,
                accountNumber: new Long(Number(accountNumber)),
              },
              // @ts-expect-error the types are not updated on the Keplr types package
              { isEthereum: true }
            );

            // Encode the Evmos tx to a TxRaw protobuf binary
            const txRaw = TxRaw.fromPartial({
              body_bytes: sig!.signed.bodyBytes,
              auth_info_bytes: sig!.signed.authInfoBytes,
              signatures: [fromBase64(sig!.signature.signature)],
            });
            const txBytes = TxRaw.encode(txRaw).finish();

            // cosmjs can broadcast to Ethermint but cannot handle the response

            // Broadcast the tx to Evmos
            tx = await sourceChainSecretjs.tx.broadcastSignedTx(
              toBase64(txBytes),
              {
                ibcTxsOptions: {
                  resolveResponsesCheckIntervalMs: 10_000,
                  resolveResponsesTimeoutMs: 10.25 * 60 * 1000,
                },
              }
            );
          }

          if (tx.code !== 0) {
            toast.update(toastId, {
              render: `Failed sending ${normalizedAmount} ${selectedToken.name} from ${selectedSource.chain_name} to Secret Network: ${tx.rawLog}`,
              type: "error",
              isLoading: false,
            });
            return;
          } else {
            toast.update(toastId, {
              render: `Receiving ${normalizedAmount} ${selectedToken.name} on Secret Network from ${selectedSource.chain_name}`,
            });

            const ibcResp = await tx.ibcResponses[0];

            if (ibcResp.type === "ack") {
              toast.update(toastId, {
                render: `Received ${normalizedAmount} ${selectedToken.name} on Secret Network from ${selectedSource.chain_name}`,
                type: "success",
                isLoading: false,
                closeOnClick: true,
              });
              if (ibcMode === "deposit") {
                setIsWrapModalOpen(true);
              }
            } else {
              toast.update(toastId, {
                render: `Timed out while waiting to receive ${normalizedAmount} ${selectedToken.name} on Secret Network from ${selectedSource.chain_name}`,
                type: "warning",
                isLoading: false,
              });
            }
          }
        } catch (e) {
          toast.update(toastId, {
            render: `Failed sending ${normalizedAmount} ${selectedToken.name} from ${selectedSource.chain_name} to Secret Network: ${e}`,
            type: "error",
            isLoading: false,
          });
        } finally {
          setLoading(false);
        }
      }
      if (ibcMode === "withdrawal") {
        if (!secretjs) {
          console.error("No secretjs");
          return;
        }

        if (!amountToTransfer) {
          console.error("Empty withdraw");
          return;
        }

        const normalizedAmount = (amountToTransfer as string).replace(/,/g, "");

        if (!(Number(normalizedAmount) > 0)) {
          console.error(`${normalizedAmount} not bigger than 0`);
          return;
        }

        setLoading(true);

        const amount = new BigNumber(normalizedAmount)
          .multipliedBy(`1e${selectedToken.decimals}`)
          .toFixed(0, BigNumber.ROUND_DOWN);

        let {
          withdraw_channel_id,
          withdraw_gas,
          lcd: lcdDstChain,
        } = chains[selectedSource.chain_name];

        withdraw_channel_id = selectedSource.channel_id || withdraw_channel_id;
        withdraw_gas = selectedSource.gas || withdraw_gas;

        const toastId = toast.loading(
          `Sending ${normalizedAmount} ${selectedToken.name} from Secret Network to ${selectedSource.chain_name}`,
          {
            closeButton: true,
          }
        );

        try {
          let tx: TxResponse;

          if (selectedToken.is_snip20) {
            tx = await secretjs.tx.compute.executeContract(
              {
                contract_address: selectedToken.address,
                code_hash: selectedToken.code_hash,
                sender: secretAddress,
                msg: {
                  send: {
                    recipient: "secret1tqmms5awftpuhalcv5h5mg76fa0tkdz4jv9ex4", // cw20-ics20
                    recipient_code_hash:
                      "f85b413b547b9460162958bafd51113ac266dac96a84c33b9150f68f045f2641",
                    amount,
                    msg: toBase64(
                      toUtf8(
                        JSON.stringify({
                          channel: withdraw_channel_id,
                          remote_address: sourceAddress,
                          timeout: 600, // 10 minute timeout
                        })
                      )
                    ),
                  },
                },
              },
              {
                gasLimit: withdraw_gas,
                gasPriceInFeeDenom: 0.1,
                feeDenom: "uscrt",
                feeGranter: feeGrantStatus === "Success" ? faucetAddress : "",
                ibcTxsOptions: {
                  resolveResponsesCheckIntervalMs: 10_000,
                  resolveResponsesTimeoutMs: 10.25 * 60 * 1000,
                },
              }
            );
          } else {
            tx = await secretjs.tx.ibc.transfer(
              {
                sender: secretAddress,
                receiver: sourceAddress,
                source_channel: withdraw_channel_id,
                source_port: "transfer",
                token: {
                  amount,
                  denom: selectedToken.withdrawals.filter(
                    (withdraw) =>
                      withdraw.chain_name === selectedSource.chain_name
                  )[0].from_denom,
                },
                timeout_timestamp: String(
                  Math.floor(Date.now() / 1000) + 10 * 60
                ), // 10 minute timeout
              },
              {
                gasLimit: withdraw_gas,
                gasPriceInFeeDenom: 0.1,
                feeDenom: "uscrt",
                feeGranter: feeGrantStatus === "Success" ? faucetAddress : "",
                ibcTxsOptions: {
                  resolveResponsesCheckIntervalMs: 10_000,
                  resolveResponsesTimeoutMs: 10.25 * 60 * 1000,
                },
              }
            );
          }
          if (tx.code !== 0) {
            toast.update(toastId, {
              render: `Failed sending ${normalizedAmount} ${selectedToken.name} from Secret Network to ${selectedSource.chain_name}: ${tx.rawLog}`,
              type: "error",
              isLoading: false,
            });
          } else {
            toast.update(toastId, {
              render: `Receiving ${normalizedAmount} ${selectedToken.name} on ${selectedSource.chain_name}`,
            });

            const ibcResp = await tx.ibcResponses[0];

            if (ibcResp.type === "ack") {
              toast.update(toastId, {
                render: `Received ${normalizedAmount} ${selectedToken.name} on ${selectedSource.chain_name}`,
                type: "success",
                isLoading: false,
                closeOnClick: true,
              });
            } else {
              toast.update(toastId, {
                render: `Timed out while waiting to receive ${normalizedAmount} ${selectedToken.name} on ${selectedSource.chain_name} from Secret Network`,
                type: "warning",
                isLoading: false,
              });
            }
          }
        } catch (e) {
          toast.update(toastId, {
            render: `Failed sending ${normalizedAmount} ${selectedToken.name} from Secret Network to ${selectedSource.chain_name}: ${e}`,
            type: "error",
            isLoading: false,
          });
        } finally {
          setLoading(false);
        }
      }
    }

    return (
      <>
        <button
          className={
            "enabled:bg-gradient-to-br enabled:from-cyan-600 enabled:to-purple-600 enabled:hover:from-cyan-500 enabled:hover:to-purple-500 transition-colors text-white font-semibold py-2.5 w-full rounded-lg disabled:bg-neutral-500"
          }
          disabled={!secretjs || !secretAddress}
          onClick={() => submit()}
        >
          Execute Transfer
        </button>
      </>
    );
  }

  return (
    <>
      {/* [From|To] Picker */}
      <div className="flex flex-col md:flex-row mb-8">
        {/* *** From *** */}
        <div className="flex-initial w-full md:w-1/3">
          {/* circle */}
          <div
            className="w-full relative rounded-full overflow-hidden border-2 border-cyan-500 hidden md:block"
            style={{ paddingTop: "100%" }}
          >
            <div className="img-wrapper absolute top-1/2 left-0 right-0 -translate-y-1/2 text-center">
              <div className="w-1/2 inline-block">
                <div className="relative">
                  <div
                    className={`absolute inset-0 bg-cyan-500 blur-md rounded-full overflow-hidden ${
                      secretjs && secretAddress
                        ? "fadeInAndOutLoop"
                        : "opacity-40"
                    }`}
                  ></div>
                  <img
                    src={
                      "/img/assets/" +
                      (ibcMode === "deposit"
                        ? chains[selectedSource.chain_name].chain_image
                        : "scrt.svg")
                    }
                    className="w-full relative inline-block rounded-full overflow-hiden"
                  />
                </div>
              </div>
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 text-center text-sm font-bold text-black dark:text-white"
              style={{ bottom: "10%" }}
            >
              From
            </div>
          </div>
          {/* Chain Picker */}
          <div className="-mt-3 relative z-10 w-full">
            {/* {value} */}
            {ibcMode === "deposit" && <ChainSelect />}
            {ibcMode === "withdrawal" && (
              <div
                style={{ paddingTop: ".76rem", paddingBottom: ".76rem" }}
                className="flex items-center w-full text-sm font-semibold select-none bg-white dark:bg-neutral-800 rounded text-neutral-800 dark:text-neutral-200 focus:bg-neutral-300 dark:focus:bg-neutral-700 disabled:hover:bg-neutral-200 dark:disabled:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"
              >
                <div className="flex-1 px-3 text-center">
                  <span>Secret Network</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 py-2 md:py-0">
          <div className="md:relative" id="ibcSwitchButton">
            <div className="md:absolute md:top-1/2 md:left-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 text-center md:text-left">
              <Tooltip
                title={`Switch chains`}
                placement="bottom"
                disableHoverListener={!secretjs && !secretAddress}
                arrow
              >
                <span>
                  <button
                    onClick={toggleIbcMode}
                    className={
                      "inline-block bg-neutral-200 dark:bg-neutral-800 px-3 py-2 text-cyan-500 dark:text-cyan-500 transition-colors rounded-xl disabled:text-neutral-500 dark:disabled:text-neutral-500" +
                      (secretjs && secretAddress
                        ? " hover:text-cyan-700 dark:hover:text-cyan-300"
                        : "")
                    }
                    disabled={!secretjs || !secretAddress}
                  >
                    <FontAwesomeIcon
                      icon={faRightLeft}
                      className="rotate-90 md:rotate-0"
                    />
                  </button>
                </span>
              </Tooltip>
            </div>
          </div>
        </div>
        {/* *** To *** */}
        <div className="flex-initial w-full md:w-1/3">
          <div
            className="w-full relative rounded-full overflow-hidden border-2 border-violet-500 hidden md:block"
            style={{ paddingTop: "100%" }}
          >
            <div className="img-wrapper absolute top-1/2 left-0 right-0 -translate-y-1/2 text-center">
              <div className="w-1/2 inline-block">
                <div className="relative">
                  <div
                    className={`absolute inset-0 bg-violet-500 blur-md rounded-full overflow-hidden ${
                      secretjs && secretAddress
                        ? "fadeInAndOutLoop"
                        : "opacity-40"
                    }`}
                  ></div>
                  <img
                    src={
                      "/img/assets/" +
                      (ibcMode === "withdrawal"
                        ? chains[selectedSource.chain_name].chain_image
                        : "scrt.svg")
                    }
                    className="w-full relative inline-block rounded-full overflow-hiden"
                  />
                </div>
              </div>
            </div>
            <div
              className="absolute left-0 right-0 text-center text-sm font-bold text-black dark:text-white"
              style={{ bottom: "10%" }}
            >
              To
            </div>
          </div>
          {/* Chain Picker */}
          <div className="md:-mt-3 md:relative z-10 w-full">
            {ibcMode === "withdrawal" && <ChainSelect />}
            {ibcMode === "deposit" && (
              <div
                style={{ paddingTop: ".76rem", paddingBottom: ".76rem" }}
                className="flex items-center w-full text-sm font-semibold select-none bg-neutral-200 dark:bg-neutral-800 rounded text-neutral-800 dark:text-neutral-200 focus:bg-neutral-300 dark:focus:bg-neutral-700 disabled:hover:bg-neutral-200 dark:disabled:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"
              >
                <div className="flex-1 px-3 text-center">
                  <span>Secret Network</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-neutral-200 dark:bg-neutral-800 p-4 rounded-xl space-y-6 my-4">
        <div className="flex items-center">
          <div className="font-semibold mr-4 w-10">From:</div>
          <div className="flex-1 truncate font-medium text-sm">
            {ibcMode === "deposit" && secretjs && secretAddress && (
              <a
                href={`${
                  chains[selectedSource.chain_name].explorer_account
                }${sourceAddress}`}
                target="_blank"
              >
                {sourceAddress}
              </a>
            )}
            {ibcMode === "withdrawal" && secretjs && secretAddress && (
              <a
                href={`${
                  chains[selectedSource.chain_name].explorer_account
                }${secretAddress}`}
                target="_blank"
              >
                {secretAddress}
              </a>
            )}
          </div>
          <div className="flex-initial ml-4">
            <CopyToClipboard
              text={ibcMode === "deposit" ? sourceAddress : secretAddress}
              onCopy={() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 3000);
                toast.success("Address copied to clipboard!");
              }}
            >
              <Tooltip
                title={"Copy to clipboard"}
                placement="bottom"
                disableHoverListener={!secretjs && !secretAddress}
                arrow
              >
                <span>
                  <button
                    className="text-neutral-500 enabled:hover:text-white enabled:active:text-neutral-500 transition-colors"
                    disabled={!secretjs && !secretAddress}
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </button>
                </span>
              </Tooltip>
            </CopyToClipboard>
          </div>
        </div>

        <div className="flex items-center">
          <div className="flex-initial font-semibold mr-4 w-10">To:</div>
          <div className="flex-1 truncate font-medium text-sm">
            {ibcMode === "withdrawal" && (
              <a
                href={`${
                  chains[selectedSource.chain_name].explorer_account
                }${sourceAddress}`}
                target="_blank"
              >
                {sourceAddress}
              </a>
            )}
            {ibcMode === "deposit" && (
              <a
                href={`${targetChain.explorer_account}${secretAddress}`}
                target="_blank"
              >
                {secretAddress}
              </a>
            )}
          </div>
          <div className="flex-initial ml-4">
            <CopyToClipboard
              text={ibcMode === "withdrawal" ? sourceAddress : secretAddress}
              onCopy={() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 3000);
                toast.success("Address copied to clipboard!");
              }}
            >
              <Tooltip
                title={"Copy to clipboard"}
                placement="bottom"
                disableHoverListener={!secretjs && !secretAddress}
                arrow
              >
                <span>
                  <button
                    className="text-neutral-500 enabled:hover:text-white enabled:active:text-neutral-500 transition-colors"
                    disabled={!secretjs && !secretAddress}
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </button>
                </span>
              </Tooltip>
            </CopyToClipboard>
          </div>
        </div>
      </div>

      <div className="bg-neutral-200 dark:bg-neutral-800 p-4 rounded-xl">
        <div className="flex" id="inputWrapper">
          <Select
            options={supportedTokens}
            value={selectedToken}
            onChange={setSelectedToken}
            isDisabled={!secretjs || !secretAddress}
            formatOptionLabel={(token) => (
              <div className="flex items-center">
                <img
                  src={`/img/assets/${token.image}`}
                  className="w-6 h-6 mr-2 rounded-full"
                />
                <span className="font-semibold text-sm">{token.name}</span>
              </div>
            )}
            className="react-select-wrap-container"
            classNamePrefix="react-select-wrap"
          />
          <input
            type="text"
            value={amountToTransfer}
            onChange={handleInputChange}
            className={
              "text-right focus:z-10 block flex-1 min-w-0 w-full bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white px-4 rounded-r-lg disabled:placeholder-neutral-300 dark:disabled:placeholder-neutral-700 transition-colors font-medium" +
              (false ? "  border border-red-500 dark:border-red-500" : "")
            }
            name="amount"
            id="amount"
            placeholder="0"
            disabled={!secretAddress}
          />
        </div>

        {/* Balance | [25%|50%|75%|Max] */}
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 mt-3">
          <div className="flex-1 text-xs">
            <span className="font-semibold">Available: </span>
            <span className="font-medium">
              {(() => {
                if (availableBalance === "" && sourceAddress && secretjs) {
                  return <CircularProgress size="0.6em" />;
                }
                const prettyBalance = new BigNumber(availableBalance)
                  .dividedBy(`1e${selectedToken.decimals}`)
                  .toFormat();
                if (
                  prettyBalance === "NaN" &&
                  availableBalance === viewingKeyErrorString
                ) {
                  return (
                    <button
                      className="ml-2 font-semibold bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded-md border-neutral-300 dark:border-neutral-700 transition-colors hover:bg-neutral-300 dark:hover:bg-neutral-700 focus:bg-neutral-500 dark:focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 dark:disabled:text-neutral-500 disabled:hover:bg-neutral-100 dark:disabled:hover:bg-neutral-900 disabled:cursor-default"
                      onClick={async () => {
                        await setKeplrViewingKey(selectedToken.address);
                        try {
                          setAvailableBalance("");
                          //setLoadingTokenBalance(true);
                          await sleep(1000); // sometimes query nodes lag
                          await updateCoinBalance();
                        } finally {
                          //setLoadingTokenBalance(false);
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={faKey} className="mr-2" />
                      Set Viewing Key
                    </button>
                  );
                }
                if (!secretAddress && !secretjs) {
                  return "";
                }
                if (prettyBalance === "NaN") {
                  return "Error";
                }
                return `${prettyBalance} ${selectedToken.name}`;
              })()}
            </span>
          </div>
          <div className="sm:flex-initial text-xs">
            <div className="inline-flex rounded-full text-xs font-semibold">
              <button
                onClick={() => setAmountByPercentage(25)}
                className="bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded-l-md transition-colors hover:bg-neutral-300 dark:hover:bg-neutral-700 focus:bg-neutral-500 dark:focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 dark:disabled:text-neutral-500 disabled:hover:bg-neutral-900 dark:disabled:hover:bg-neutral-900 disabled:cursor-default"
                disabled={!secretAddress}
              >
                25%
              </button>
              <button
                onClick={() => setAmountByPercentage(50)}
                className="bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 transition-colors hover:bg-neutral-300 dark:hover:bg-neutral-700 focus:bg-neutral-500 dark:focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 dark:disabled:text-neutral-500 disabled:hover:bg-neutral-900 dark:disabled:hover:bg-neutral-900 disabled:cursor-default"
                disabled={!secretAddress}
              >
                50%
              </button>
              <button
                onClick={() => setAmountByPercentage(75)}
                className="bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 transition-colors hover:bg-neutral-300 dark:hover:bg-neutral-700 focus:bg-neutral-500 dark:focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 dark:disabled:text-neutral-500 disabled:hover:bg-neutral-900 dark:disabled:hover:bg-neutral-900 disabled:cursor-default"
                disabled={!secretAddress}
              >
                75%
              </button>
              <button
                onClick={() => setAmountByPercentage(100)}
                className="bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded-r-md transition-colors hover:bg-neutral-300 dark:hover:bg-neutral-700 focus:bg-neutral-500 dark:focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 dark:disabled:text-neutral-500 disabled:hover:bg-neutral-900 dark:disabled:hover:bg-neutral-900 disabled:cursor-default"
                disabled={!secretAddress}
              >
                MAX
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Grant */}
      <div className="bg-neutral-200 dark:bg-neutral-800 p-4 rounded-lg select-none flex items-center my-4">
        <div className="flex-1 flex items-center">
          <span className="font-semibold text-sm">Fee Grant</span>
          <Tooltip
            title={`Request Fee Grant so that you don't have to pay gas fees (up to 0.1 SCRT)`}
            placement="right"
            arrow
          >
            <span className="ml-2 mt-1 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer">
              <FontAwesomeIcon icon={faInfoCircle} />
            </span>
          </Tooltip>
        </div>
        <div className="flex-initial">
          {/* Deposit => no fee grant */}
          {ibcMode === "deposit" && (
            <>
              <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center h-[1.6rem]">
                <span>Unavailable</span>
              </div>
            </>
          )}

          {/* Untouched */}
          {ibcMode === "withdrawal" && feeGrantStatus === "Untouched" && (
            <>
              <button
                id="feeGrantButton"
                onClick={requestFeeGrant}
                className="font-semibold text-xs bg-neutral-100 dark:bg-neutral-900 px-1.5 py-1 rounded-md transition-colors hover:bg-neutral-300 dark:hover:bg-neutral-700 focus:bg-neutral-500 dark:focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 dark:disabled:text-neutral-500 disabled:hover:bg-neutral-100 dark:disabled:hover:bg-neutral-900 disabled:cursor-default"
                disabled={!secretjs || !secretAddress}
              >
                Request Fee Grant
              </button>
            </>
          )}
          {/* Success */}
          {ibcMode === "withdrawal" && feeGrantStatus === "Success" && (
            <div className="font-semibold text-sm flex items-center h-[1.6rem]">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="text-green-500 mr-1.5"
              />
              Fee Granted
            </div>
          )}
          {/* Fail */}
          {ibcMode === "withdrawal" && feeGrantStatus === "Fail" && (
            <div className="font-semibold text-sm h-[1.6rem]">
              <FontAwesomeIcon
                icon={faXmarkCircle}
                className="text-red-500 mr-1.5"
              />
              Request failed
            </div>
          )}
        </div>
      </div>
s
      <div className="mt-4">
        <SubmitButton />
      </div>
    </>
  );
}

export default Deposit;
