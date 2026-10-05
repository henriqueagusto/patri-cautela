# PATRI — servidor local no notebook (Windows)

O notebook passa a ser o servidor do PATRI. Ele guarda o banco, as fotos e
entrega as telas. Os outros computadores, celulares e tablets do mesmo Wi-Fi
abrem o sistema pelo endereço do notebook:

```
http://IP-DO-NOTEBOOK:3333
```

Funciona sem internet, desde que os aparelhos estejam na mesma rede.

```
NOTEBOOK (Windows)
├─ PostgreSQL ............ serviço do Windows, só atende o próprio notebook
├─ PATRI (porta 3333) .... telas + API + fotos, num endereço só
└─ C:\PATRI-dados
   ├─ uploads\ ........... fotos
   ├─ backups\ ........... cópias de segurança (uma por dia, automática)
   └─ logs\ .............. registro do servidor
```

O sistema é o mesmo: telas, regras, permissões e cautela não mudam. Muda só
onde ele roda.

> **O Render continua ligado até você conferir tudo aqui.** Nada deste guia
> apaga ou altera o que está lá. Atenção ao prazo: o banco gratuito do Render
> expira 30 dias depois de criado. Faça a parte 3 (trazer os dados) antes disso.

---

## Parte 1 — Instalar os programas (uma vez)

1. **Node.js** — baixe a versão **LTS** em nodejs.org e instale com as opções padrão.
2. **PostgreSQL** — baixe o instalador para Windows em postgresql.org/download/windows.
   - Versão: **igual ou mais nova** que a do banco no Render (veja no painel do
     Render, na página do banco). Na dúvida, instale a mais recente.
   - Durante a instalação ele pede uma **senha para o usuário `postgres`**.
     Anote: o passo 4 pede essa senha uma vez.
   - Porta: deixe **5432**. Não precisa do "Stack Builder" no final.
3. **O código do PATRI** — coloque a pasta do projeto em um lugar fixo, por
   exemplo `C:\patri`. Não mova depois de instalar.

✅ **Conferência:** abra o *Prompt de Comando* e digite `node -v`. Deve aparecer
um número de versão.

---

## Parte 2 — Instalar o PATRI

4. Abra a pasta `C:\patri\windows` e dê dois cliques em **`1-instalar.cmd`**.
   - Ele instala as dependências, compila as telas e o servidor, cria o banco
     `patri`, a pasta `C:\PATRI-dados` e o arquivo `server\.env`.
   - Quando pedir, digite a senha do `postgres` (a do passo 2).
   - Leva alguns minutos. No fim aparece **"Instalacao concluida"**.

   ✅ **Conferência:** existe a pasta `C:\PATRI-dados` com `uploads`, `backups` e `logs`.

5. Dê dois cliques em **`2-ativar-inicio-automatico.cmd`** e aceite o pedido de
   administrador. Ele:
   - cria a tarefa **PATRI**, que inicia o sistema junto com o Windows (sem
     precisar fazer login) e o reinicia se cair;
   - libera **só a porta 3333** no Firewall, **só para a rede local**;
   - deixa o PostgreSQL em início automático, com reinício se cair;
   - ajusta a energia: na tomada, não suspende nem hiberna, e fechar a tampa
     não desliga.

   ✅ **Conferência:** aparece **"PATRI no ar"** e o endereço para os outros
   aparelhos, algo como `http://192.168.1.50:3333`.

6. No próprio notebook, abra `http://localhost:3333`.
   - Instalação nova: entre com `admin@patri.local` / `patri123` e troque a senha
     em Cadastros → Usuários.
   - Se você vai trazer os dados do Render (parte 3), o login será o que você
     já usa lá.

---

## Parte 3 — Trazer os dados do Render

Faça isto **uma vez**, com o notebook na internet. No Render, este passo só lê.

7. No painel do Render, abra o banco PostgreSQL → **Connections** → copie a
   **External Database URL** (começa com `postgresql://`).
8. Pare o PATRI: dois cliques em `windows\parar.cmd`.
9. Abra o *Prompt de Comando* e rode (troque os dois endereços pelos seus):

   ```
   cd C:\patri\server
   npm run migrar-do-render -- --origem "COLE-AQUI-A-EXTERNAL-DATABASE-URL" --site "https://ENDERECO-DO-SEU-BACKEND.onrender.com"
   ```

   O que acontece:
   - a cópia do banco do Render fica guardada em `C:\PATRI-dados\backups\…-render`;
   - os dados entram no banco do notebook, tudo de uma vez — se der erro no
     meio, o banco local fica como estava;
   - o script compara as quantidades (equipamentos, pessoas, locais, cautelas,
     histórico, usuários) e diz se batem;
   - ele tenta baixar as fotos. **As que o Render já apagou não têm como
     voltar**: a lista fica em `fotos-nao-encontradas.txt` e elas precisam ser
     enviadas de novo pela tela do equipamento. No lugar delas o sistema mostra
     o ícone da categoria.

   ✅ **Conferência:** aparece **"Conferido: as quantidades batem com as do Render."**

