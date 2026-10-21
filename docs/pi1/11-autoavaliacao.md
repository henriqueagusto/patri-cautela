# 11. Autoavaliação

**Aluno:** Henrique Augusto de Oliveira Souza — RA 22501022
**Papel no Scrum:** Product Owner, Scrum Master e Developer (projeto individual)
**Período:** agosto a outubro de 2026

## Reflexão

**1. Qual foi a minha contribuição no projeto?**
Fiz o projeto inteiro: identifiquei o problema no setor onde atuo, levei a
proposta à chefia, conduzi o levantamento das regras, construí e implantei o
sistema, e documentei o processo. O PATRI está em uso pela equipe.

**2. O que descobri na imersão que não esperava?**
Que o problema não era só "achar o equipamento". A cautela em papel escondia
outros: dados copiados à mão em toda saída, ninguém sabendo o que estava
atrasado e a frase de "perfeito funcionamento" assinada mesmo quando o item
voltava com defeito. Ler o formulário campo a campo mudou o desenho do
sistema.

**3. Qual decisão eu defenderia na apresentação?**
Manter as assinaturas no papel e fazer o sistema gerar a folha oficial
preenchida. Seria mais "moderno" colher a assinatura na tela, mas a chefia não
queria, e o papel assinado é o documento que vale. Respeitar isso fez o
sistema ser aceito sem mudar a rotina de quem assina.

**4. Qual foi o momento mais difícil e como resolvi?**
A hospedagem gratuita na nuvem: o banco expirava em 30 dias e o sistema já
estava em uso. Planejei a migração para um notebook na rede interna, com
instalação, início automático e backup diário, sem perder os dados que já
existiam.

**5. Como foi lidar com as mudanças pedidas pela chefia?**
Na sprint 4 eu tinha construído a devolução item por item, e a chefia
decidiu que tudo volta junto, com um prazo único. Também mudou a numeração
para número/ano começando em 300. Refiz essas partes e aprendi a confirmar a
regra com um exemplo concreto antes de programar.

**6. O que aprendi de técnico?**
Modelar um banco relacional a partir de um processo real (Pessoa separada de
Usuário, locais em árvore, cópia dos dados impressos em cada cautela), montar
uma API com validação de entrada e controle de permissão no servidor,
construir uma interface pensada primeiro para celular e tablet, e colocar um
sistema em produção com backup e recuperação.

**7. O que aprendi sobre trabalhar com um cliente real?**
Que a regra do cliente vence a minha preferência, e que mostrar o sistema
funcionando gera um retorno muito melhor do que descrever a ideia. Cada
review trouxe um ajuste que eu não teria previsto sozinho.

**8. Como usei ferramentas de apoio?**
Usei IA (Claude) como apoio na escrita de código e na documentação. As regras
de negócio vieram da chefia e da observação do setor; eu decidi o que entrava
no sistema, revisei, testei com a equipe e implantei. Consigo explicar cada
decisão e cada parte do funcionamento.

**9. Se começasse de novo, o que faria diferente?**
Versionaria no GitHub desde o primeiro dia, com uma issue por história e
commits pequenos — o repositório recebeu o sistema já pronto, e o histórico
das sprints teve de ser reconstruído. E planejaria a infraestrutura antes,
em vez de depender de um serviço gratuito.

## Competências do plano de ensino

Escala de 1 (pouco desenvolvida) a 5 (muito desenvolvida).

| Competência | Nota | Justificativa |
| --- | :-: | --- |
| Identificar e analisar o problema a partir das necessidades do cliente | 5 | O problema veio da rotina real do setor e foi validado com a chefia. |
| Especificar requisitos de software | 4 | 31 requisitos funcionais, 14 não funcionais e 17 regras de negócio, conferidos contra o código; poderia ter escrito antes de programar. |
| Projetar, desenvolver e implantar a solução | 5 | Sistema completo, em uso, com servidor local e backup. |
| Aplicar Design Thinking | 4 | Imersão, personas, ideação e matriz de decisão; a imersão foi mais por observação e conversas do que por entrevistas formais. |
| Trabalhar com Scrum e entregas regulares | 4 | Seis sprints com review na chefia; faltou registrar no GitHub desde o início. |
| Comunicar com clareza, ouvir e negociar com o cliente | 5 | Todas as regras da chefia foram incorporadas, inclusive as que mudaram o que já estava pronto. |
| Agir com ética e responsabilidade | 5 | Assinaturas fora do sistema, dados mínimos, nenhum dado real publicado, backup antes de mexer no banco. |
| Auto-organização e cumprimento de prazos | 4 | Ritmo de sprints mantido sozinho; a documentação ficou para o fim. |

**Menção que eu me daria:** SS — o sistema resolve um problema real, está em
uso pelo parceiro e o processo foi documentado de ponta a ponta, com os
pontos a melhorar reconhecidos acima.
