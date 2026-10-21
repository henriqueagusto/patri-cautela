# 6. Requisitos

Levantados na imersão e nas decisões da chefia ([01](01-imersao.md)),
priorizados pelo método **MoSCoW** (*Must, Should, Could, Won't*) e conferidos
contra o código deste repositório.

**Situação:** ✅ implementado e em uso · 🔜 previsto · ⛔ fora do escopo

## Atores

| Ator | Descrição | Acesso |
| --- | --- | --- |
| **Usuário** | Técnico do setor que busca, emite cautelas e registra devoluções. | Login com papel *usuário* |
| **Administrador** | Mantém cadastros, locais, usuários e configurações. | Login com papel *administrador* |
| **Pessoa** | Quem recebe o equipamento. Não precisa ter login. | Nenhum |
| **Chefia** | Define as regras do processo e acompanha o acervo. | Usuário ou administrador |

---

## Requisitos funcionais

### Acesso

| ID | Requisito | Prioridade | Situação |
| --- | --- | :-: | :-: |
| RF01 | Entrar com e-mail e senha; a sessão dura 7 dias. | Must | ✅ |
| RF02 | O administrador cria, edita, desativa usuários, define o papel e redefine senhas. | Must | ✅ |
| RF03 | O usuário comum vê o próprio perfil e altera só as preferências de visualização. | Must | ✅ |

### Equipamentos

| ID | Requisito | Prioridade | Situação |
| --- | --- | :-: | :-: |
| RF04 | Buscar por nome, PR, marca, modelo, série, categoria, local ou responsável, sem diferenciar acento e maiúscula, aceitando termo parcial e fora de ordem. | Must | ✅ |
| RF05 | Filtrar por situação e condição (Disponível, Fora da sala, Em manutenção, Atrasado, Atenção). | Must | ✅ |
| RF06 | Exibir a ficha do equipamento: foto, nome, PR, situação, estado físico, local completo, responsável e histórico. | Must | ✅ |
| RF07 | Cadastrar e editar equipamento: PR (único), nome, material, marca, modelo, número de série ou "sem número de série", fabricante, categoria, local, foto e observações. | Must | ✅ |
| RF08 | Marcar como **Não importado** o item cujo PR não segue a regra da base patrimonial oficial, sem bloquear nenhuma operação. | Should | ✅ |
| RF09 | Mudar o item de lugar sem gerar cautela. | Must | ✅ |
| RF10 | Enviar item para a lixeira; só o administrador restaura ou exclui de vez. | Must | ✅ |
| RF11 | Enviar uma foto por equipamento (JPEG, PNG ou WebP até 5 MB). | Should | ✅ |
| RF12 | Favoritar itens e ver os últimos 20 abertos pelo próprio usuário. | Could | ✅ |

### Locais

| ID | Requisito | Prioridade | Situação |
| --- | --- | :-: | :-: |
| RF13 | Manter os locais como árvore livre (prédio, sala, armário, prateleira, gaveta…), com quantos níveis forem necessários. | Must | ✅ |
| RF14 | Criar locais em série ("Prateleira 1" a "Prateleira 6"). | Could | ✅ |
| RF15 | Arquivar local fora de uso, valendo para a subárvore, sem apagar o histórico. | Should | ✅ |
| RF16 | Ver os equipamentos de um local e de tudo que está dentro dele. | Must | ✅ |

### Cautelas

| ID | Requisito | Prioridade | Situação |
| --- | --- | :-: | :-: |
| RF17 | Emitir cautela com um ou mais itens para uma pessoa, com destino, motivo, técnico do transporte, prazo e observação. | Must | ✅ |
| RF18 | Numerar automaticamente no formato número/ano. | Must | ✅ |
| RF19 | Gerar a folha para impressão idêntica ao formulário oficial, preenchida, com as assinaturas em branco. | Must | ✅ |
| RF20 | Cadastrar a pessoa durante a emissão, sem sair do fluxo. | Should | ✅ |
| RF21 | Editar os dados de uma cautela aberta; a alteração entra no histórico. | Should | ✅ |
| RF22 | Registrar a devolução da cautela inteira: quem recebeu e o estado físico de cada item. | Must | ✅ |
| RF23 | Listar cautelas abertas e encerradas, com as atrasadas em destaque. | Must | ✅ |
| RF24 | Indicar **Retorno próximo** dentro da janela configurada (padrão 48 h) e **Atrasado** depois do prazo. | Must | ✅ |
| RF25 | Reimprimir uma cautela antiga exatamente como foi assinada, mesmo que o cadastro tenha mudado. | Should | ✅ |

### Cadastros e configuração

| ID | Requisito | Prioridade | Situação |
| --- | --- | :-: | :-: |
| RF26 | Cadastrar pessoas com nome, PR, ramal, celular, e-mail e setor. | Must | ✅ |
| RF27 | Cadastrar categorias (nome, cor, ícone), setores e motivos de saída (com prazo padrão e opção de colocar o item em manutenção). | Must | ✅ |
| RF28 | Configurar nome e logo da instituição, prazos, janela de aviso, regra do PR oficial, cabeçalho e cidade da cautela, número inicial e ano. | Should | ✅ |
| RF29 | Mostrar a ficha da pessoa com todas as cautelas dela. | Should | ✅ |

### Histórico

| ID | Requisito | Prioridade | Situação |
| --- | --- | :-: | :-: |
| RF30 | Registrar cada cadastro, edição, mudança de lugar, saída e devolução no histórico do equipamento. | Must | ✅ |
| RF31 | Registrar na auditoria quem alterou o quê em cadastros e configurações. | Should | ✅ |

---

## Requisitos não funcionais

| ID | Categoria | Requisito | Situação |
| --- | --- | --- | :-: |
| RNF01 | Usabilidade | Interface pensada primeiro para tablet e celular; abaixo de 768 px o layout se reorganiza (navegação inferior, folhas deslizantes, ação principal no rodapé). | ✅ |
| RNF02 | Usabilidade | Alvos de toque com no mínimo 44 px; campos com fonte de 16 px para o iOS não dar zoom. | ✅ |
| RNF03 | Usabilidade | Textos em português direto, sem jargão; mensagem de erro diz o que fazer. | ✅ |
| RNF04 | Acessibilidade | Situação sempre com rótulo em texto, nunca só cor; foco de teclado sempre visível; animações desligáveis por `prefers-reduced-motion`. | ✅ |
| RNF05 | Desempenho | Resultado da busca aparece enquanto se digita (atraso de 150 ms), sem recarregar a tela. | ✅ |
| RNF06 | Disponibilidade | Funciona na rede Wi-Fi interna, sem internet, com início automático junto com o Windows. | ✅ |
| RNF07 | Disponibilidade | Falha de rede não encerra a sessão; o sistema avisa e reconecta sozinho. | ✅ |
| RNF08 | Instalação | Instalável como app (PWA) no Android e no iOS. | ✅ |
| RNF09 | Segurança | Senhas guardadas com hash (bcrypt); acesso por token (JWT); autorização das ações de administrador verificada no servidor. | ✅ |
| RNF10 | Segurança | Toda entrada da API validada (Zod); respostas de erro nunca expõem detalhes internos. | ✅ |
| RNF11 | Integridade | Exclusão lógica (lixeira); nenhum comando comum de atualização apaga dados. | ✅ |
| RNF12 | Recuperação | Backup automático diário do banco e das fotos, com restauração documentada. | ✅ |
| RNF13 | Manutenibilidade | Código em TypeScript estrito; design system com tokens; regras do projeto documentadas no repositório. | ✅ |
| RNF14 | Privacidade | Só o necessário de cada pessoa (nome, PR, ramal, celular); assinatura nunca é guardada no sistema. | ✅ |

---

## Regras de negócio

| ID | Regra | Origem |
| --- | --- | --- |
| RN01 | Toda saída da sala é uma cautela. Não existe saída avulsa de item. | Processo do setor |
| RN02 | Uma cautela tem um ou mais itens, uma pessoa responsável e **uma única data de devolução**. | Chefia (D4) |
| RN03 | A devolução é sempre da cautela inteira; ao devolver, a cautela encerra. | Chefia (D4) |
| RN04 | A cautela é identificada por número/ano, único no ano; recomeça em 1 a cada ano novo. | Chefia (D3) |
| RN05 | O número inicial configurado (300) vale só para o ano configurado. | Chefia (D3) |
| RN06 | Assinaturas nunca entram no sistema; a folha sai com as linhas em branco. | Chefia (D1) |
| RN07 | Na folha: nome e ramal na 1ª linha; PR e celular na 2ª. | Chefia (D5) |
| RN08 | Só o administrador altera dados de conta e senhas. | Chefia (D6) |
| RN09 | Mudar de lugar não gera cautela; o item continua no acervo. | Processo do setor |
| RN10 | Pessoa é diferente de usuário: quem recebe equipamento não precisa de login. | Imersão |
| RN11 | A situação é gravada (Disponível, Fora da sala, Em manutenção, Baixado); as condições Atrasado, Retorno próximo, Atenção e Não importado são calculadas na leitura. | Projeto |
| RN12 | Atenção = estado físico Ruim ou Danificado. | Projeto |
| RN13 | Motivo de saída com "coloca em manutenção" muda a situação do item para Em manutenção. | Processo do setor |
| RN14 | O PR do equipamento é único. | Patrimônio |
| RN15 | Não pode haver dois locais com o mesmo nome no mesmo nível; local com equipamento não pode ser arquivado. | Projeto |
| RN16 | Item excluído vai para a lixeira; só o administrador restaura ou apaga de vez. | Projeto |
| RN17 | A cautela guarda uma cópia dos dados impressos de cada item, para a reimpressão sair igual à folha assinada. | Projeto |

## Fora do escopo

| Item | Motivo |
| --- | --- |
| QR Code e leitura automática de inventário | Decisão do projeto (D7) |
| Painel de gráficos e relatórios | Decisão do projeto (D7) |
| Assinatura eletrônica | Chefia (D1) |
| Exportação de dados, notificações push, galeria de fotos | Não priorizados; só entram com aprovação da chefia |
