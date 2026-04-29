<template>
  <transition name="bounce">
    <div class="to-top-container" :style='style' @click="scrollToTop" v-if="toTopShow">
      <i class="el-icon-to-top el-icon-arrow-up"></i>
    </div>
  </transition>
</template>

<script type="text/javascript">
export default {
  data() {
    return {
      toTopShow: false,
      scrollTop: 0,
      realDom: null,
      minShowHeight: 500,
    };
  },
  computed: {
    style() {
      const style = { right: '50px' };

      if (!this.posRight) {
        style.right = 'inherit';
      }

      return style;
    },
  },
  props: {
    parentNum: { default: 3 },
    posRight: { default: true },
  },
  methods: {
    handleScroll() {
      this.scrollTop = this.realDom.scrollTop;
      this.toTopShow = (this.scrollTop > this.minShowHeight);
    },
    scrollToTop() {
      let timer = null;
      const that = this;

      cancelAnimationFrame(timer);

      timer = requestAnimationFrame(function fn() {
        const nowTop = that.realDom.scrollTop;

        // to top already
        if (nowTop <= 0) {
          cancelAnimationFrame(timer);
          that.toTopShow = false;
        } else if (nowTop < 50) {
          that.realDom.scrollTop -= 5;
          timer = requestAnimationFrame(fn);
        } else {
          that.realDom.scrollTop -= nowTop * 0.2;
          timer = requestAnimationFrame(fn);
        }
      });
    },
  },
  mounted() {
    this.$nextTick(() => {
      let vueCom = this.$parent;

      for (let i = 0; i < this.parentNum - 1; i++) {
        if (!vueCom.$parent) {
          return;
        }

        vueCom = vueCom.$parent;
      }

      this.realDom = vueCom.$el;

      if (!this.realDom) {
        return;
      }
      this.realDom.addEventListener('scroll', this.handleScroll, true);
    });
  },
  destroyed() {
    this.realDom.removeEventListener('scroll', this.handleScroll, true);
  },
};
</script>

<style type="text/css">
  .to-top-container {
    background-color: rgba(31, 41, 55, .72);
    position: fixed;
    /*right: 50px;*/
    bottom: 30px;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity .2s ease, background-color .2s ease;
    box-shadow: none;
    opacity: .55;
    z-index: 10000;
  }
  .to-top-container:hover{
    opacity: 1;
    background-color: var(--ui-primary);
  }
  .to-top-container .el-icon-to-top{
    color: #fff;
    display: block;
    line-height: 40px;
    text-align: center;
    font-size: 18px;
  }
  .bounce-enter-active {
    animation: bounce-in .5s;
  }
  .bounce-leave-active {
    animation: bounce-in .5s reverse;
  }
  @keyframes bounce-in {
    0% {
      transform: scale(0);
    }
    50% {
      transform: scale(1.5);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