10. Ajuste a estrutura do banco para esta versão (só acrescenta a coluna
    `arquivado` em locais; se houvesse risco de perda de dados, o comando recusaria):

    ```
    npm run db:push
    ```

11. Inicie de novo: dois cliques em `windows\iniciar.cmd`. Entre no sistema e
    confira equipamentos, pessoas, locais, cautelas e histórico.

Só depois de usar o notebook por alguns dias sem problema, desative o Render.

---

## Parte 4 — Acessar de outros aparelhos

**Descobrir o endereço:** dois cliques em `windows\status.cmd`. Ele mostra o
endereço, por exemplo `http://192.168.1.50:3333`. (Outra forma: `ipconfig` no
Prompt de Comando, linha "Endereço IPv4" do adaptador Wi-Fi.)

**Outro computador, celular ou tablet:** conecte no **mesmo Wi-Fi** e abra o
endereço no navegador. No celular, use "Adicionar à tela inicial" para virar um
atalho.

**Deixe o endereço fixo.** O roteador pode trocar o IP do notebook depois de
alguns dias, e aí o endereço muda. Peça a quem cuida da rede para **reservar o
IP do notebook** (reserva de DHCP). Sem isso, rode `status.cmd` para ver o
endereço novo.

**Se outro aparelho não abrir o sistema:**

| Sintoma | O que conferir |
| --- | --- |
| Abre no notebook, não abre em outro aparelho | O aparelho está no mesmo Wi-Fi? Rode `2-ativar-inicio-automatico.cmd` de novo (refaz a regra do Firewall). |
| Nenhum aparelho alcança o notebook, mesmo com tudo certo | Algumas redes (visitantes, institucionais) bloqueiam a conversa entre aparelhos ("isolamento de clientes"). Só quem administra a rede libera. |
| Não abre nem no notebook | `status.cmd` diz o que está parado. Veja a parte 6. |

---

## Parte 5 — Backup e restauração

**Automático:** todo dia, por volta do meio-dia, o PATRI copia banco, fotos e
configuração para `C:\PATRI-dados\backups`. Guarda os 14 últimos. Se o notebook
estava desligado na hora, faz assim que ligar.

**Manual:** dois cliques em `windows\backup.cmd`. Cópias manuais nunca são
apagadas sozinhas.

**Fora do notebook (importante):** os backups ficam no mesmo disco do sistema.
Se o disco estragar, vão junto. Uma vez por semana, copie para um pendrive ou
HD externo:

```
windows\backup.cmd E:\PATRI-backups
```

Cada backup é uma pasta com:

| Arquivo | O que é |
| --- | --- |
| `banco.dump` | todos os dados (equipamentos, pessoas, locais, cautelas, histórico, usuários, configurações) |
| `uploads\` | as fotos |
| `env.txt` | a configuração, **com a senha do banco e o segredo de login** — guarde com cuidado |

**Restaurar** (substitui o banco atual pelo do backup):

1. `windows\parar.cmd`
2. No Prompt de Comando:
   ```
   cd C:\patri\server
   npm run restaurar -- "C:\PATRI-dados\backups\NOME-DA-PASTA-DO-BACKUP"
   ```
   Ele mostra o que há hoje no banco, faz uma cópia de segurança do estado
   atual e só continua se você digitar `RESTAURAR`. Se falhar no meio, o banco
   fica como estava.
3. `npm run db:push` (caso o backup seja de uma versão mais antiga)
4. `windows\iniciar.cmd`

**Notebook novo ou formatado:** faça as partes 1 e 2, depois restaure o backup
mais recente como acima.

---

## Parte 6 — O que acontece se…

| Situação | O que o sistema faz | O que você faz |
| --- | --- | --- |
| O notebook reinicia (inclusive por atualização do Windows) | PostgreSQL e PATRI sobem sozinhos, antes de alguém fazer login. O PATRI espera o banco ficar pronto. | Nada. Em 1 a 2 minutos volta. |
| Falta energia | A bateria segura por um tempo. Se o notebook desligar, **ele não liga sozinho** quando a energia volta. | Ligar o notebook. O resto sobe sozinho. |
| O PATRI cai | É reiniciado em poucos segundos. Quem estava usando vê "Sem resposta do servidor" e a tela volta sozinha, sem pedir login de novo. | Nada. Se repetir, veja o log em `C:\PATRI-dados\logs`. |
| O PostgreSQL cai | O Windows reinicia o serviço. O PATRI reconecta sozinho. | Nada. Se não voltar: `services.msc` → serviço `postgresql…` → Iniciar. |
| O Wi-Fi cai | O sistema continua rodando no notebook. Os outros aparelhos voltam a acessar quando a rede voltar. | Conferir se o notebook reconectou ao Wi-Fi. |
| O endereço parou de funcionar | Provavelmente o IP do notebook mudou. | `status.cmd` mostra o endereço atual. Peça a reserva do IP. |

**Verificar se está funcionando:** `windows\status.cmd`. Mostra se o servidor
responde, se o banco está acessível, se as telas estão sendo entregues, quantas
fotos existem e quando foi o último backup. De outro aparelho, o endereço
`http://IP-DO-NOTEBOOK:3333/api/health` deve responder `{"ok":true,"banco":true}`.

