import App from '@presentation/App.vue';
import { createApp } from 'vue';
import './assets/main.scss';
import router from './presentation/router';

const app = createApp(App);
app.use(router);

app.mount('#app');
