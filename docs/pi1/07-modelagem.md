# 7. Projeto do sistema

Arquitetura, casos de uso, modelo de dados e comportamento da cautela. Tudo
aqui corresponde ao código deste repositório (`server/prisma/schema.prisma` e
`server/src/routes/`).

## Arquitetura

```mermaid
flowchart LR
    subgraph Rede["Rede Wi-Fi do setor"]
        T[Tablet]
        C[Celular]
        P[Computador]
    end
    subgraph N["Notebook servidor — Windows"]
        S["Servidor Node.js + Express<br/>porta 3333<br/>telas + API em /api"]
        DB[(PostgreSQL 16)]
        U["Pasta PATRI-dados<br/>fotos, backups e logs"]
    end
    T -- HTTP --> S
    C -- HTTP --> S
    P -- HTTP --> S
    S -- Prisma --> DB
    S --> U
```

| Camada | Tecnologia | Por quê |
| --- | --- | --- |
| Interface | React 19 + TypeScript + Vite, PWA | Componentes reutilizáveis; instalável no tablet e no celular |
| API | Node.js 20 + Express + Zod | Leve, mesma linguagem do frontend; toda entrada validada |
| Acesso a dados | Prisma | Esquema tipado e versionado no repositório |
| Banco | PostgreSQL 16 | Relacional, livre, robusto para histórico e auditoria |
| Autenticação | JWT + bcrypt | Sessão sem estado no servidor; senha com hash |
| Implantação | Notebook Windows na rede interna | Funciona sem internet; custo zero |

---

## Casos de uso

```mermaid
flowchart LR
    US((Usuário))
    AD((Administrador))

    subgraph PATRI
        UC1([Buscar equipamento])
        UC2([Ver ficha e histórico])
        UC3([Emitir cautela])
        UC4([Imprimir folha da cautela])
        UC5([Registrar devolução])
        UC6([Mudar item de lugar])
        UC7([Cadastrar e editar equipamento])
        UC8([Cadastrar pessoa])
        UC9([Gerenciar locais])
        UC10([Gerenciar usuários])
        UC11([Restaurar ou excluir da lixeira])
        UC12([Configurar sistema e cautela])
        UC13([Consultar auditoria])
    end

    US --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8
    AD --- UC9 & UC10 & UC11 & UC12 & UC13
    AD -. herda tudo do usuário .-> US
    UC3 -. inclui .-> UC4
    UC3 -. pode incluir .-> UC8
```

### UC3 — Emitir cautela

| | |
| --- | --- |
| **Ator** | Usuário |
| **Pré-condição** | Usuário autenticado; itens com situação Disponível. |
| **Fluxo principal** | 1. Usuário abre **Nova cautela**. 2. Busca e toca nos itens. 3. Escolhe a pessoa que recebe. 4. Informa destino, motivo, técnico do transporte e prazo (o motivo sugere o prazo padrão). 5. Confirma. 6. O sistema gera o número/ano, muda os itens para Fora da sala (ou Em manutenção, se o motivo pedir) e registra no histórico. 7. O sistema oferece a impressão da folha. |
| **Fluxo alternativo** | 3a. A pessoa não está cadastrada: usuário cadastra ali mesmo e continua. |
| **Exceções** | Algum item não está mais disponível: o sistema recusa e informa o nome e o PR do item. Item excluído nesse meio-tempo: o sistema avisa e não emite. |
| **Pós-condição** | Cautela aberta; itens com responsável e prazo. |
| **Regras** | RN01–RN07, RN13, RN17 |

### UC5 — Registrar devolução

| | |
| --- | --- |
| **Ator** | Usuário |
| **Pré-condição** | Cautela aberta. |
| **Fluxo principal** | 1. Usuário abre a cautela (pela lista ou pelo número). 2. Toca em **Devolver**. 3. Informa quem recebeu e, se preciso, o estado físico de cada item. 4. Confirma. 5. O sistema encerra a cautela, devolve os itens para Disponível no local de guarda e registra no histórico. |
| **Pós-condição** | Cautela encerrada; reimpressão já mostra a data da devolução. |
| **Regras** | RN03, RN12 |

---

## Modelo de dados

Entidades principais (campos resumidos).

