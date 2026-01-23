<template>
  <div class="connections-wrap">
    <!-- search connections input -->
    <div v-if="connections.length>=filterEnableNum" class="filter-input">
      <el-input
        v-model="filterMode"
        suffix-icon="el-icon-search"
        :placeholder="$t('message.search_connection')"
        clearable
        size="mini">
      </el-input>
    </div>

    <!-- connections list -->
    <div class="connections-list">
      <!-- grouped connections -->
      <div v-if="groupedConnections.length > 0">
        <div
          v-for="group in groupedConnections"
          :key="group.groupName"
          class="connection-group"
        >
          <!-- group header with toggle -->
          <div class="group-header" @click="toggleGroup(group.groupName)">
            <el-collapse-transition>
              <i
                class="group-toggle-icon"
                :class="{ 'el-icon-arrow-down': group.expanded, 'el-icon-arrow-right': !group.expanded }"
              ></i>
            </el-collapse-transition>
            <span class="group-name">{{ group.groupName || $t('message.ungrouped') }}</span>
            <span class="group-count">({{ group.connections.length }})</span>
          </div>

          <!-- group connections -->
          <el-collapse-transition>
            <div v-show="group.expanded" class="group-connections">
              <ConnectionWrapper
                v-for="(item, index) in group.connections"
                :key="item.key ? item.key : item.connectionName"
                :index="index"
                :globalSettings="globalSettings"
                :config='item'>
              </ConnectionWrapper>
            </div>
          </el-collapse-transition>
        </div>
      </div>

      <!-- fallback for no connections -->
      <div v-else-if="connections.length === 0" class="no-connections">
        {{ $t('message.no_connections') }}
      </div>
    </div>

    <ScrollToTop parentNum='1' :posRight='false'></ScrollToTop>
  </div>
</template>

<script type="text/javascript">
import storage from '@/storage';
import ConnectionWrapper from '@/components/ConnectionWrapper';
import ScrollToTop from '@/components/ScrollToTop';
import Sortable from 'sortablejs';


export default {
  data() {
    return {
      connections: [],
      globalSettings: this.$storage.getSetting(),
      filterEnableNum: 4,
      filterMode: '',
      expandedGroups: {}, // track expanded groups using object for reactivity
    };
  },
  components: { ConnectionWrapper, ScrollToTop },
  created() {
    this.$bus.$on('refreshConnections', () => {
      this.initConnections();
    });
    this.$bus.$on('reloadSettings', (settings) => {
      this.globalSettings = settings;
    });
  },
  computed: {
    filteredConnections() {
      if (!this.filterMode) {
        return this.connections;
      }

      return this.connections.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(this.filterMode.toLowerCase());
        const groupMatch = item.group && item.group.toLowerCase().includes(this.filterMode.toLowerCase());
        return nameMatch || groupMatch;
      });
    },

    groupedConnections() {
      // Group connections by group name
      const groups = {};
      
      this.filteredConnections.forEach(conn => {
        const groupName = conn.group || '';
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(conn);
      });
      
      // Convert to array and sort
      return Object.keys(groups)
        .sort()
        .map(groupName => ({
          groupName,
          connections: groups[groupName],
          expanded: this.expandedGroups[groupName] || false
        }));
    },
  },
  methods: {
    initConnections() {
      const connections = storage.getConnections(true);
      const slovedConnections = [];
      // this.connections = [];

      for (const item of connections) {
        item.connectionName = storage.getConnectionName(item);
        // fix history bug, prevent db into config
        delete item.db;
        slovedConnections.push(item);
      }

      this.connections = slovedConnections;
    },

    toggleGroup(groupName) {
      this.$set(this.expandedGroups, groupName, !this.expandedGroups[groupName]);
    },

    sortOrder() {
      const dragWrapper = document.querySelector('.connections-list');
      Sortable.create(dragWrapper, {
        handle: '.el-submenu__title',
        animation: 400,
        direction: 'vertical',
        onEnd: (e) => {
          const { newIndex } = e;
          const { oldIndex } = e;
          // change in connections
          const currentRow = this.connections.splice(oldIndex, 1)[0];
          this.connections.splice(newIndex, 0, currentRow);
          // store
          this.$storage.reOrderAndStore(this.connections);
        },
      });
    },
  },
  mounted() {
    this.initConnections();
    this.sortOrder();
  },
};
</script>

<style type="text/css">
  .connections-wrap {
    height: calc(100vh - 59px);
    overflow-y: auto;
    margin-top: 11px;
  }
  .connections-wrap .filter-input {
    padding-right: 13px;
    margin-bottom: 4px;
  }
  /* set drag area min height, target to the end will be correct */
  .connections-wrap .connections-list {
    min-height: calc(100vh - 110px);
  }

  /* Group styles */
  .connections-list .connection-group {
    margin-bottom: 8px;
    background-color: transparent;
  }
  
  .group-header {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background-color: #f0f2f5;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
    user-select: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .dark-mode .group-header {
    background-color: #1f2937;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
  
  .group-header:hover {
    background-color: #e6e8eb;
  }
  
  .dark-mode .group-header:hover {
    background-color: #374151;
  }
  
  .group-toggle-icon {
    font-size: 14px;
    margin-right: 10px;
    transition: transform 0.2s ease;
    color: #606266;
  }
  
  .dark-mode .group-toggle-icon {
    color: #9ca3af;
  }
  
  .group-name {
    flex: 1;
    font-size: 14px;
    color: #303133;
  }
  
  .dark-mode .group-name {
    color: #e5e7eb;
  }
  
  .group-count {
    font-size: 12px;
    color: #909399;
    margin-left: 8px;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 2px 8px;
    border-radius: 10px;
  }
  
  .dark-mode .group-count {
    color: #9ca3af;
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .group-connections {
    margin-left: 16px;
    margin-top: 6px;
    padding-left: 16px;
    border-left: 2px solid #e4e7ed;
    background-color: transparent;
  }
  
  .dark-mode .group-connections {
    border-left-color: #374151;
  }

  .no-connections {
    padding: 20px;
    text-align: center;
    color: #909399;
  }
</style>
