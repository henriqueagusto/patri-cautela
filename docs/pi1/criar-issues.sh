#!/usr/bin/env bash
# Cria no GitHub o backlog do PATRI descrito em docs/pi1/08-scrum-e-backlog.md.
#
#   - etiquetas: historia, disciplina, tecnico, ideia, retroativo
#   - histórias já entregues (US01–US16): criadas e fechadas, marcadas como
#     registro retroativo — foram feitas antes de o backlog ir para o GitHub
#   - próximos itens (PB01–PB07): criados abertos
#
# Uso (Git Bash, na pasta do repositório, com `gh auth login` feito):
#   bash docs/pi1/criar-issues.sh
#
# Pode rodar de novo: issue com o mesmo título não é criada duas vezes.

set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "Instale o GitHub CLI: https://cli.github.com" >&2
  exit 1
fi
gh auth status >/dev/null 2>&1 || { echo "Rode 'gh auth login' primeiro." >&2; exit 1; }

echo "Repositório: $(gh repo view --json nameWithOwner --jq .nameWithOwner)"

# --- etiquetas -------------------------------------------------------------
gh label create historia   --color 7F77DD --description "História de usuário"            --force >/dev/null
gh label create disciplina --color EF9F27 --description "Entrega do Projeto Integrador I" --force >/dev/null
gh label create tecnico    --color 378ADD --description "Melhoria técnica, sem mudar regra" --force >/dev/null
gh label create ideia      --color 888780 --description "Só entra com aprovação da chefia" --force >/dev/null
gh label create retroativo --color 1D9E75 --description "Entregue antes do registro no GitHub" --force >/dev/null

EXISTENTES="$(gh issue list --state all --limit 500 --json title --jq '.[].title')"

existe() { printf '%s\n' "$EXISTENTES" | grep -Fxq -- "$1"; }

# criar_fechada "título" "corpo"
criar_fechada() {
  if existe "$1"; then echo "  já existe: $1"; return; fi
  url="$(gh issue create --title "$1" --body "$2" --label historia --label retroativo)"
  gh issue close "$url" --reason completed \
    --comment "Registro retroativo: entregue antes de o backlog ir para o GitHub. Ver docs/pi1/08-scrum-e-backlog.md." >/dev/null
  echo "  fechada: $1"
}

# criar_aberta "título" "corpo" "etiqueta"
criar_aberta() {
  if existe "$1"; then echo "  já existe: $1"; return; fi
  gh issue create --title "$1" --body "$2" --label "$3" >/dev/null
  echo "  aberta:  $1"
}

historia() { # id, como, quero, para, aceite, rf
  printf '**Como** %s, **quero** %s, **para** %s.\n\n**Critério de aceite:** %s\n\n**Requisitos:** %s\n' "$2" "$3" "$4" "$5" "$6"
}

echo "Histórias entregues:"
criar_fechada "US01 Buscar equipamento por qualquer parte do nome, PR, marca ou modelo" \
  "$(historia US01 técnico 'buscar um equipamento por qualquer parte do nome, PR, marca ou modelo' 'achar em segundos' '`vostro` encontra "Notebook Dell Vostro 5470"; sem diferença de acento' RF04)"
criar_fechada "US02 Ver o caminho exato do local na ficha" \
  "$(historia US02 técnico 'ver o caminho exato do local na ficha' 'ir direto ao armário certo' 'Ficha mostra Sala → Armário → Prateleira' RF06)"
criar_fechada "US03 Montar a árvore de locais como ela é" \
  "$(historia US03 administrador 'montar a árvore de locais como ela é' 'o sistema refletir a sala real' 'Níveis livres; nome repetido no mesmo nível é recusado' RF13)"
criar_fechada "US04 Emitir cautela tocando nos itens" \
  "$(historia US04 técnico 'emitir uma cautela tocando nos itens' 'não copiar dados à mão' 'Itens escolhidos saem na folha com marca, modelo, série e PR' RF17)"
criar_fechada "US05 Numeração número/ano automática da cautela" \
  "$(historia US05 chefia 'que a cautela tenha número/ano automático' 'achar a folha no arquivo' '300/2026 no primeiro ano; recomeça em 1 no ano seguinte' RF18)"