```mermaid
erDiagram
    USER ||--o| PERSON : "pode ser"
    PERSON }o--o| SECTOR : "pertence a"
    LOCATION ||--o{ LOCATION : "contém"
    CATEGORY ||--o{ EQUIPMENT : "classifica"
    LOCATION ||--o{ EQUIPMENT : "guarda"
    EQUIPMENT ||--o{ MOVEMENT : "histórico"
    USER ||--o{ MOVEMENT : "registra"
    PERSON ||--o{ CAUTELA : "recebe"
    EXIT_REASON ||--o{ CAUTELA : "motiva"
    SECTOR ||--o{ CAUTELA : "destino"
    CAUTELA ||--|{ CAUTELA_ITEM : "tem"
    EQUIPMENT ||--o{ CAUTELA_ITEM : "aparece em"
    USER ||--o{ AUDIT_LOG : "altera"

    USER {
        string email UK
        string senhaHash
        enum papel "USUARIO | ADMINISTRADOR"
        bool ativo
    }
    PERSON {
        string nome
        string matricula "PR da pessoa"
        string ramal
        string telefone "celular"
    }
    EQUIPMENT {
        string pr UK
        string nome
        string marca
        string modelo
        string numeroSerie
        enum situacao "DISPONIVEL | FORA_DA_SALA | MANUTENCAO | BAIXADO"
        enum estadoFisico "OTIMO a DANIFICADO"
        datetime retornoPrevisto
        datetime excluidoEm "lixeira"
        string searchText "índice da busca"
    }
    LOCATION {
        string nome
        string tipo
        bool arquivado
        string parentId FK
    }
    CAUTELA {
        int numero
        int ano
        string tecnicoTransporte
        datetime retornoPrevisto
        datetime fechadaEm
    }
    CAUTELA_ITEM {
        string pr "cópia impressa"
        string nome "cópia impressa"
        datetime devolvidoEm
        string recebidoPor
        enum estadoDevolucao
    }
    MOVEMENT {
        enum tipo "CADASTRO | EDICAO | MOVIMENTACAO | SAIDA | EDICAO_SAIDA | DEVOLUCAO"
        string origemCaminho
        string destinoCaminho
        string pessoaNome
    }
    EXIT_REASON {
        string nome UK
        int prazoDias
        bool colocaEmManutencao
    }
    SECTOR {
        string nome UK
    }
    CATEGORY {
        string nome UK
        string cor
        string icone
    }
    AUDIT_LOG {
        string entidade
        string acao
        string resumo
    }
```

Restrições importantes: `(ano, numero)` é único em `CAUTELA`; `pr` é único em
`EQUIPMENT`; `MOVEMENT` guarda cópias em texto (caminho do local, nome da
pessoa) para o histórico sobreviver a renomeações e exclusões.

---

## Ciclo de vida do equipamento

```mermaid
stateDiagram-v2
    [*] --> Disponivel: cadastro
    Disponivel --> ForaDaSala: cautela emitida
    Disponivel --> EmManutencao: cautela com motivo de manutenção
    ForaDaSala --> Disponivel: devolução da cautela
    EmManutencao --> Disponivel: devolução da cautela
    Disponivel --> Disponivel: mudança de lugar
    Disponivel --> Baixado: edição do cadastro (baixa)
    Disponivel --> Lixeira: excluir
    Lixeira --> Disponivel: restaurar (admin)
    Lixeira --> [*]: excluir definitivamente (admin)
    Baixado --> [*]

    state ForaDaSala {
        [*] --> NoPrazo
        NoPrazo --> RetornoProximo: faltam 48 h
        RetornoProximo --> Atrasado: prazo vencido
    }
```

As condições dentro de *Fora da sala* (no prazo, retorno próximo, atrasado)
não são gravadas: o sistema calcula na hora em que alguém consulta (RN11).

## Sequência — emitir cautela

```mermaid
sequenceDiagram
    actor T as Técnico (tablet)
    participant F as Interface React
    participant A as API Express
    participant B as PostgreSQL

    T->>F: toca nos itens, escolhe pessoa e prazo
    F->>A: POST /api/cautelas
    A->>A: valida dados (Zod) e permissão
    A->>B: próximo número do ano
    A->>B: cria cautela + itens (cópia dos dados impressos)
    A->>B: atualiza situação, responsável e prazo dos itens
    A->>B: grava movimentos no histórico
    A-->>F: cautela 301/2026
    F-->>T: "Cautela emitida" + Imprimir
    T->>F: Imprimir
    F->>A: GET /api/cautelas/:id
    F-->>T: folha oficial preenchida, assinaturas em branco
```
