function carregarPagina(url, elementoClicado) {
    const frame = document.getElementById('conteudo-frame');
    const titulo = document.getElementById('titulo-pagina');

    // 1. Validação de segurança
    if (!frame || !elementoClicado) return;

    // 2. Muda a página dentro do iframe
    frame.src = url;

    // 3. Gerencia o estado 'active' (usando seletores modernos)
    document.querySelectorAll('.menu-item').forEach(menu => {
        menu.classList.remove('active');
    });

    // 4. Ativa o botão clicado
    elementoClicado.classList.add('active');

    // 5. Atualiza o título dinamicamente
    // Em vez de substring(3), usamos trim() e removemos emojis/ícones de forma mais segura
    let textoBotao = elementoClicado.innerText.replace(/[^\w\sÀ-ÿ]/gi, '').trim();
    if (titulo) {
        titulo.innerText = textoBotao.toUpperCase();
    }
    
    console.log(`📂 Navegando para: ${textoBotao}`);
}
