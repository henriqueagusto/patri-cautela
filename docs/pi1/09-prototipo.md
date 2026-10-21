# 9. Protótipo funcional

O protótipo deste projeto é o **próprio sistema em uso no setor**. As telas
abaixo foram capturadas numa cópia de demonstração, com pessoas e
equipamentos fictícios, para não expor dados reais. A maioria está no tamanho
de celular, que é onde o sistema é mais usado.

| # | Tela | Requisitos |
| --- | --- | --- |
| 1 | [Login](#1-login) | RF01 |
| 2 | [Busca](#2-busca) | RF04, RF05 |
| 3 | [Ficha do equipamento](#3-ficha-do-equipamento) | RF06 |
| 4 | [Locais](#4-locais) | RF13–RF16 |
| 5 | [Nova cautela](#5-nova-cautela) | RF17, RF18, RF20 |
| 6 | [Folha impressa](#6-folha-impressa) | RF19, RF25 |
| 7 | [Cautelas](#7-cautelas) | RF23, RF24 |
| 8 | [Cautela devolvida](#8-cautela-devolvida) | RF22 |
| 9 | [Histórico](#9-histórico) | RF30 |
| 10 | [Cadastros](#10-cadastros) | RF26, RF27 |
| 11 | [Configurações da cautela](#11-configurações-da-cautela) | RF28 |
| 12 | [Celular e computador](#12-celular-e-computador) | RNF01 |

---

### 1. Login

Entrada com e-mail e senha. Contas são criadas só pelo administrador.

<img src="img/01-login.png" alt="Tela de login" width="300">

### 2. Busca

Basta parte do nome: `sennheiser` encontra os dois microfones. Cada cartão
mostra a situação (Disponível, Fora da sala) e as condições calculadas
(Retorno próximo, Atenção).

<img src="img/02-busca.png" alt="Resultado da busca por sennheiser" width="300">

### 3. Ficha do equipamento

Responde as duas perguntas do sistema: onde fica guardado e, se saiu, em qual
cautela está e quando volta.

<img src="img/03-ficha.png" alt="Ficha da câmera Canon EOS R" width="300">

### 4. Locais

A estrutura real da sala, em árvore livre: prédio → sala → armário →
prateleira. Ao escolher um local, aparecem os equipamentos guardados nele.

<img src="img/04-locais.png" alt="Árvore de locais com a Prateleira 3 aberta" width="560">

### 5. Nova cautela

O número já vem reservado (número/ano). O técnico adiciona os itens por
toque e escolhe quem recebe.

<img src="img/05-nova-cautela.png" alt="Tela de nova cautela" width="300">

### 6. Folha impressa

A folha segue o formulário oficial: cabeçalho, brasão, dados do usuário nas
posições definidas pela chefia, tabela de itens preenchida e as linhas de
assinatura em branco.

<img src="img/06-folha.png" alt="Folha da cautela 300/2026 pronta para imprimir" width="700">

### 7. Cautelas

Cautelas abertas, com as atrasadas e as que vencem em breve destacadas.

<img src="img/07-cautelas.png" alt="Lista de cautelas abertas" width="300">

### 8. Cautela devolvida

Depois da devolução a cautela fica encerrada, com quem recebeu e o estado de
cada item. O microfone voltou danificado e passou a aparecer em Atenção.

<img src="img/08-devolucao.png" alt="Cautela 303/2026 encerrada" width="300">

### 9. Histórico

Linha do tempo de tudo que aconteceu, agrupada por dia, com filtros por
equipamento, pessoa, tipo e período.

<img src="img/09-historico.png" alt="Histórico de movimentações" width="560">

### 10. Cadastros

Pessoas (quem pode receber equipamento, sem precisar de login), setores,
categorias, motivos de saída e usuários.

<img src="img/10-cadastros.png" alt="Cadastro de pessoas" width="560">

### 11. Configurações da cautela

O cabeçalho impresso, a cidade, o número inicial (300) e o ano em que ele vale.

<img src="img/11-config-cautela.png" alt="Configurações da cautela" width="560">

### 12. Celular e computador

A mesma tela inicial nos dois tamanhos. No celular a barra lateral vira
navegação inferior, com **Cautela** como ação central.

<img src="img/12-celular.png" alt="Tela inicial no celular" width="260"> <img src="img/12-desktop.png" alt="Tela inicial no computador" width="620">

---

## Como rodar uma cópia de demonstração

Siga o [README do repositório](../../README.md#rodar). A cópia começa zerada;
cadastre alguns locais, pessoas e equipamentos fictícios antes de
demonstrar. O sistema do setor nunca é usado em demonstrações.
