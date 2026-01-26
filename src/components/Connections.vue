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
      <div
        v-for="group in groupedConnections"
        :key="group.groupName"
        class="connection-group"
        v-if="groupedConnections.length > 0"
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
      
      // Get all group names with their first connection's order
      const groupOrders = [];
      Object.keys(groups).forEach(groupName => {
        const group = groups[groupName];
        // Find the minimum order in the group
        const minOrder = Math.min(...group.map(conn => conn.order || 0));
        groupOrders.push({ groupName, order: minOrder });
      });
      
      // Sort groups by their minimum order
      groupOrders.sort((a, b) => {
        return a.order - b.order;
      });
      
      // Convert to array and sort connections within each group
      return groupOrders.map(item => ({
        groupName: item.groupName,
        connections: groups[item.groupName].sort((a, b) => {
          // First sort by order
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          // Then sort by name if order is not available
          return a.name.localeCompare(b.name);
        }),
        expanded: this.expandedGroups[item.groupName] || false
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
      // Re-initialize sortable after group toggle to ensure it works correctly
      this.$nextTick(() => {
        this.sortOrder();
      });
    },

    sortOrder() {
      // Initialize sortable for groups
      const groupsWrapper = document.querySelector('.connections-list');
      Sortable.create(groupsWrapper, {
        handle: '.group-header',
        animation: 400,
        direction: 'vertical',
        onEnd: (e) => {
          // Get all groups
          const allGroups = this.groupedConnections.map(g => g.groupName);
          // Get current group name
          const currentGroupName = allGroups[e.oldIndex];
          // Remove from old position
          allGroups.splice(e.oldIndex, 1);
          // Insert at new position
          allGroups.splice(e.newIndex, 0, currentGroupName);
          
          // Reorder connections based on new group order
          const reorderedConnections = [];
          allGroups.forEach(groupName => {
            const group = this.groupedConnections.find(g => g.groupName === groupName);
            if (group) {
              reorderedConnections.push(...group.connections);
            }
          });
          
          // Update connections and store
          this.connections = reorderedConnections;
          this.$storage.reOrderAndStore(this.connections);
        },
      });
      
      // Initialize sortable for connections within each group
      this.$nextTick(() => {
        const groupConnections = document.querySelectorAll('.group-connections');
        groupConnections.forEach(group => {
          Sortable.create(group, {
            handle: '.el-submenu__title',
            animation: 400,
            direction: 'vertical',
            onEnd: (e) => {
              // Get the group name
              const groupElement = group.closest('.connection-group');
              const groupHeader = groupElement.querySelector('.group-name');
              const groupName = groupHeader.textContent.trim() || '';
              
              // Find the group in groupedConnections
              const groupObj = this.groupedConnections.find(g => g.groupName === groupName);
              if (groupObj) {
                // Reorder connections within the group
                const currentConn = groupObj.connections.splice(e.oldIndex, 1)[0];
                groupObj.connections.splice(e.newIndex, 0, currentConn);
                
                // Rebuild connections array
                const reorderedConnections = [];
                this.groupedConnections.forEach(g => {
                  reorderedConnections.push(...g.connections);
                });
                
                // Update connections and store
                this.connections = reorderedConnections;
                this.$storage.reOrderAndStore(this.connections);
              }
            },
          });
        });
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
    margin-top: 16px;
    padding: 0 16px;
  }
  
  .connections-wrap .filter-input {
    margin-bottom: 16px;
  }
  
  .connections-wrap .filter-input .el-input {
    border-radius: 8px;
    border: 1px solid #e1e5e9;
    transition: all 0.3s ease;
  }
  
  .connections-wrap .filter-input .el-input:hover {
    border-color: #409EFF;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
  }
  
  .connections-wrap .filter-input .el-input:focus-within {
    border-color: #409EFF;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  }
  
  .dark-mode .connections-wrap .filter-input .el-input {
    border-color: #374151;
    background-color: #1f2937;
  }
  
  .dark-mode .connections-wrap .filter-input .el-input:hover {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
  }
  
  .dark-mode .connections-wrap .filter-input .el-input:focus-within {
    border-color: #60a5fa;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3);
  }
  
  /* set drag area min height, target to the end will be correct */
  .connections-wrap .connections-list {
    min-height: calc(100vh - 150px);
  }

  /* Group styles */
  .connections-list .connection-group {
    margin-bottom: 16px;
    background-color: transparent;
  }
  
  .group-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background-color: #ffffff;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
    user-select: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  
  .dark-mode .group-header {
    background-color: #2d3748;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  
  .group-header:hover {
    background-color: #f8fafc;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }
  
  .dark-mode .group-header:hover {
    background-color: #374151;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  
  .group-toggle-icon {
    font-size: 16px;
    margin-right: 12px;
    transition: transform 0.3s ease, color 0.3s ease;
    color: #64748b;
  }
  
  .dark-mode .group-toggle-icon {
    color: #94a3b8;
  }
  
  .group-name {
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
  }
  
  .dark-mode .group-name {
    color: #f1f5f9;
  }
  
  .group-count {
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    margin-left: 12px;
    background-color: #f1f5f9;
    padding: 4px 10px;
    border-radius: 16px;
    transition: all 0.3s ease;
  }
  
  .dark-mode .group-count {
    color: #94a3b8;
    background-color: #374151;
  }
  
  .group-header:hover .group-count {
    background-color: #e2e8f0;
  }
  
  .dark-mode .group-header:hover .group-count {
    background-color: #4b5563;
  }
  
  .group-connections {
    margin-left: 0;
    margin-top: 12px;
    padding-left: 0;
    border-left: none;
    background-color: transparent;
  }
  
  .no-connections {
    padding: 40px 20px;
    text-align: center;
    color: #94a3b8;
    background-color: #f8fafc;
    border-radius: 8px;
    margin-top: 20px;
  }
  
  .dark-mode .no-connections {
    background-color: #2d3748;
    color: #64748b;
  }
  
  /* Scrollbar styling */
  .connections-wrap::-webkit-scrollbar {
    width: 8px;
  }
  
  .connections-wrap::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  
  .connections-wrap::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
    transition: background 0.3s ease;
  }
  
  .connections-wrap::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  
  .dark-mode .connections-wrap::-webkit-scrollbar-track {
    background: #1f2937;
  }
  
  .dark-mode .connections-wrap::-webkit-scrollbar-thumb {
    background: #374151;
  }
  
  .dark-mode .connections-wrap::-webkit-scrollbar-thumb:hover {
    background: #4b5563;
  }
</style>
