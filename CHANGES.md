# Mudanças nesta versão

Correções de bugs, interface simplificada e IA mais inteligente. Testada ponta a ponta (18 testes de API + fluxos no browser).

## Bugs corrigidos

1. **"Organizar commits" falhava** ("A IA não retornou texto válido") — o endpoint agora aceita respostas em array (`{"text":[...]}`, `{"lines":[...]}`), JSON dentro de cercas de código e texto puro, além de tentar uma segunda vez com instrução reforçada quando o Gemini responde fora do formato.
2. **Resumo trocava o idioma** — a instrução agora exige responder no mesmo idioma da entrada.
3. **Commits da branch ≠ commits da release** — o changelog agora usa a Compare API (`tagAnterior...tagNova`), ou seja, só o que realmente entrou na versão publicada.
4. **Changelog com mudanças que não estão no ZIP** — quando não há compare e a release não descreve mudanças, o changelog fica vazio em vez de "inventar" com commits da branch.
5. **Guarda anti-edição travava o fluxo da caixa única** — o campo do repositório agora é sincronizado ao usar a caixa única.
6. **Mensagem de sucesso sobrescrevia erro** — as funções de análise agora sinalizam sucesso/falha.
7. **GitHub anônimo (60 req/h por IP)** — suporte a `GITHUB_TOKEN` (5.000/h) + cache de borda de 30 min com revalidação de 24 h.
8. **Prévia "sticky" ficava inacessível** quando o painel era maior que a tela — agora tem altura máxima e rolagem interna.

## Mais simples para quem posta

- **Caixa única "Comece colando qualquer coisa"**: detecta automaticamente se o conteúdo é link do GitHub, commits, post antigo ou ZIP (arrastar/soltar ou Ctrl+V) e preenche o post. O usuário vira revisor, não digitador.
- **Banner e Rodapé colapsados** por padrão; o formulário essencial vem primeiro.
- **Perfil do canal**: By/Follow/Join ficam salvos no navegador e são reaplicados a cada "Novo post".
- **Labels em maiúsculas e campos com borda**: hierarquia e contraste claros nos dois temas.
- **Hashtags em chips** com remoção por clique.
- **Data do lançamento em linha própria** (sem célula vazia ao lado).

## IA mais inteligente

- **Base com 640 codinomes de dispositivos** (índice público do wiki do LineageOS): autocomplete no campo Dispositivo (digite "poco" → POCO F3 · alioth), hashtags corretas e validação do que a IA devolve.
- **Hints determinísticos** para a IA: nome da ROM pela organização, versão pela tag da release e codinome pelo nome do repositório — a IA escreve, o código extrai os fatos.
- **Verificador de changelog** (botão "Verificar"): confere linha por linha contra os commits originais e aponta o que não tem suporte antes de publicar.
- **Memória de estilo**: cole 1–2 posts antigos do seu canal (painel avançado) e a IA imita o formato e o tom deles ao gerar changelogs e posts — sua ideia de "aprender com posts do Telegram", feita de forma viável (não existe API pública de busca no Telegram).
- **ZIP mais esperto**: além de Android e dispositivo, lê `ro.lineage.version` / `ro.crdroid.version` / `ro.pixelos.version` / `ro.modversion` (nome e versão da ROM) e `ro.build.date.utc` (data).
- **Novas tasks na API**: `compose` (montar post a partir de fatos) e `verify` (juiz do changelog), com limite de 10 req/min por IP.

## Outros

- **Gerador de banner** em canvas (1280×640): gradiente, nome da ROM, versão, dispositivo, badge de build e data — baixa em PNG.
- **README** completo com instruções e variáveis de ambiente.
- **Testes automatizados** dos handlers (`node scripts/test-ai.js`, `node scripts/test-repository.js`) e script para regenerar a base de dispositivos (`python3 scripts/build-devices.py`).

## Deploy

1. Faça push destes arquivos para o repositório (a Vercel faz o deploy automático).
2. Confirme `GEMINI_API_KEY` nas variáveis de ambiente (já usada hoje).
3. Opcional: adicione `GITHUB_TOKEN` (token sem nenhuma permissão basta) para 5.000 consultas/hora ao GitHub.
