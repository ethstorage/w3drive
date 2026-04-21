import Vue from 'vue';
// import the library
import Element from 'element-ui';
import AsyncComputed from 'vue-async-computed';
import Buefy from 'buefy';
import 'buefy/dist/buefy.css';

import App from './App.vue'
import router from './router';
import store from './store';

import 'element-ui/lib/theme-chalk/index.css';
import './assets/css/all.css';

import { Buffer } from 'buffer';
window.Buffer = Buffer;

Vue.use(Element)
Vue.use(AsyncComputed, {
  default: 0
});
Vue.use(Buefy);

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')

