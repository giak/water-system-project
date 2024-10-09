import Nora from '@primevue/themes/nora';
import 'primeicons/primeicons.css';
import PrimeVue from 'primevue/config';
import { createApp } from 'vue';
import './assets/main.scss';
import App from './presentation/App.vue';
import router from './presentation/router';

const app = createApp(App);
app.use(PrimeVue, {
  theme: {
    preset: Nora,
    options: {},
  },
  ripple: true,
});
app.use(router);

app.mount('#app');
