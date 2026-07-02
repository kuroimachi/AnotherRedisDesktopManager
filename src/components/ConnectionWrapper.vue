<template>
  <el-menu
    ref="connectionMenu"
    :collapse-transition='false'
    :id="connectionAnchor"
    @open="openConnection()"
    class="connection-menu"
    active-text-color="#ffd04b">
    <el-submenu :index="config.connectionName">
      <!-- connection menu -->
      <ConnectionMenu
        slot="title"
        :config="config"
        :client='client'
        @changeColor='setColor'
        @refreshConnection='openConnection(false, true)'>
      </ConnectionMenu>

      <!-- db search operate -->
      <OperateItem
        ref='operateItem'
        :config="config"
        :client='client'>
      </OperateItem>

      <!-- key list -->
      <KeyList
        ref='keyList'
        :config="config"
        :globalSettings='globalSettings'
        :client='client'>
      </KeyList>
    </el-submenu>
  </el-menu>
</template>

<script type="text/javascript">
import redisClient from '@/redisClient.js';
import KeyList from '@/components/KeyList';
import OperateItem from '@/components/OperateItem';
import ConnectionMenu from '@/components/ConnectionMenu';

export default {
  data() {
    return {
      client: null,
      pingTimer: null,
      pingInterval: 10000, // ms
      lastSelectedDb: 0,
    };
  },
  props: ['config', 'globalSettings', 'index'],
  components: { ConnectionMenu, OperateItem, KeyList },
  created() {
    this.$bus.$on('closeConnection', (connectionName = false) => {
      this.closeConnection(connectionName);
    });
    // open connection
    this.$bus.$on('openConnection', (connectionName) => {
      if (connectionName && (connectionName == this.config.connectionName)) {
        this.openConnection();
        this.$refs.connectionMenu.open(this.config.connectionName);
      }
    });
  },
  computed: {
    connectionAnchor() {
      return `connection-anchor-${this.config.connectionName}`;
    },
  },
  methods: {
    initShow() {
      this.$refs.operateItem.initShow();
      this.$refs.keyList.initShow();
    },
    initLastSelectedDb() {
      const db = parseInt(localStorage.getItem(`lastSelectedDb_${this.config.connectionName}`));

      if (db > 0 && this.lastSelectedDb != db) {
        this.lastSelectedDb = db;
        this.$refs.operateItem && this.$refs.operateItem.setDb(db);
      }
    },
    openConnection(callback = false, forceOpen = false) {
      // scroll to connection
      this.scrollToConnection();
      // recovery last selected db
      this.initLastSelectedDb();

      // opened, do nothing
      if (this.client) {
        return forceOpen ? this.afterOpenConnection(this.client, callback) : false;
      }

      // set searching status first
      this.$refs.operateItem.searchIcon = 'el-icon-loading';

      // create a new client
      const clientPromise = this.getRedisClient(this.config);

      clientPromise.then((realClient) => {
        this.afterOpenConnection(realClient, callback);
      }).catch((e) => {});
    },
    afterOpenConnection(client, callback = false) {
      // new connection, not ready
      if (client.status != 'ready') {
        client.on('ready', () => {
          if (client.readyInited) {
            return;
          }

          client.readyInited = true;
          // open status tab
          this.$bus.$emit('openStatus', client, this.config.connectionName);
          this.startPingInterval();

          this.initShow();
          callback && callback();
        });
      }

      // connection is ready
      else {
        this.initShow();
        callback && callback();
      }
    },
    closeConnection(connectionName) {
      // if connectionName is not passed, close all connections
      if (connectionName && (connectionName != this.config.connectionName)) {
        return;
      }

      this.$refs.connectionMenu
      && this.$refs.connectionMenu.close(this.config.connectionName);
      this.$bus.$emit('removeAllTab', connectionName);

      // clear ping interval
      clearInterval(this.pingTimer);

      // reset operateItem items
      this.$refs.operateItem && this.$refs.operateItem.resetStatus();
      // reset keyList items
      this.$refs.keyList && this.$refs.keyList.resetKeyList(true);

      this.client && this.client.quit && this.client.quit();
      this.client = null;
    },
    startPingInterval() {
      this.pingTimer = setInterval(() => {
        this.client && this.client.ping().then((reply) => {}).catch((e) => {
          // this.$message.error('Ping Error: ' + e.message);
        });
      }, this.pingInterval);
    },
    getRedisClient(config) {
      // prevent changing back to raw config, such as config.db
      const configCopy = JSON.parse(JSON.stringify(config));
      // select db
      configCopy.db = this.lastSelectedDb;

      // ssh client
      if (configCopy.sshOptions) {
        var clientPromise = redisClient.createSSHConnection(
          configCopy.sshOptions, configCopy.host, configCopy.port, configCopy.auth, configCopy,
        );
      }
      // normal client
      else {
        var clientPromise = redisClient.createConnection(
          configCopy.host, configCopy.port, configCopy.auth, configCopy,
        );
      }

      clientPromise.then((client) => {
        this.client = client;

        client.on('error', (error) => {
          this.$message.error({
            message: `Client On Error: ${error} Config right?`,
            duration: 3000,
            customClass: 'redis-on-error-message',
          });

          this.$bus.$emit('closeConnection');
        });
      }).catch((error) => {
        this.$message.error(error.message);
        this.$bus.$emit('closeConnection');
      });

      return clientPromise;
    },
    setColor(color, save = true) {
      const ulDom = this.$refs.connectionMenu.$el;
      const className = 'menu-with-custom-color';

      // save to setting
      save && this.$storage.editConnectionItem(this.config, { color });

      if (!color) {
        ulDom.classList.remove(className);
      } else {
        ulDom.classList.add(className);
        this.$el.style.setProperty('--menu-color', color);
      }
    },
    scrollToConnection() {
      this.$nextTick(() => {
        // 300ms after menu expand animination
        setTimeout(() => {
          let scrollTop = 0;
          const menus = document.querySelectorAll('.connections-wrap .connections-list>ul');

          // calc height sum of all above menus
          for (const menu of menus) {
            if (menu.id === this.connectionAnchor) {
              break;
            }
            scrollTop += (menu.clientHeight + 8);
          }

          // if connections filter input exists, scroll more
          // 32 = height('.filter-input')+margin
          const offset = document.querySelector('.connections-wrap .filter-input') ? 32 : 0;
          document.querySelector('.connections-wrap').scrollTo({
            top: scrollTop + offset,
            behavior: 'smooth',
          });
        }, 320);
      });
    },
  },
  mounted() {
    this.setColor(this.config.color, false);
  },
  beforeDestroy() {
    this.closeConnection(this.config.connectionName);
  },
};
</script>