criar_fechada "US06 Imprimir a folha oficial preenchida" \
  "$(historia US06 técnico 'imprimir a folha oficial preenchida' 'só colher a assinatura' 'Folha idêntica ao formulário; assinaturas em branco' RF19)"
criar_fechada "US07 Cadastrar quem recebe sem sair da cautela" \
  "$(historia US07 técnico 'cadastrar quem recebe sem sair da cautela' 'não perder o atendimento' 'Pessoa criada e já selecionada' RF20)"
criar_fechada "US08 Registrar devolução com o estado de cada item" \
  "$(historia US08 técnico 'registrar a devolução e o estado de cada item' 'saber o que voltou com defeito' 'Cautela encerra; itens Ruim/Danificado ficam em Atenção' RF22)"
criar_fechada "US09 Ver o que está atrasado ou perto de vencer" \
  "$(historia US09 chefia 'ver o que está atrasado ou perto de vencer' 'cobrar a tempo' 'Atrasado em vermelho, Retorno próximo em âmbar, na Home e em Cautelas' RF24)"
criar_fechada "US10 Mudar item de lugar sem emitir cautela" \
  "$(historia US10 técnico 'mudar um item de prateleira sem emitir cautela' 'manter o local certo' 'Histórico registra origem e destino' RF09)"
criar_fechada "US11 Ver o histórico de um equipamento" \
  "$(historia US11 técnico 'ver o histórico de um equipamento' 'saber por onde ele passou' 'Linha do tempo por dia, com quem, o quê e onde' RF30)"
criar_fechada "US12 Gerenciar usuários e senhas (administrador)" \
  "$(historia US12 administrador 'gerenciar usuários e senhas' 'controlar o acesso' 'Usuário comum não vê nem altera dados de conta' 'RF02, RF03')"
criar_fechada "US13 Instalar o PATRI no celular como app" \
  "$(historia US13 técnico 'instalar o PATRI no celular' 'abrir como app, em tela cheia' 'Ícone na tela inicial no Android e no iOS' RNF08)"
criar_fechada "US14 Recuperar item excluído por engano" \
  "$(historia US14 técnico 'recuperar um item excluído por engano' 'não perder o cadastro' 'Lixeira; administrador restaura' RF10)"
criar_fechada "US15 Funcionar sem internet, na rede interna" \
  "$(historia US15 chefia 'que o sistema funcione sem internet' 'usar todo dia sem depender de ninguém' 'Acesso pelo IP do notebook na rede Wi-Fi' RNF06)"
criar_fechada "US16 Backup automático diário" \
  "$(historia US16 chefia 'backup automático' 'não perder dados se o notebook falhar' 'Uma cópia por dia; restauração documentada' RNF12)"

echo "Próximos itens:"
criar_aberta "PB01 Coletar a avaliação da chefia" \
  "Formulário em docs/pi1/10-avaliacao-comunidade.md. Via assinada vai para o AVA, não para o GitHub." disciplina
criar_aberta "PB02 Cópia do backup fora do notebook" \
  "Copiar o backup diário para pen drive ou pasta de rede do órgão." tecnico
criar_aberta "PB03 Guardar no repositório os testes ponta a ponta" \
  "Versionar os testes usados durante o desenvolvimento, com instrução de como rodar." tecnico
criar_aberta "PB04 Verificação automática a cada envio ao GitHub" \
  "GitHub Actions compilando frontend e servidor em todo push. Sem publicação automática." tecnico
criar_aberta "PB05 Senha provisória com troca no primeiro acesso" \
  "Ideia: hoje o administrador conhece a senha de todos. Só entra com aprovação da chefia." ideia
criar_aberta "PB06 Modo de conferência de inventário por local" \
  "Ideia: listar os itens esperados num local e marcar os encontrados. Só entra com aprovação da chefia." ideia
criar_aberta "PB07 Relatório de cautelas por período" \
  "Ideia. Só entra com aprovação da chefia." ideia

echo
echo "Pronto. Abra a aba Issues do repositório para conferir."
