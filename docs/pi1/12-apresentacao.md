# 12. Apresentação oral

Metade de cada menção vem da apresentação oral. O roteiro abaixo cabe em
**10 minutos**, seguidos das perguntas da banca.

## Roteiro

| Tempo | Bloco | O que dizer | Apoio |
| --- | --- | --- | --- |
| 0:00 | Abertura | Quem sou, quem é o parceiro, o problema em uma frase. | Slide 1 |
| 0:45 | Como era | O papel: cautela à mão, ninguém sabe na hora onde está o item. Mostrar o fluxo AS-IS. | [02](02-processo-as-is.md) |
| 2:00 | Problemas | Os três mais graves (P1, P2, P5) e os 21 campos à mão por cautela. | [03](03-problemas.md) |
| 3:00 | Imersão e Design Thinking | Como ouviu o setor; persona; ideias descartadas e por quê; matriz de decisão. | [01](01-imersao.md), [05](05-design-thinking.md) |
| 4:30 | Solução | Fluxo TO-BE e as decisões da chefia que o sistema respeita. | [04](04-processo-to-be.md) |
| 5:30 | **Demonstração** | Ver abaixo. | Sistema rodando |
| 8:00 | Como foi construído | Arquitetura em um slide; Scrum e incrementos; backlog no GitHub. | [07](07-modelagem.md), [08](08-scrum-e-backlog.md) |
| 9:00 | Resultado | Em uso no setor; 21 campos → 7 ações; avaliação da chefia. | [03](03-problemas.md), [10](10-avaliacao-comunidade.md) |
| 9:40 | Fechamento | O que aprendeu; próximos passos. | — |

## Slides

Poucos e com pouco texto. Sugestão:

1. **PATRI** — nome, aluno, parceiro.
2. **"Onde está a câmera?"** — foto da sala (sem pessoas) e a pergunta.
3. **Como era** — fluxo AS-IS simplificado.
4. **Problemas** — três problemas e o esforço de uma cautela no papel.
5. **O que ouvimos** — técnicas de imersão + persona.
6. **Ideias** — adotadas × descartadas.
7. **Por que um sistema próprio** — a matriz de decisão.
8. **Como ficou** — fluxo TO-BE.
9. *(demonstração)*
10. **Arquitetura** — o diagrama de [07](07-modelagem.md#arquitetura).
11. **Scrum** — os seis incrementos em linha do tempo + print do board.
12. **Resultado** — antes × depois e trecho da avaliação da chefia.
13. **Aprendizados e próximos passos.**

## Demonstração

Use a **cópia de demonstração**, com dados inventados, nunca o sistema do
setor. Prepare antes: 10 a 15 equipamentos, alguns locais, duas pessoas e uma
cautela já atrasada.

1. **Buscar** — digitar `dell` ou parte de um nome; abrir a ficha e mostrar o
   caminho do local.
2. **Emitir cautela** — tocar em dois itens, escolher a pessoa, o motivo e o
   prazo; emitir.
3. **Imprimir** — abrir a folha e mostrar que é o formulário oficial, com as
   assinaturas em branco.
4. **Cautelas** — mostrar a atrasada em destaque.
5. **Devolver** — registrar a devolução marcando um item como danificado;
   mostrar que ele aparece em Atenção.
6. **Histórico** — abrir o histórico do item e mostrar a saída e a volta.
7. Se der tempo: abrir no celular para mostrar que se adapta.

Plano B: se a rede ou o projetor falhar, mostre as telas de
[09](09-prototipo.md), que cobrem o mesmo roteiro.

## Perguntas prováveis

Respostas curtas, com o caminho para o detalhe na documentação.

**Por que não usar um sistema pronto?**
Matriz de decisão em [05](05-design-thinking.md): nenhum sistema genérico gera a
cautela oficial pronta nem foi feito para uso em pé no celular; e o sistema
próprio roda sem internet, de graça.

**Como você sabe que resolve o problema do cliente?**
O sistema está em uso no setor; as regras vieram da chefia (decisões D1–D6);
a folha foi comparada lado a lado com o formulário; avaliação da chefia.

**O repositório começou com o sistema pronto. Onde está o Scrum?**
O sistema foi desenvolvido em seis sprints validadas com a chefia antes de ir
para o GitHub ([08](08-scrum-e-backlog.md)). Reconheci isso na retrospectiva
da sprint 6 e, desde então, backlog e commits ficam no GitHub.

**Por que a assinatura não está no sistema?**
Decisão da chefia: a assinatura é pessoal, e o papel assinado é o documento
que vale. O sistema gera a folha e guarda o número para achar o papel.

**O que é situação e o que é condição?**
Situação é gravada no banco (Disponível, Fora da sala, Em manutenção,
Baixado). Condição é calculada na hora (Atrasado, Retorno próximo, Atenção).
Assim não existe rotina que alguém esqueça de rodar para marcar atrasos.

**Como a busca acha "vostro" dentro do nome?**
Cada equipamento guarda um texto normalizado (sem acento, minúsculo) com nome,
PR, marca, modelo, série, categoria, local e responsável. Ele é reconstruído
em toda alteração que mexe nesses campos, e a busca procura todos os termos
digitados nesse texto.

**Como a numeração recomeça a cada ano?**
A cautela guarda número e ano, e o par é único. O próximo número é o maior do
ano atual + 1; no primeiro ano configurado, começa em 300.

**E se o notebook queimar?**
Backup automático diário do banco e das fotos, com restauração documentada
([SERVIDOR-LOCAL.md](../SERVIDOR-LOCAL.md)). A cópia desse backup para fora
do notebook é o próximo item técnico do backlog (PB02).

**E os dados pessoais (LGPD)?**
Só o necessário para a cautela (nome, PR, ramal, celular); nada de
assinatura; acesso só com login; dados de conta só o administrador altera.

**Quem mantém o sistema depois?**
Eu, enquanto atuo no setor. Código, regras de negócio, instalação, backup e
restauração estão documentados no repositório para outra pessoa assumir.

**Você usou IA?**
Sim, como apoio no código e na documentação. As regras vieram da chefia e da
observação do setor; eu decidi o que entrava, revisei, testei com a equipe e
implantei. As respostas técnicas acima mostram que entendo como o sistema
funciona.