<style type="text/css">
  /*menu ul*/
  .connection-menu {
    margin-bottom: 2px;
    padding-right: 0;
    border-right: 0;
    background-color: transparent;
  }

  .connection-menu li.el-submenu {
    background: transparent;
    border-radius: var(--mac-radius-sm);
    box-shadow: none;
    transition: background-color .16s ease;
    overflow: hidden;
  }

  .connection-menu li.el-submenu:hover {
    box-shadow: none;
    transform: none;
    background: var(--mac-control);
  }

  .dark-mode .connection-menu li.el-submenu {
    background: transparent;
    box-shadow: none;
  }

  .dark-mode .connection-menu li.el-submenu:hover {
    background-color: #425057;
  }

  .connection-menu.menu-with-custom-color li.el-submenu {
    border-left: 3px solid var(--menu-color);
    border-radius: var(--mac-radius-sm);
    padding-left: 0;
  }

  .connection-menu .el-submenu__title {
    padding: 7px 9px;
    height: auto;
    line-height: normal;
    transition: all 0.3s ease;
  }

  .connection-menu .el-submenu__title:hover {
    background-color: transparent;
  }

  .dark-mode .connection-menu .el-submenu__title {
    color: #f1f5f9;
  }

  .dark-mode .connection-menu .el-submenu__title:hover {
    background-color: transparent;
  }

  .connection-menu .el-submenu__icon-arrow {
    right: 8px;
    transition: transform 0.2s ease;
  }

  .dark-mode .connection-menu .el-submenu__icon-arrow {
    color: #94a3b8;
  }

  /*this error shows first*/
  .redis-on-error-message {
    z-index:9999 !important;
  }
</style>
