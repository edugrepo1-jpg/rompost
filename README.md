# ROMPost — Material 3 · claro e escuro

Gerador de posts de Custom ROM para Telegram. Página única, sem login, sem backend e sem dependências de build.

## Publicar na Vercel

1. Extraia o ZIP. Envie `index.html`, `app.js`, `styles.css`, `favicon.svg` e `vercel.json` para a **raiz** do repositório no GitHub.
2. Importe em https://vercel.com/new e escolha **Framework Preset: Other**.
3. Deixe o comando de build vazio. Se a Vercel pedir diretório de saída, use `.` (a raiz do projeto).
4. Clique em **Deploy**.

Para executar localmente: nesta pasta, rode `python -m http.server 8000` e abra http://localhost:8000.

## Como usar

1. Selecione o banner (opcional), preencha ROM, versão, Android, build e dispositivo.
2. Preencha a URL de `Download` e as demais que quiser, incluindo links personalizados.
3. Escreva o Changelog, Notes e Credits. Para criar um link em qualquer texto, use `[Texto](https://exemplo.com)`; menções como `@developer1` são convertidas em links de perfil/grupo do Telegram.
4. Escolha **Legenda** (texto com a imagem) ou **Mensagem** (texto separado). A prévia se ajusta.
5. Clique em **Copiar post**. No Telegram, **anexe manualmente o banner** e cole o conteúdo. Confira se os hyperlinks foram mantidos antes de publicar.
6. Se o aplicativo não preservar a formatação, clique em **Copiar com URLs visíveis**.

## Observações

- O botão **Copiar post** tenta colocar HTML formatado e texto simples na área de transferência. A preservação de formatação e hyperlinks **depende do Telegram e do navegador**; não é garantida em todas as versões.
- A imagem é usada apenas na prévia e **não é copiada com a legenda**. Se o rascunho for reaberto, selecione novamente o banner.
- O contador usa os limites **padrão de referência** de 1.024 caracteres para legendas e 4.096 para mensagens; são estimativas e podem variar por cliente/conta. A alternativa com URLs visíveis também pode ser mais longa, e o site avisa quando exceder o limite escolhido.
- O rascunho em texto e a preferência por tema claro/escuro ficam no armazenamento local do navegador. O banner não é salvo.
- A assinatura exata **`Post Gerado by @GMNevz`** é adicionada ao conteúdo copiado, mas não aparece no editor nem na prévia.
- Nenhum dado de formulário é enviado para um backend. O site carrega apenas arquivos estáticos e fontes do Google Fonts; essas fontes fazem requisições externas. Para removê-las, apague os links do Google Fonts no `index.html`.

## Revisão da versão

- Campos Android e build iniciam em branco para evitar informações incorretas.
- Data apagada permanece vazia ao reabrir o rascunho; rótulo de lançamento alinhado com `Released` no post.
- Links inválidos ou incompletos são sinalizados, inclusive URLs inseguras.
- Formatação `**negrito**` corrigida em listas; e-mails não viram menções por engano.
- Prévia diferencia legenda de mensagem separada; contador inclui a assinatura automática.
- Testes automatizados no Chromium cobriram cópia rica, hyperlinks, texto simples, tema, rascunho, imagem e layouts de 320 a 1.280 px. A colagem dentro do aplicativo Telegram ainda exige teste manual.
