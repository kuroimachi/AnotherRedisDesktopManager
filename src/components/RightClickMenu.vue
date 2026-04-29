<template>
  <div @contextmenu.prevent.stop="show($event)">
    <!-- default slot -->
    <slot name="default"></slot>
    <!-- right menu -->
    <div class="qii404-vue-right-menu" ref="menu">
      <ul>
        <li v-for="item of items" @click.stop="clickItem($event, item)">{{ item.name }}</li>
      </ul>
    </div>
  </div>
</template>

<script type="text/javascript">
export default {
  data() {
    return {
      triggerEvent: null,
    };
  },
  props: ['items', 'clickValue'],
  methods: {
    show($event) {
      this.triggerEvent = $event;
      this.showMenus($event.clientX, $event.clientY);
      document.addEventListener('click', this.removeMenus);
    },
    showMenus(x, y) {
      this.hideAllMenus();

      const { menu } = this.$refs;

      menu.style.left = `${x}px`;
      menu.style.top = `${y - 5}px`;
      menu.style.display = 'block';
    },
    clickItem($event, item) {
      if (item.click) {
        item.click(this.clickValue, this.triggerEvent, $event);
      }

      this.removeMenus();
      this.triggerEvent = null;
    },
    removeMenus() {
      document.removeEventListener('click', this.removeMenus);
      this.hideAllMenus();
    },
    hideAllMenus() {
      const menus = document.querySelectorAll('.qii404-vue-right-menu');

      if (menus.length === 0) {
        return;
      }

      for (const menu of menus) {
        menu.style.display = 'none';
      }
    },
  },
};
</script>

<style type="text/css">
  .qii404-vue-right-menu {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    padding: 4px 0;
    z-index: 99999;
    overflow: hidden;
    border-radius: 4px;
    border: 1px solid var(--ui-border);
    background: var(--ui-surface);
    box-shadow: 0 6px 18px rgba(31, 41, 55, .12);
  }
  .dark-mode .qii404-vue-right-menu {
    border-color: #4b5d66;
    background: #36434a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .35);
  }

  .qii404-vue-right-menu ul {
    list-style: none;
    padding: 0;
  }
  .qii404-vue-right-menu ul li:not(:last-child) {
    border-bottom: 0;
  }

  .qii404-vue-right-menu ul li {
    font-size: 14px;
    padding: 7px 12px;
    cursor: pointer;
    color: var(--ui-text);
  }
  .dark-mode .qii404-vue-right-menu ul li {
    color: #f1f5f9;
  }

  .qii404-vue-right-menu ul li:hover {
    background: var(--ui-hover);
  }
  .dark-mode .qii404-vue-right-menu ul li:hover {
    background: #50616b;
  }
</style>
