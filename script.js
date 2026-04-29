// =========================================================
// 1. NAVEGAÇÃO E INTERFACE
// =========================================================
function carregarPagina(url, elementoClicado) {
    const frame = document.getElementById('conteudo-frame');
    const titulo = document.getElementById('titulo-pagina');
    if (!frame || !elementoClicado) return;

    frame.src = url;

    // Gerencia o estado ativo do menu
    document.querySelectorAll('.menu-item').forEach(menu => menu.classList.remove('active'));
    elementoClicado.classList.add('active');

    // Limpa o título (remove emojis e espaços)
    let textoBotao = elementoClicado.innerText.replace(/[^\w\sÀ-ÿ]/gi, '').trim();
    if (titulo) titulo.innerText = textoBotao.toUpperCase();
}

// Notificações flutuantes padrão
function notificar(texto, tipo = 'sucesso') {
    const msg = document.getElementById('msgSucesso');
    if (!msg) return;
    msg.innerText = texto;
    msg.style.display = 'block';
    msg.style.backgroundColor = tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    msg.style.color = tipo === 'sucesso' ? '#10b981' : '#ef4444';
    setTimeout(() => msg.style.display = 'none', 3000);
}

// =========================================================
// 2. ESPELHO DE SEGURANÇA (MirrorDB)
// =========================================================
const MirrorDB = {
    name: "HCM_Mirror_DB",
    version: 1,
    store: "backups",
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
        const db = await this.abrir();
        const tx = db.transaction(this.store, "readwrite");
        tx.objectStore(this.store).put(backup, "ultimo_backup_automatico");
        console.log("🛡️ Espelho sincronizado.");
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
// 3. CALCULADORA FISCAL (REGRAS 2026)
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
        if (salarioBruto <= 5000) return { valor: 0, ref: "Isento" };
        
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
