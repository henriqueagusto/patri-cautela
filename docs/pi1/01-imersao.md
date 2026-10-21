# 1. Imersão com o parceiro

## Objetivo

Entender como o Serviço de Áudio e Vídeo controlava os seus equipamentos —
quem pega, quem entrega, como se registra e como se cobra a devolução — antes
de decidir o que o sistema deveria fazer.

## O parceiro

| | |
| --- | --- |
| **Organização** | Serviço de Áudio e Vídeo — Coordenação-Geral de Operações e Atendimento a Usuários, Diretoria de Tecnologia, Secretaria de Administração, Secretaria-Geral da Presidência da República |
| **Tipo** | Órgão público federal |
| **Local** | Brasília (DF) |
| **O que o setor faz** | Dá suporte de áudio, vídeo e iluminação a eventos, reuniões e gravações, e empresta equipamentos a outras áreas do órgão |
| **Acervo** | Entre 300 e 1.000 equipamentos: câmeras, microfones, mesas de som, iluminação, notebooks, monitores e acessórios |
| **Quem acompanhou o projeto** | A chefia do setor, que definiu as regras do processo e validou cada entrega |
| **Vínculo do aluno** | Atua no próprio setor, o que permitiu acompanhar a rotina por dentro |

## Técnicas usadas

| Técnica | Como foi aplicada | O que gerou |
| --- | --- | --- |
| **Observação participante** | O aluno acompanhou, no dia a dia da sala de equipamentos, os pedidos, as saídas, as devoluções e as buscas por itens. | Fluxo do processo atual ([02](02-processo-as-is.md)) e lista de problemas ([03](03-problemas.md)) |
| **Análise documental** | Leitura, campo por campo, do formulário oficial de cautela em papel. | O que o sistema precisa gerar e guardar (abaixo) |
| **Entrevistas semiestruturadas com a chefia** | Conversas em torno de perguntas-guia (abaixo), feitas no início e retomadas a cada entrega. | Decisões D1 a D6 |
| **Escuta ativa nas validações** | A cada sprint o sistema era mostrado funcionando e o retorno virava ajuste no backlog. | Mudanças de regra registradas em [08](08-scrum-e-backlog.md) |

## Perguntas investigadas e o que se descobriu

| Pergunta | Resposta |
| --- | --- |
| Como o setor controlava onde estavam os equipamentos? | Só com papel e memória. Não havia planilha nem sistema: a localização dependia de quem guardou lembrar. |
| Quantos equipamentos existem? | Entre 300 e 1.000 itens, distribuídos em armários e prateleiras da sala. |
| Como um equipamento saía da sala? | Por cautela em papel, preenchida à mão, assinada por quem recebia e arquivada. |
| Como se sabia com quem estava um item? | Procurando nas cautelas arquivadas ou perguntando à equipe. |
| Como se acompanhava o prazo de devolução? | Não havia acompanhamento: o atraso só aparecia quando alguém precisava do item. |
| Como se registrava o estado na volta? | Com uma frase fixa de "perfeito funcionamento", assinada mesmo quando o item voltava com problema. |
| As assinaturas podem ir para o sistema? | Não. A chefia quer as assinaturas no papel (D1). |
| Onde o sistema seria usado? | Principalmente em tablet e celular, em pé, dentro da sala. |
| O sistema pode depender de internet ou de serviço externo? | Não deveria: o uso é diário e precisa estar sempre disponível. |

## O que o formulário em papel revelou

A cautela em papel é o centro do processo. Lendo o modelo oficial:

- **Uma cautela cobre vários equipamentos** entregues a **uma pessoa**.
- Tem **numeração** no formato número/ano.
- Para cada item se escreve à mão: **especificação, modelo, marca, número de
  série e patrimônio** — dados que já existem no cadastro patrimonial.
- Os dados de quem recebe (nome, ramal, PR e celular) ficam em caixas sem
  título, logo abaixo de "USUÁRIO".
- Existe um **técnico responsável pelo transporte**, diferente de quem recebe.
- A **devolução** é registrada na mesma folha, abaixo de um pontilhado, com
  data e assinatura de quem recebeu de volta.
- A frase de devolução afirma que o material voltou "em perfeito
  funcionamento", sem espaço para registrar defeito.

## Decisões da chefia

Regras que vieram do parceiro, não do aluno. O sistema segue todas.

| # | Decisão | Por quê |
| --- | --- | --- |
| D1 | Assinaturas continuam no papel; o sistema cuida só dos dados (usuário, modelo, patrimônio). | Assinatura é pessoal e restrita; o papel assinado é o documento que vale. |
| D3 | Numeração número/ano começando em 300 (ex.: 300/2026), recomeçando a cada ano. | Continuar de onde a numeração em papel parou. |
| D4 | Uma única data de devolução para todos os itens da cautela, e tudo volta junto. | Simplifica a cobrança e o fechamento da folha. |
| D5 | Na folha: nome e ramal na 1ª linha; PR e celular na 2ª. | Posição dos dados igual ao formulário oficial. |
| D6 | Só o administrador altera dados de conta e senhas de usuários. | Controle de acesso centralizado. |

Decisões de projeto tomadas pelo aluno, a partir do que observou:

| # | Decisão | Por quê |
| --- | --- | --- |
| D2 | O papel assinado fica no arquivo físico; o sistema guarda só o número da cautela. | Segue D1: o papel é o documento; o número basta para achá-lo. |
| D7 | Sem QR Code e sem painel de gráficos. | O que o setor precisa é achar o item rápido; etiquetar todo o acervo e montar indicadores não resolve isso agora. |
| D8 | Sistema disponível o tempo todo, sem depender de serviço externo nem de internet. | Uso diário na sala; o banco gratuito da hospedagem na nuvem expira em 30 dias. |

## Cuidados éticos

- Nenhum dado pessoal real foi publicado: as telas de [09](09-prototipo.md)
  vêm de uma cópia de demonstração com dados fictícios.
- Fotos da sala e do formulário preenchido não foram publicadas.
- O sistema guarda só o necessário de cada pessoa para emitir a cautela.
