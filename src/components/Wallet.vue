<template>
  <div id="wallet">
    <button
      class="btn-connect"
      v-if="!this.currentAccount"
      @click.stop="connectWallet"
    >
      Connect
    </button>
    <div v-else class="user">
      <div v-if="this.driveKey" class="favorite" @click.stop="goProfile"/>
      <div class="account">
        {{ this.accountShort }}&nbsp;|&nbsp;Sepolia Network
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import { chains } from '@/store/state';

const chain = 11155111;
const CHAIN_ID = `0x${chain.toString(16)}`;

export default {
  name: "Wallet",
  props: {},

  data: () => ({
    networkId: chain,
    currentAccount: null,
  }),
  async created() {
    this.connectWallet();
    window.ethereum.on("chainChanged", this.handleChainChanged);
    window.ethereum.on("accountsChanged", this.handleAccountsChanged);
  },
  computed: {
    accountShort() {
      return (
        this.currentAccount.substring(0, 6) +
        "..." +
        this.currentAccount.substring(
          this.currentAccount.length - 4,
          this.currentAccount.length
        )
      );
    },
    driveKey() {
      return this.$store.state.driveKey;
    }
  },
  methods: {
    ...mapActions(["setChainConfig", "setAccount", "setDriveKey"]),
    connectWallet() {
      if (!window.ethereum) {
        this.$message.error('Can\'t setup network on metamask because window.ethereum is undefined');
        return;
      }
      this.login();
    },
    async handleChainChanged() {
      const newChainId = await window.ethereum.request({ method: "eth_chainId" });
      if (CHAIN_ID !== newChainId) {
        this.currentAccount = null;
        this.setAccount(null);
        this.setChainConfig({});
      } else {
        const c = chains.find((v) => v.chainID === CHAIN_ID);
        this.setChainConfig(JSON.parse(JSON.stringify(c)));
        if (!this.currentAccount) {
          await this.login();
        }
      }
    },
    async handleAccountsChanged(accounts) {
      // account
      if (accounts.length === 0) {
        this.currentAccount = null;
        this.setAccount(null);
        console.warn(
          "MetaMask is locked or the user has not connected any accounts"
        );
        return;
      }
      if (accounts[0] !== this.currentAccount) {
        // drive key clear
        sessionStorage.setItem(this.currentAccount, '');
        sessionStorage.setItem(accounts[0], '');
        this.currentAccount = accounts[0];
        this.setAccount(accounts[0]);
      }
    },
    async handleAccount(accounts) {
      // account
      if (accounts.length === 0) {
        console.warn( "MetaMask is locked or the user has not connected any accounts");
        return;
      }
      // chain
      const driveKey = sessionStorage.getItem(accounts[0]);
      if (driveKey) {
        this.setDriveKey(driveKey);
      }

      const c = chains.find((v) => v.chainID === CHAIN_ID);
      this.setChainConfig(JSON.parse(JSON.stringify(c)));
      this.currentAccount = accounts[0];
      this.setAccount(accounts[0]);
    },
    async login() {
			try {
				await window.ethereum.request({
					method: 'eth_requestAccounts',
				});

				// check
				const chainId = await window.ethereum.request({
					method: 'eth_chainId',
				});
				if (chainId !== CHAIN_ID) {
					const success = await this.switchNetwork();
					if (!success) return;
				}

				const accounts = await window.ethereum.request({
					method: 'eth_accounts',
				});
				await this.handleAccount(accounts);
			} catch (error) {
				if (error.code === 4001) {
					this.$message.error('User rejected');
				} else {
					this.$message.error('Connect Error');
					console.error(error);
				}
			}
    },
    async switchNetwork() {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: CHAIN_ID }],
				});
				return true;
			} catch (error) {
				if (error.code === 4001) {
					this.$message.error(`Please switch to Sepolia network`);
				} else {
					this.$message.error('Failed to switch network');
					console.error(error);
				}
				return false;
			}
    },
    goProfile(){
      this.$router.push({path: "/address"});
    }
  },
};
</script>

<style scoped>
#wallet {
  display: flex;
  justify-content: center;
}

.user{
  display: flex;
  flex-direction: row;
}

.account {
  height: 38px;
  font-size: 15px;
  line-height: 38px;
  background: #FFFFFF;
  border-radius: 36px;
  border: 1px solid #E8E6F2;
  padding: 0 15px;
  text-align: center;
}
.favorite{
  cursor: pointer;
  height: 38px;
  width: 38px;
  margin-right: 10px;
  padding: 0;
  color: #6E529C;
  background-image: url("../assets/user.png");
  background-repeat:no-repeat;
  background-size:100% 100%;
  -moz-background-size:100% 100%;
}

.btn-connect {
  transition: all 0.1s ease 0s;
  width: 120px;
  height: 44px;
  color: #ffffff;
  font-size: 18px;
  border: 0;
  background: #6E529C;
  border-radius: 36px;
  cursor: pointer;
}
.btn-connect:hover {
  background-color: #6E529CBB;
  border: 0;
}
</style>
