# rompost.

Gere posts de custom ROM prontos para o Telegram: links clicáveis, prévia em tempo real e IA que monta o post a partir de um link do GitHub, de commits, de um post antigo ou do próprio ZIP da ROM. Sem login, sem cadastro — o rascunho fica no seu navegador.

**https://rompostby-gm.vercel.app/**

## Como usar

1. **Cole qualquer coisa** na caixa "Comece colando qualquer coisa":
   - link de um repositório público do GitHub → a IA busca release, commits e ZIP e preenche o post;
   - mensagens de commits → vira changelog em inglês técnico;
   - um post antigo do seu canal → os campos são extraídos e reeditáveis;
   - arraste/solte (ou Ctrl+V) o **ZIP da ROM** → nome da ROM, versão, Android, dispositivo e data são lidos localmente, sem upload.
2. Confira os campos, ajuste o que quiser e copie. A prévia mostra exatamente como o post sai no Telegram (legenda de 1.024 ou mensagem de 4.096 caracteres).

## Recursos

- **Caixa única com detecção automática** do tipo de conteúdo (repositório, commits, post antigo ou ZIP).
- **Commits da release, não da branch**: usa a Compare API do GitHub para gerar changelog só com o que entrou naquela versão.
- **Base com 640+ codinomes de dispositivos** (índice público do wiki do LineageOS): autocomplete no campo Dispositivo e hashtags corretas.
- **Verificador de changelog**: cada linha é conferida contra os commits originais pela IA antes de você publicar.
- **Memória de estilo**: cole 1–2 posts antigos do seu canal e a IA imita o formato e o tom deles.
- **Gerador de banner** em canvas: banner pronto com ROM, versão, dispositivo e build — baixa em PNG.
- **Perfil do canal**: By/Follow/Join ficam salvos e são reaplicados em cada novo post.
- Tradução de trechos preservando links, `@menções` e marcação; resumo de changelog; hashtags como chips; temas claro/escuro; funciona em celular.
- ZIP e banner nunca são enviados para servidor algum: leitura 100% local no navegador.

## Segurança e privacidade

- Sem login, sem cookies de rastreamento, sem banco de dados.
- Apenas dois endpoints serverless: `/api/ai` (Gemini, com limite de requisições por IP) e `/api/repository` (API pública do GitHub). Nada mais sai do seu navegador.
- Textos enviados à IA podem ser usados pelo Google para melhorar o serviço — não cole informação privada.

## Desenvolvimento

Projeto de uma página só, sem dependências e sem build:

```
index.html        markup
app.js            toda a lógica (estado, IA, ZIP, prévia, cópia)
styles.css        temas claro/escuro
devices.js        base de codinomes (gerada)
api/ai.js         endpoint Gemini (changelog, organize, summarize, import, translate, repository, compose, verify)
api/repository.js endpoint de metadados do GitHub (readme, releases, compare, ZIP assets)
scripts/build-devices.py  regenera devices.js do wiki do LineageOS
```

Variáveis de ambiente na Vercel:

- `GEMINI_API_KEY` — obrigatória para os recursos de IA (chave gratuita do Google AI Studio).
- `GITHUB_TOKEN` — opcional; aumenta o limite da API do GitHub de 60 para 5.000 consultas/hora e evita falhas em horários de pico.

Testes dos handlers (com mocks, sem chaves): `node scripts/test-ai.js` e `node scripts/test-repository.js` na raiz de desenvolvimento.

Deploy: fork → import na Vercel → definir as variáveis → pronto.

## Créditos

- Índice de dispositivos: [The LineageOS Project](https://wiki.lineageos.org/) (CC BY-SA 3.0).
- Feito por [@GMNevz](https://t.me/GMNevz).
