import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './ui/App.svelte';
import './style.css';

registerSW({ immediate: true });

mount(App, { target: document.getElementById('app')! });
