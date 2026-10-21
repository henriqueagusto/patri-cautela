# PATRI no Projeto Integrador I

Documentação do PATRI como projeto de extensão (ACE) da disciplina **Projeto
Integrador I** — Superior de Tecnologia em Análise e Desenvolvimento de
Sistemas, CEUB, 2026/2.

| | |
| --- | --- |
| **Aluno** | Henrique Augusto de Oliveira Souza — RA 22501022 |
| **Formato** | Projeto individual |
| **Parceiro** | Serviço de Áudio e Vídeo — Coordenação-Geral de Operações e Atendimento a Usuários, Diretoria de Tecnologia, Secretaria de Administração, Secretaria-Geral da Presidência da República (órgão público federal) |
| **Vínculo** | O aluno atua no próprio setor parceiro |
| **Sistema** | PATRI — controle e localização de equipamentos audiovisuais |
| **Período** | Agosto a outubro de 2026 |
| **Situação** | Em uso pela equipe do setor |

![Tela inicial do PATRI no computador](img/12-desktop.png)

---

## O projeto em quatro frases

**Problema.** O setor guarda entre 300 e 1.000 equipamentos de áudio, vídeo,
iluminação e informática, e o controle era feito só com papel e memória: cada
saída virava uma cautela preenchida à mão, item por item, e saber onde estava
um equipamento — ou com quem — dependia de alguém lembrar ou de procurar nas
folhas arquivadas.

**Solução.** O PATRI responde em segundos *onde está este equipamento* e, se não
está na sala, *com quem está e quando volta*. Toda saída vira uma cautela
numerada, e o sistema imprime a folha oficial já preenchida; só as assinaturas
continuam no papel, como a chefia determinou.

**Para quem.** Técnicos do setor, que atendem em pé, no tablet ou no celular,
dentro da sala de equipamentos; e a chefia, que responde pelo patrimônio.

**Resultado.** Sistema em uso no setor, rodando num notebook que funciona como
servidor na rede Wi-Fi interna, sem depender de internet. Uma cautela de três
itens, que exigia **21 campos escritos à mão**, passou a sair com **cerca de 7
toques** e nenhum dado copiado ([detalhes](03-problemas.md#esforço-antes-e-depois)).

---

## Artefatos

Cada arquivo corresponde a uma etapa pedida no plano de ensino.

| Etapa do plano de ensino | Arquivo |
| --- | --- |
| Imersão com o parceiro (entrevista, observação, escuta) | [01-imersao.md](01-imersao.md) |
| Mapeamento do processo atual (AS-IS) | [02-processo-as-is.md](02-processo-as-is.md) |
| Problemas e gargalos | [03-problemas.md](03-problemas.md) |
| Proposta de melhoria (TO-BE), inovação e viabilidade | [04-processo-to-be.md](04-processo-to-be.md) |
| Design Thinking e escolha da solução | [05-design-thinking.md](05-design-thinking.md) |
| Levantamento de requisitos | [06-requisitos.md](06-requisitos.md) |
| Projeto do sistema (arquitetura, casos de uso, dados, estados) | [07-modelagem.md](07-modelagem.md) |
| Scrum: papéis, eventos, sprints e backlog | [08-scrum-e-backlog.md](08-scrum-e-backlog.md) |
| Protótipo funcional (telas do sistema) | [09-prototipo.md](09-prototipo.md) |
| Avaliação da comunidade participante | [10-avaliacao-comunidade.md](10-avaliacao-comunidade.md) |
| Autoavaliação | [11-autoavaliacao.md](11-autoavaliacao.md) |
| Apresentação oral | [12-apresentacao.md](12-apresentacao.md) |

Documentos técnicos do repositório que completam este conjunto:

- [Especificação de design e regras de produto](../PATRI-design.md)
- [Servidor local no notebook](../SERVIDOR-LOCAL.md)
- [Publicação na nuvem (versão anterior)](../DEPLOY.md)

## Como o plano de ensino foi atendido

| Exigência do plano | Onde está atendida |
| --- | --- |
| Problema real de organização parceira (órgão público) | Parceiro acima; [01](01-imersao.md) |
| Imersão com entrevista, observação e escuta ativa | [01](01-imersao.md) |
| AS-IS, gargalos e TO-BE com foco em inovação e viabilidade | [02](02-processo-as-is.md), [03](03-problemas.md), [04](04-processo-to-be.md) |
| Design Thinking e alternativas de solução (inovação, criatividade, custo) | [05](05-design-thinking.md) |
| Levantamento de requisitos | [06](06-requisitos.md) |
| Artefatos de projeto de sistemas | [07](07-modelagem.md) |
| Scrum com papéis e eventos; backlog no GitHub | [08](08-scrum-e-backlog.md) e aba Issues |
| Protótipo funcional das principais funcionalidades | [09](09-prototipo.md) — o próprio sistema em uso |
| Avaliação da comunidade e autoavaliação | [10](10-avaliacao-comunidade.md), [11](11-autoavaliacao.md) |
| Apresentação das entregas | [12](12-apresentacao.md) |

Nenhum dado pessoal real aparece neste repositório: as telas foram
capturadas numa cópia de demonstração, com pessoas e equipamentos fictícios.
