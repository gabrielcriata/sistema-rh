// =========================================================
// NAVEGAÇÃO E INTERFACE
// =========================================================

function carregarPagina(url, elementoClicado) {
    const frame = document.getElementById('conteudo-frame');
    const titulo = document.getElementById('titulo-pagina');

    if (!frame || !elementoClicado) return;

    // 1. Muda a página dentro do iframe
    frame.src = url;

    // 2. Gerencia o estado 'active' no menu
    document.querySelectorAll('.menu-item').forEach(menu => {
        menu.classList.remove('active');
    });
    elementoClicado.classList.add('active');

    // 3. Atualiza o título (remove emojis e limpa espaços)
    let textoBotao = elementoClicado.innerText.replace(/[^\w\sÀ-ÿ]/gi, '').trim();
    if (titulo) {
        titulo.innerText = textoBotao.toUpperCase();
    }
    
    console.log(`📂 Navegando para: ${textoBotao}`);
}

// Utilitário para notificações na tela
function notificar(texto, tipo = 'sucesso') {
    const msg = document.getElementById('msgSucesso');
    if (!msg) return;
    msg.innerText = texto;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
}

// =========================================================
// MOTOR DO ESPELHO DE SEGURANÇA (IndexedDB)
// =========================================================

const MirrorDB = {
    name: "HCM_Mirror_DB",
    version: 1,
    store: "backups",
    // Chaves importantes que o sistema utiliza
    keys: ['rhFuncionarios', 'rhTabelasFiscais', 'rhDocumentos', 'rhFaltas', 'rhEventos', 'rhEventosRH'],
    
    abrir() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);
            request.onupgradeneeded = e => e.target.result.createObjectStore(this.store);
            request.onsuccess = e => resolve(e.target.result);
            request.onerror = e => reject(e.target.error);
        });
    },

    async salvarAutomatico() {
        const backup = {};
        this.keys.forEach(k => {
            const d = localStorage.getItem(k);
            if(d) backup[k] = JSON.parse(d);
        });
        
        try {
            const db = await this.abrir();
            const tx = db.transaction(this.store, "readwrite");
            tx.objectStore(this.store).put(backup, "ultimo_backup_automatico");
            console.log("🛡️ Espelho de Segurança sincronizado.");
        } catch (err) {
            console.error("Erro ao salvar espelho:", err);
        }
    },

    async restaurar() {
        const db = await this.abrir();
        return new Promise((resolve) => {
            const request = db.transaction(this.store).objectStore(this.store).get("ultimo_backup_automatico");
            request.onsuccess = () => {
                const dados = request.result;
                if (dados) {
                    Object.keys(dados).forEach(k => localStorage.setItem(k, JSON.stringify(dados[k])));
                    resolve(true);
                } else resolve(false);
            };
        });
    }
};

// =========================================================
// CALCULADORA FISCAL CENTRALIZADA
// =========================================================

const CalculadoraRH = {
    calcularINSS(salarioBruto, config) {
        if (!config || !config.inss) return { valor: 0, ref: "Erro" };
        let s = Math.min(salarioBruto, config.inss.teto4);
        let desconto = 0;
        
        if (s > 0) desconto += Math.min(s, config.inss.teto1) * 0.075;
        if (s > config.inss.teto1) desconto += (Math.min(s, config.inss.teto2) - config.inss.teto1) * 0.09;
        if (s > config.inss.teto2) desconto += (Math.min(s, config.inss.teto3) - config.inss.teto2) * 0.12;
        if (s > config.inss.teto3) desconto += (s - config.inss.teto3) * 0.14;

        return { valor: desconto, ref: salarioBruto > config.inss.teto4 ? "Teto" : "Prog." };
    },

    calcularIRRF(salarioBruto, descontoINSS, dependentes, config) {
        if (!config || !config.irrf) return { valor: 0, ref: "Erro" };
        const deducaoDep = config.geral ? config.geral.deducaoDependente : 189.59;
        const base = salarioBruto - descontoINSS - (dependentes * deducaoDep);
        
        // Regra Especial Araçatuba/2026 (conforme seu projeto)
        if (salarioBruto <= 5000) return { valor: 0, ref: "Isento (2026)" };
        
        let irNormal = 0;
        if (base > config.irrf.teto4) irNormal = (base * 0.275) - config.irrf.ded5;
        else if (base > config.irrf.teto3) irNormal = (base * 0.225) - config.irrf.ded4;
        else if (base > config.irrf.teto2) irNormal = (base * 0.15) - config.irrf.ded3;
        else if (base > config.irrf.teto1) irNormal = (base * 0.075) - config.irrf.ded2;

        if (salarioBruto <= 7350) {
            const reducao = 978.62 - (0.133145 * salarioBruto);
            return { valor: Math.max(0, irNormal - reducao), ref: "Reduzido" };
        }
        return { valor: Math.max(0, irNormal), ref: "Normal" };
    }
};
