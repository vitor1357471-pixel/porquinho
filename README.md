# Porquinho Financeiro

Arquivos: index.html, style.css, app.js, firebase-config.js, database.rules.json.

## Ativar as contas (Firebase)
1. No console do Firebase, crie um projeto e um app Web; copie a config para `firebase-config.js`.
2. Authentication > Método de login: ative E-mail/senha (e Google, se quiser o botão).
3. Realtime Database > criar banco; em Regras, cole o conteúdo de `database.rules.json`.
4. Authentication > Configurações > Domínios autorizados: adicione o domínio do site.
5. Suba todos os arquivos na hospedagem (HTTPS). O site precisa de `type="module"`, então não abra por file://; use um servidor local ou o domínio.

Sem preencher a config, o site funciona em modo local (dados só no navegador).
