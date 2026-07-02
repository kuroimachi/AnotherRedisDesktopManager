<template>
  <el-container class="wrap-container" spellcheck="false">
    <!-- left aside draggable container -->
    <div class="aside-drag-container" :style="{width: sideWidth + 'px'}">
      <!-- connections -->
      <el-aside class="aside-connection">
        <Aside></Aside>
      </el-aside>

      <!-- drag area -->
      <div id="drag-resize-container">
        <div id="drag-resize-pointer"></div>
      </div>
    </div>

    <!-- right main container -->
    <el-container class='right-main-container'>
      <!-- tab container -->
      <el-main class='main-tabs-container'>
        <Tabs></Tabs>
      </el-main>
    </el-container>

    <UpdateCheck></UpdateCheck>
  </el-container>
</template>

<script>
import Aside from '@/Aside';
import Tabs from '@/components/Tabs';
import UpdateCheck from '@/components/UpdateCheck';
import addon from './addon';

export default {
  name: 'App',
  data() {
    return {
      sideWidth: 265,
    };
  },
  created() {
    this.$bus.$on('reloadSettings', () => {
      addon.reloadSettings();
    });

    // restore side bar width
    this.restoreSideBarWidth();
  },
  components: { Aside, Tabs, UpdateCheck },
  methods: {
    bindSideBarDrag() {
      const that = this;
      const dragPointer = document.getElementById('drag-resize-pointer');

      function mousemove(e) {
        const mouseX = e.x;
        const dragSideWidth = mouseX - 17;

        if ((dragSideWidth > 200) && (dragSideWidth < 1500)) {
          that.sideWidth = dragSideWidth;
        }
      }

      function mouseup(e) {
        document.documentElement.removeEventListener('mousemove', mousemove);
        document.documentElement.removeEventListener('mouseup', mouseup);

        // store side bar with
        localStorage.sideWidth = that.sideWidth;
      }

      dragPointer.addEventListener('mousedown', (e) => {
        e.preventDefault();

        document.documentElement.addEventListener('mousemove', mousemove);
        document.documentElement.addEventListener('mouseup', mouseup);
      });
    },
    restoreSideBarWidth() {
      const { sideWidth } = localStorage;
      sideWidth && (this.sideWidth = sideWidth);
    },
  },
  mounted() {
    setTimeout(() => {
      this.$bus.$emit('update-check');
    }, 2000);

    this.bindSideBarDrag();
    // addon init setup
    addon.setup();
  },
};
</script>

<style type="text/css">
html {
  height: 100%;
}
:root {
  --ui-primary: #1677ff;
  --ui-primary-hover: #4096ff;
  --ui-text: #1f2937;
  --ui-text-secondary: #606266;
  --ui-text-muted: #909399;
  --ui-border: #e5e7eb;
  --ui-border-strong: #dcdfe6;
  --ui-bg: #f5f7fb;
  --ui-surface: #fff;
  --ui-hover: #eef5ff;
  --ui-selected: #e6f0ff;
  --ui-dark-bg: #263238;
  --ui-dark-surface: #324148;
  --ui-dark-hover: #40515a;
  --ui-dark-border: #4b5d66;
}
body {
  height: 100%;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;

  /*fix body scroll-y caused by tooltip in table*/
  overflow: hidden;
  color: var(--ui-text);
  background: var(--ui-bg);
}
.dark-mode {
  color: #f1f5f9;
  background: var(--ui-dark-bg);
}

button, input, textarea, .vjs__tree {
  font-family: inherit !important;
}
a {
  color: var(--ui-primary);
}


/*fix el-select bottom scroll bar*/
.el-scrollbar__wrap {
  overflow-x: hidden;
}

/*scrollbar style start*/
::-webkit-scrollbar {
  width: 8px;
}
/*track*/
::-webkit-scrollbar-track {
  background: #eef1f6;
  border-radius: 4px;
}
.dark-mode ::-webkit-scrollbar-track {
  background: #425057;
}
/*track hover*/
::-webkit-scrollbar-track:hover {
  background: #e6eaf0;
}
.dark-mode ::-webkit-scrollbar-track:hover {
  background: #495961;
}
/*thumb*/
::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background: #c8d0da;
}
.dark-mode ::-webkit-scrollbar-thumb {
  background: #5a6f7a;
}
/*thumb hover*/
::-webkit-scrollbar-thumb:hover {
  background: #9aa6b2;
}
.dark-mode ::-webkit-scrollbar-thumb:hover {
  background: #6a838f;
}
/*scrollbar style end*/

/*list index*/
li .list-index {
  color: #828282;
  /*font-size: 80%;*/
  user-select: none;
  margin-right: 10px;
  min-width: 28px;
}
.dark-mode li .list-index {
  color: #adacac;
}

.wrap-container {
  height: 100%;
  background: var(--mac-bg);
}
.aside-drag-container {
  position: relative;
  user-select: none;
  background: var(--mac-sidebar);
  backdrop-filter: saturate(180%) blur(24px);
  /*max-width: 50%;*/
}
.aside-connection {
  height: 100%;
  width: 100% !important;
  border-right: 1px solid var(--mac-separator);
  overflow: hidden;
  background: var(--ui-surface);
}
.dark-mode .aside-connection {
  border-right-color: var(--ui-dark-border);
  background: var(--ui-dark-bg);
}
/*fix right container imdraggable*/
.right-main-container {
  width: 10%;
}
.right-main-container .main-tabs-container {
  overflow-y: hidden;
  padding-top: 0px;
  padding: 0;
  background: var(--mac-surface-solid);
}

.el-message-box .el-message-box__message {
  word-break: break-all;
  overflow-y: auto;
  max-height: 80vh;
}

#drag-resize-container {
  position: absolute;
  /*height: 100%;*/
  width: 10px;
  right: -5px;
  top: 0px;
}
#drag-resize-pointer {
  position: fixed;
  height: 100%;
  width: 10px;
  cursor: col-resize;
}
#drag-resize-pointer::after {
  content: "";
  display: inline-block;
  width: 2px;
  height: 20px;
  border: 0;
  border-radius: 2px;
  background: var(--mac-border);

  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  margin: auto;
}
.dark-mode #drag-resize-pointer::after {
  border-left: 1px solid #7f8f99;
  border-right: 1px solid #7f8f99;
}

@keyframes rotate {
  to{ transform: rotate(360deg); }
}

/*vxe-table dark-mode color*/
html .dark-mode {
  --vxe-ui-table-header-background-color: #273239 !important;
  --vxe-ui-layout-background-color: #273239 !important;
  --vxe-ui-table-row-striped-background-color: #3b4b54 !important;
  --vxe-ui-table-row-hover-background-color: #3b4b54 !important;
  --vxe-ui-table-row-hover-striped-background-color: #50646f !important;
  /*border color*/
  --vxe-ui-table-border-color: #7f8ea5 !important;
  /*font color*/
  --vxe-ui-font-color: #f3f3f4 !important;
  --vxe-ui-table-header-font-color: #f3f3f4 !important;
}
</style>
