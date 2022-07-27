<template>
  <div>
    <div v-if="!this.file" class="domain-loading" v-loading="true"/>
    <el-card v-else class="profile-card">
      <div class="file-header">
        <div class="file-title">
          <span class="file-title-text">{{ renderName(this.file.name) }}</span>
          <span class="file-title-time">{{ renderTimestamp(this.file.time) }}</span>
        </div>
      </div>
      <div class="divider"/>
      <!--   data   -->
      <div class="profile-date">
        <img v-if="this.isImage(file.type)" :src="'data:image/png;base64,' + arrayBufferToBase64(this.file.data)"/>
      </div>
    </el-card>
  </div>
</template>

<script>
import {ethers} from "ethers";
// import UpdateIcon from "./icon";
import {getFile, deleteFile} from '@/utils/profile';

const stringToHex = (s) => ethers.utils.hexlify(ethers.utils.toUtf8Bytes(s));
const hexToString = (h) => ethers.utils.toUtf8String(h);

export default {
  name: 'File',
  data: () => {
    return {
      name: "",
      result: null,
      isDelete: false,
      checkedDeletes: []
    };
  },
  // components: { UpdateIcon },
  computed: {
    driveKey() {
      return this.$store.state.driveKey;
    },
    uuid() {
      return stringToHex(this.$route.params.uuid);
    }
  },
  watch: {
    driveKey: function () {
      this.goHome();
    }
  },
  created() {
    if(!this.driveKey){
      this.goHome();
    }
  },
  asyncComputed: {
    file : {
      async get() {
        if (!this.uuid) {
          return 'none';
        }
        const { FileBoxController} = this.$store.state.chainConfig;
        if (!FileBoxController) {
          return "none";
        }
        return await getFile(FileBoxController, this.driveKey, this.uuid);
      },
      default: undefined,
      watch: ["driveKey", "uuid"],
    },
  },
  methods: {
    isImage(type) {
      if (!type) {return;}
      type = hexToString(type);
      return type.includes('image');
    },
    renderTimestamp(ts) {
      if (!ts) {
        return "";
      }
      return ts.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    },
    renderName(name) {
      return hexToString(name);
    },
    arrayBufferToBase64(buffer) {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    },
    goHome() {
      this.$router.push({path: "/"});
    },
    onDelete() {
      const { FileBoxController} = this.$store.state.chainConfig;
      if (!FileBoxController) {
        return;
      }
      this.showProgress = true;
      deleteFile(FileBoxController, this.uuid)
          .then((v) => {
            if (v) {
              this.$notify({title: 'Success',message: 'Delete Success',type: 'success'});
              this.goHome();
            } else {
              this.showProgress = false;
              this.$notify({title: 'Error',message: 'Delete Fail',type: 'error'});
            }
          })
          .catch(() => {
            this.showProgress = false;
            this.$notify({title: 'Error',message: 'Delete Fail',type: 'error'});
          });
    },
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import "../assets/styles/mixins.scss";
@import "../assets/styles/vars.scss";

.domain-loading {
  min-width: 40vw;
  min-height: 50vh;
}
.domain-loading >>> .el-loading-mask{
  background: transparent !important;
}

.profile-card {
  background: #FFFFFF;
  border-radius: 16px;
  margin-top: 35px;
  padding: 15px;
}

.file-header{
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.file-title {
  display: flex;
  flex-direction: column;
  align-items: start;
}

.file-title-text {
  font-size: 25px;
  font-weight: bold;
  color: #221F33;
}
.file-title-time {
  font-size: 14px;
  color: #999999;
  margin-top: 6px;
}

.divider {
  background-color: #E8E6F2;
  height: 1px;
  padding: 0;
  width: 100%;
  margin: 20px 0;
}

.profile-date {
  width: 100%;
  min-height: 500px;
  padding: 30px 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.profile-btn {
  background-color: #52DEFF;
  margin-top: 15px;
  font-size: 18px;
  border: 0;
}
.profile-btn:focus,
.profile-btn:hover {
  background-color: #52DEFFBB;
}

.icon-loading {
  animation: rotating 2s infinite linear;
}
@keyframes rotating {
  0% {
    transform: rotate(0deg)
  }
  to {
    transform: rotate(1turn)
  }
}

@media screen and (max-width: 420px) {
  .profile-card {
    padding: 0;
    margin-top: 5px;
  }

  .profile-date {
    justify-content: center;
  }
}
</style>
