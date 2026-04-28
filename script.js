function carregarPagina(url, elementoClicado) {
    // Muda a página dentro do iframe
    document.getElementById('conteudo-frame').src = url;

    // Remove a classe 'active' de todos os botões do menu
    let menus = document.getElementsByClassName('menu-item');
    for (let i = 0; i < menus.length; i++) {
        menus[i].classList.remove('active');
    }

    // Adiciona a classe 'active' apenas no botão que foi clicado
    elementoClicado.classList.add('active');

    // Muda o título lá em cima dependendo do menu
    document.getElementById('titulo-pagina').innerText = elementoClicado.innerText.substring(3).toUpperCase();
}
