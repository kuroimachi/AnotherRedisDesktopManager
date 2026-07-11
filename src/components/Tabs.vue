<template>
  <div>
    <el-tabs ref="tabs" class='tabs-container' v-model="selectedTabName" type="card" closable @tab-remove="removeTab" @tab-click="tabClick">
      <el-tab-pane
        v-for="(item) in tabs"
        :key="item.name"
        :name="item.name">
        <span slot="label" class="tab-label" :title="item.title">
          <i :class="iconNameByComponent(item.component)"></i>
          <span class="tab-label-text">{{ item.label }}</span>
        </span>

        <Status v-if="item.component === 'status'" :client='item.client' class='tab-content-wrappe' :hotKeyScope='item.name'></Status>
        <CliTab v-else-if="item.component === 'cli'" :client='item.client' class='tab-content-wrappe' :hotKeyScope='item.name'></CliTab>
        <DeleteBatch v-else-if="item.component === 'delbatch'" :client='item.client' :rule="item.rule" class='tab-content-wrappe' :hotKeyScope='item.name'></DeleteBatch>
        <MemoryAnalysis v-else-if="item.component === 'memory'" :client='item.client' :pattern="item.pattern" class='tab-content-wrappe' :hotKeyScope='item.name'></MemoryAnalysis>
        <SlowLog v-else-if="item.component === 'slowlog'" :client='item.client' class='tab-content-wrappe' :hotKeyScope='item.name'></SlowLog>
        <KeyDetail v-else :client='item.client' :redisKey="item.redisKey" :keyType="item.keyType" class='tab-content-wrappe' :hotKeyScope='item.name'></KeyDetail>
      </el-tab-pane>
    </el-tabs>

    <div ref="tabContextMenu" class="tabs-context-menu">
      <ul>
        <li @click="removeTab(preTabId)">{{ $t('message.close') }}</li>
        <li @click="removeOtherTabs('other')">{{ $t('message.close_other') }}</li>
        <li @click="removeOtherTabs('right')">{{ $t('message.close_right') }}</li>
        <li @click="removeOtherTabs('left')">{{ $t('message.close_left') }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
import Status from '@/components/Status';
import CliTab from '@/components/CliTab';
import KeyDetail from '@/components/KeyDetail';
import DeleteBatch from '@/components/DeleteBatch';
import MemoryAnalysis from '@/components/MemoryAnalysis';
import SlowLog from '@/components/SlowLog';

export default {
  data() {
    return {
      selectedTabName: '',
      tabs: [],
    };
  },
  components: {
    Status, KeyDetail, CliTab, DeleteBatch, MemoryAnalysis, SlowLog,
  },
  watch: {
    selectedTabName(value) {
      // for mousewheel toggle tabs
      value && this.$shortcut.setScope(value);
    },
  },
  created() {
    // key clicked
    this.$bus.$on('clickedKey', (client, key, newTab = false) => {
      this.addKeyTab(client, key, newTab);
    });

    // open status tab
    this.$bus.$on('openStatus', (client, tabName) => {
      this.addStatusTab(client, tabName);
    });

    // open cli tab
    this.$bus.$on('openCli', (client, tabName) => {
      this.addCliTab(client, tabName);
    });

    // open delete batch tab
    this.$bus.$on('openDelBatch', (client, tabName, rule = {}) => {
      this.addDelBatchTab(client, tabName, rule);
    });

    // open memory anaysis tab
    this.$bus.$on('memoryAnalysis', (client, tabName, pattern = '') => {
      this.addMemoryTab(client, tabName, pattern);
    });

    // open slowlog tab
    this.$bus.$on('slowLog', (client, tabName) => {
      this.addSlowLogTab(client, tabName);
    });

    // remove pre tab
    this.$bus.$on('removePreTab', () => {
      this.removeTab(this.selectedTabName);
    });

    // remove all tab
    this.$bus.$on('removeAllTab', (connectionName) => {
      // close all tabs
      if (!connectionName) {
        return this.tabs = [];
      }

      this.tabs = this.tabs.filter(tab => tab.client.options.connectionName != connectionName);

      // still tabs left, solve selecting which tab
      if (this.tabs.length) {
        // previous selected left, do not change
        const filteredTab = this.tabs.filter(tab => tab.name == this.selectedTabName);
        !filteredTab.length && (this.selectedTabName = this.tabs[0].name);
      }
    });
  },
  methods: {
    removeTab(removeName) {
      if (!removeName) {
        return;
      }

      const { tabs } = this;
      let nextSelectTab;

      if (this.selectedTabName == removeName) {
        tabs.forEach((tab, index) => {
          if (tab.name == removeName) {
            nextSelectTab = tabs[index + 1] || tabs[index - 1];
          }
        });
      }

      nextSelectTab && (this.selectedTabName = nextSelectTab.name);
      this.tabs = this.tabs.filter(tab => tab.name !== removeName);

      this.$shortcut.deleteScope(removeName);
      this.$shortcut.setScope(this.selectedTabName);
    },
    tabClick(tab, event) {
      this.$shortcut.setScope(this.selectedTabName);

      if (tab.$children && tab.$children[0] && (typeof tab.$children[0].tabClick === 'function')) {
        tab.$children[0].tabClick();
      }
    },
    addStatusTab(client, tabName, newTab = true) {
      const newTabItem = {
        name: `status_${tabName}`,
        label: this.$util.cutString(tabName),
        title: tabName,
        client,
        component: 'status',
      };

      this.addTab(newTabItem, newTab);
    },
    addCliTab(client, tabName, newTab = true) {
      const newTabItem = {
        name: `cli_${tabName}_${Math.random()}`,
        label: this.$util.cutString(tabName),
        title: tabName,
        client,
        component: 'cli',
      };

      this.addTab(newTabItem, newTab);
    },
    addDelBatchTab(client, tabName, rule = {}) {
      const newTabItem = {
        name: `del_batch_${tabName}_${Math.random()}`,
        label: this.$util.cutString(tabName),
        title: tabName,
        client,
        component: 'delbatch',
        rule,
      };

      this.addTab(newTabItem, true);
    },
    addMemoryTab(client, tabName, pattern = '') {
      const newTabItem = {
        name: `memory_analysis_${tabName}_${Math.random()}`,
        label: this.$util.cutString(tabName),
        title: tabName,
        client,
        component: 'memory',
        pattern,
      };

      this.addTab(newTabItem, true);
    },
    addSlowLogTab(client, tabName) {
      const newTabItem = {
        name: `slowlog_${tabName}_${Math.random()}`,
        label: this.$util.cutString(tabName),
        title: tabName,
        client,
        component: 'slowlog',
      };

      this.addTab(newTabItem, true);
    },
    addKeyTab(client, key, newTab = false) {
      client.type(key).then((type) => {
        // key not exists
        if (type === 'none') {
          this.$message.error({
            message: `${key} ${this.$t('message.key_not_exists')}`,
            duration: 1000,
          });

          return;
        }

        this.addTab(this.initKeyTabItem(client, key, type), newTab);
      }).catch((e) => {
        this.$message.error(`Type Error: ${e.message}`);
      });
    },
    initKeyTabItem(client, key, type) {
      const { cutString } = this.$util;
      const dbIndex = client.condition ? client.condition.select : 0;
      const { connectionName } = client.options;
      const keyStr = this.$util.bufToString(key);

      const label = `${cutString(keyStr)} | ${cutString(connectionName)} | DB${dbIndex}`;
      const name = `${keyStr} | ${connectionName} | DB${dbIndex}`;

      return {
        name,
        label,
        title: name,
        client,
        component: 'key',
        redisKey: key,
        keyType: type,
      };
    },
    addTab(newTabItem, newTab = false) {
      let exists = false;

      this.tabs.map((item) => {
        (item.name === newTabItem.name) && (exists = true);
      });

      // if exists, select directly
      if (exists) {
        this.selectedTabName = newTabItem.name;
        this.$shortcut.setScope(this.selectedTabName);
        return;
      }

      // new tab append to tail
      if (newTab) {
        this.tabs.push(newTabItem);
      }

      // open tab on previous selected key tab
      // or append to tail if previous tab is cli\status
      else {
        let replaced = false;

        this.tabs = this.tabs.map((item) => {
          // replace the selected tab with new tab item
          if (item.name === this.selectedTabName && item.component === 'key') {
            replaced = true;
            return newTabItem;
          }

          return item;
        });

        // pre tab is preserve tab, append to tail
        !replaced && (this.tabs.push(newTabItem));
      }

      this.selectedTabName = newTabItem.name;
      this.$shortcut.setScope(this.selectedTabName);
    },
    iconNameByComponent(component) {
      const map = {
        cli: 'fa fa-terminal',
        status: 'el-icon-info',
        delbatch: 'el-icon-delete',
        memory: 'fa fa-table',
        slowlog: 'fa fa-hourglass-start',
      };

      const icon = map[component];

      return icon || 'fa fa-key';
    },
    initShortcut() {
      this.$shortcut.bind('ctrl+w, ⌘+w', () => {
        const closeWindow = !this.tabs.length;
        this.removeTab(this.selectedTabName);

        return closeWindow;
      });
    },
    bindTabEvents() {
      const tabs = this.$refs.tabs.$el.querySelector('.el-tabs__header');
      tabs && tabs.addEventListener('contextmenu', this.openContextMenu);
      tabs && tabs.addEventListener('mousewheel', this.wheelToggleTabs);
    },
    wheelToggleTabs(event) {
      let index = this.tabs.findIndex(item => item.name === this.selectedTabName);

      // up: deltaY < 0
      event.deltaY < 0 ? index-- : index++;

      if (!this.tabs[index]) {
        return;
      }

      this.selectedTabName = this.tabs[index].name;
    },
    openContextMenu(event) {
      this.preTabId = '';
      this.hideAllMenus();

      const items = this.$refs.tabs.$el.querySelectorAll('.el-tabs__header .el-tabs__item');

      if (!items.length) {
        return;
      }

      for (const item of items) {
        if (item.contains(event.srcElement)) {
          this.preTabId = item.id.substr(4); // remove prefix "tab-"
        }
      }

      if (!this.preTabId) {
        return;
      }

      // show menu
      const menu = this.$refs.tabContextMenu;
      menu.style.left = `${event.clientX}px`;
      menu.style.top = `${event.clientY}px`;
      menu.style.display = 'block';

      document.addEventListener('click', this.hideAllMenus, { once: true });
    },
    hideAllMenus() {
      const menus = document.querySelectorAll('.tabs-context-menu');

      if (menus.length === 0) {
        return;
      }

      for (const menu of menus) {
        menu.style.display = 'none';
      }
    },
    removeOtherTabs(type = 'right') {
      // find index of current contextMenu
      const index = this.tabs.findIndex(item => item.name === this.preTabId);

      if (index === -1) {
        return;
      }

      switch (type) {
        case 'right': {
          this.tabs = this.tabs.slice(0, index + 1);
          break;
        }
        case 'left': {
          this.tabs = this.tabs.slice(index);
          break;
        }
        case 'other': {
          this.tabs = this.tabs.filter(item => item.name === this.preTabId);
          break;
        }
      }

      // change select tab only after current select is removed
      const selectedTabExists = !!this.tabs.find(item => item.name === this.selectedTabName);
      !selectedTabExists && (this.selectedTabName = this.preTabId);
    },
  },
  mounted() {
    this.initShortcut();
    this.bindTabEvents();
  },
};
</script>

<style type="text/css">
  .tabs-container > .el-tabs__header {
    height: 43px; margin: 0; padding: 8px 12px 0;
    background: var(--mac-sidebar); border-bottom: 1px solid var(--mac-separator);
  }
  .tabs-container.el-tabs--card > .el-tabs__header .el-tabs__nav {
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  /*tabs header height*/
  .tabs-container .el-tabs__item {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    height: 34px;
    line-height: 34px;
    max-width: 260px; margin: 0 1px;
    color: var(--mac-text-secondary); background: transparent;
    border: 0 !important; border-radius: 6px 6px 0 0; font-size: 12px;
    transition: background-color .16s ease, color .16s ease;
  }
  .tabs-container .el-tabs__item .tab-label {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    overflow: hidden;
  }
  .tabs-container .el-tabs__item .tab-label > i,
  .tabs-container .el-tabs__item .el-icon-close {
    flex: 0 0 auto;
  }
  .tabs-container .el-tabs__item .tab-label-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tabs-container .el-tabs__item:hover {
    color: var(--mac-text);
    background: var(--mac-control-hover);
  }
  .tabs-container .el-tabs__item.is-active {
    color: var(--mac-text);
    background: var(--mac-surface-solid);
    box-shadow: 0 0 0 1px var(--mac-border), 0 1px 0 var(--mac-surface-solid);
  }
  .tabs-container .el-tabs__nav-next, .tabs-container .el-tabs__nav-prev {
    line-height: 34px;
  }
  /*height end*/

  .tab-content-wrappe {
    height: calc(100vh - 44px);
    overflow-x: hidden;
    overflow-y: auto;
    /*padding-left: 5px;*/
    padding: 14px 18px 0; box-sizing: border-box; background: var(--mac-bg);
  }

  /*tabs context menu*/
  .tabs-context-menu {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    padding: 4px 0;
    z-index: 99999;
    border-radius: var(--mac-radius); border: 1px solid var(--mac-border);
    background: var(--mac-surface-solid); box-shadow: var(--mac-shadow-popover);
  }
  .dark-mode .tabs-context-menu {
    border-color: #4b5d66;
    background: #36434a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .35);
  }

  .tabs-context-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .tabs-context-menu ul li:not(:last-child) {
    border-bottom: 1px solid var(--mac-separator);
  }

  .tabs-context-menu ul li {
    font-size: 14px;
    padding: 7px 12px;
    cursor: pointer;
    color: var(--mac-text);
  }
  .dark-mode .tabs-context-menu ul li {
    color: #f1f5f9;
  }

  .tabs-context-menu ul li:hover {
    background: var(--mac-accent-soft);
  }
  .dark-mode .tabs-context-menu ul li:hover {
    background: #50616b;
  }
  /*context menu end*/
</style>