**Para o notebook servir 24 horas:**

- mantenha na tomada;
- o Wi-Fi precisa estar marcado como "Conectar automaticamente";
- não deixe o Windows em "Suspender" manualmente — suspenso, o servidor para.

---

## Parte 7 — Atualizar o PATRI

Quando houver uma versão nova do código: substitua os arquivos da pasta
`C:\patri` (ou `git pull`) e dê dois cliques em **`windows\atualizar.cmd`**.
Ele faz backup, recompila, ajusta o banco sem apagar nada e reinicia.

`server\.env` e `C:\PATRI-dados` nunca são tocados por uma atualização.

---

## Referência

### Arquivos da pasta `windows`

| Arquivo | Para quê |
| --- | --- |
| `1-instalar.cmd` | Instala e configura. Pode rodar de novo sem risco. |
| `2-ativar-inicio-automatico.cmd` | Tarefa de início, Firewall, energia. |
| `iniciar.cmd` · `parar.cmd` · `reiniciar.cmd` | Controle manual do servidor. |
| `status.cmd` | Situação e endereço na rede. |
| `backup.cmd` | Backup manual. |
| `atualizar.cmd` | Aplicar versão nova. |
| `desativar-inicio-automatico.cmd` | Remove a tarefa e a regra do Firewall. Não apaga dados. |

### Configuração (`server\.env`, gerado na instalação)

| Variável | Valor no notebook | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://patri:SENHA@127.0.0.1:5432/patri` | Banco local. Senha aleatória, gerada na instalação. |
| `JWT_SECRET` | aleatório | Assina os logins. Trocar desloga todo mundo. |
| `PORT` | `3333` | Porta do sistema. |
| `HOST` | `0.0.0.0` | Aceita os aparelhos da rede. |
| `FRONTEND_DIR` | `../dist` | O servidor entrega também as telas. |
| `UPLOAD_DIR` | `C:/PATRI-dados/uploads` | Fotos. |
| `BACKUP_DIR` · `LOG_DIR` | `C:/PATRI-dados/…` | Backups e registros. |
| `BACKUP_MANTER` | `14` | Quantos backups automáticos guardar. |
| `PATRI_PRODUCAO` | `sim` | Bloqueia o comando de zerar banco de testes. |

Este arquivo tem senhas. Ele **não vai para o GitHub** (está no `.gitignore`).

### Rede e segurança

- **Porta liberada no Firewall: só a 3333 (TCP), só para a rede local.**
- **O PostgreSQL (5432) não é liberado.** O sistema fala com ele por
  `127.0.0.1`, de dentro do notebook. Para garantir que ele nem escute na rede:
  abra `C:\Program Files\PostgreSQL\<versão>\data\postgresql.conf`, deixe
  `listen_addresses = 'localhost'` e reinicie o serviço do PostgreSQL.
- O acesso continua exigindo login. As permissões de usuário e administrador
  são as mesmas.
- O acesso é por `http` (sem cadeado). Dentro da rede local isso é o esperado;
  não exponha a porta 3333 para a internet.
- Como as telas e a API ficam no mesmo endereço, não há liberação entre
  origens (CORS) a configurar. `CORS_ORIGIN` só é usado no desenvolvimento.

### Comandos (dentro de `C:\patri\server`)

```
npm run status              situação do servidor
npm run backup              backup manual
npm run restaurar -- PASTA  restaurar um backup (pede confirmação)
npm run migrar-do-render    trazer dados do Render (só lê lá)
npm run db:push             ajustar a estrutura do banco (recusa perda de dados)
```

Nenhum deles apaga dados sem pedir confirmação por escrito. `db:zerar-local`
recusa rodar no notebook-servidor.
