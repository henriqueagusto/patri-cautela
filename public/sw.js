// Service worker mínimo: existe para o PATRI poder ser instalado como app no
// tablet e no celular. Não guarda cache — os dados vêm sempre do servidor,
// então ninguém vê um equipamento "disponível" que já saiu.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
