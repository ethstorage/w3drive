<template>
  <div class="home">
    <p class="title">
      WELCOME TO W3DRIVE
    </p>
    <p class="message">
      Your private and secure, decentralized, pay-as-you-go,<br/>
      censorship-resistant and permanent hard drive.
    </p>

    <w3q-deployer v-if="driveKey" multiple :fileContract="contract" :driveKey="this.driveKey" style="width: 500px"/>
    <div v-else class="drive">
      <el-input placeholder="Input Password" v-model="input" show-password></el-input>
      <el-button v-if="drive&&drive.uuid!=='none'" type="warning" round class="home-btn" @click="openDrive">
        Enter Drive
      </el-button>
      <el-button v-else type="warning" round class="home-btn" @click="onCreateDrive">
        Create Drive
      </el-button>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";
import { v4 as uuidv4} from 'uuid';
import W3qDeployer from '@/components/w3q-deployer.vue';
import {getDrive, login, createDrive, encryptDrive} from '@/utils/dirve/w3drive';

export default {
  name: 'Home',
  components: {W3qDeployer},
  data: () => {
    return {
      driveUuid: undefined,
      signature: undefined,
      input: "",
    }
  },
  computed: {
    contract() {
      if (this.$store.state.chainConfig && this.$store.state.chainConfig.chainID) {
        const {FileBoxController} = this.$store.state.chainConfig;
        return FileBoxController;
      }
      return null;
    },
    account() {
      return this.$store.state.account;
    },
    driveKey() {
      return this.$store.state.driveKey;
    }
  },
  asyncComputed: {
    drive: {
      async get() {
        if (this.account) {
          const {FileBoxController} = this.$store.state.chainConfig;
          return await getDrive(FileBoxController);
        }
        return undefined;
      },
      default: undefined,
      watch: ['account']
    },
  },
  watch: {
    drive: async function () {
      await this.signatureLogin();
    }
  },
  methods: {
    ...mapActions(["setDriveKey"]),
    async signatureLogin() {
      if (this.drive && !this.driveKey) {
        this.driveUuid = 'none' === this.drive.uuid ? uuidv4() : this.drive.uuid;
        this.signature = await login(this.driveUuid, this.account, 3334);
      }
    },
    async onCreateDrive() {
      const password = this.input;
      if (!password) {
        this.$message.error('Password Error');
        return;
      }

      if (!this.signature) {
        await this.signatureLogin();
        if (!this.signature) {
          this.$message.error('Failed to create drive');
        }
      }

      const driveKey = await createDrive(this.contract, this.driveUuid, this.signature, password);
      if (driveKey) {
        this.setDriveKey(driveKey);
        sessionStorage.setItem(this.account, driveKey);
        this.$notify({title: 'Transaction', message: "Create Drive Success", type: 'success'});
      } else {
        this.$message.error('Failed to create drive');
      }
    },
    async openDrive() {
      const password = this.input;
      if (!password) {
        this.$message.error('Password Error');
        return;
      }

      if (!this.signature) {
        await this.signatureLogin();
        if (!this.signature) {
          this.$message.error('Failed to open drive');
        }
      }

      const driveKey = await encryptDrive(this.signature, password, this.drive.iv, this.drive.encrypt);
      if (driveKey) {
        this.setDriveKey(driveKey);
        sessionStorage.setItem(this.account, driveKey);
      } else {
        this.$message.error('Password Error');
      }
    }
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  font-size: 60px;
  color: indianred;
  line-height: 50px;
  margin-top: 60px;
}

.message {
  font-size: 23px;
  color: #333333;
  line-height: 30px;
  margin-bottom: 50px;
  margin-top: 30px;
}

.drive{
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 40px;
}

.home-btn {
  background-color: #52DEFF;
  margin-top: 20px;
  font-size: 18px;
  border: 0;
}
.home-btn:focus,
.home-btn:hover {
  background-color: #52DEFFBB;
}
.home-btn:disabled:hover,
.home-btn:disabled {
  background-color: #cccccc;
}
</style>
