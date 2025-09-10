const API = "http://127.0.0.1:8000";
let livros = [];
let page = 1;
const perPage = 10;
// ordenação persistida
const SORT_KEY = 'biblioteca_sort';
let sort = JSON.parse(localStorage.getItem(SORT_KEY) || '{"by":"titulo","dir":"asc"}');

async function fetchLivros(){
  const q = new URLSearchParams();
  const search = document.getElementById('searchInput').value.trim();
  const genero = document.getElementById('filterGenero').value;
  const ano = document.getElementById('filterAno').value;
  const status = document.getElementById('filterStatus').value;
  if(search) q.set('search', search);
  if(genero) q.set('genero', genero);
  if(ano) q.set('ano', ano);
  if(status) q.set('status', status);
  const res = await fetch(`${API}/livros?${q.toString()}`);
  livros = await res.json();
  applySort();
  renderCards();
}

function renderCards(){
  populateFilters();
  const start = (page-1)*perPage;
  const subset = livros.slice(start, start+perPage);
  const container = document.getElementById('cards');
  container.innerHTML = '';
    if(subset.length === 0){
      container.innerHTML = '<div class="empty">Nenhum livro encontrado.</div>';
    } else {
      subset.forEach(l => {
        const div = document.createElement('div');
        div.className='card';
        div.innerHTML = `
          <div class="card-body">
            <h4 class="card-title">${escapeHtml(l.titulo)}</h4>
            <div class="card-meta">Autor: <span class="autor">${escapeHtml(l.autor)}</span> — Ano: <span class="ano">${l.ano}</span></div>
            <div class="card-status">Status: <span class="badge ${l.status}">${escapeHtml(l.status)}</span></div>
            ${l.data_emprestimo ? `<div class="card-loan">Emprestado em: ${new Date(l.data_emprestimo).toLocaleString()}</div>` : ''}
            <div class="card-footer">
              <button data-id="${l.id}" class="edit">Editar</button>
              <button data-id="${l.id}" class="del">Apagar</button>
              <button data-id="${l.id}" class="loan">Emprestar/Devolver</button>
            </div>
          </div>`;
        container.appendChild(div);
      });
    }
  document.getElementById('pageInfo').textContent = `${page}`;
  attachCardHandlers();
}

function escapeHtml(s){ return (s||'').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// pagination
document.getElementById('prevPage').addEventListener('click', ()=>{ if(page>1){page--; renderCards();}})
document.getElementById('nextPage').addEventListener('click', ()=>{ if(page*perPage<livros.length){page++; renderCards();}})

// search/filter
['searchInput','filterGenero','filterAno','filterStatus'].forEach(id=>{
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('change', ()=>{ page=1; fetchLivros(); })
  el.addEventListener('keyup', (e)=>{ if(e.key==='Enter'){ page=1; fetchLivros(); }})
})

// ordenação UI
function ensureSortControls(){
  let container = document.querySelector('.controls');
  if(!container){
    const main = document.querySelector('.main-list');
    container = document.createElement('div'); container.className='controls';
    const left = document.createElement('div');
    const right = document.createElement('div');
    left.innerHTML = `<label>Ordenar: <select id="sortBy"><option value="titulo">Título</option><option value="ano">Ano</option></select></label>`;
    right.innerHTML = `<label>Direção: <select id="sortDir"><option value="asc">Asc</option><option value="desc">Desc</option></select></label>`;
    container.appendChild(left); container.appendChild(right);
    main.prepend(container);
    document.getElementById('sortBy').value = sort.by;
    document.getElementById('sortDir').value = sort.dir;
    document.getElementById('sortBy').addEventListener('change', (e)=>{ sort.by = e.target.value; saveSort(); applySort(); renderCards(); });
    document.getElementById('sortDir').addEventListener('change', (e)=>{ sort.dir = e.target.value; saveSort(); applySort(); renderCards(); });
  }
}

function saveSort(){ localStorage.setItem(SORT_KEY, JSON.stringify(sort)); }

function applySort(){
  if(!livros || !livros.length) return;
  const by = sort.by || 'titulo';
  const dir = sort.dir === 'desc' ? -1 : 1;
  livros.sort((a,b)=>{
    let A = a[by]; let B = b[by];
    if(by==='titulo' || by==='autor' || by==='genero'){ A = (A||'').toString().toLowerCase(); B = (B||'').toString().toLowerCase(); if(A<B) return -1*dir; if(A>B) return 1*dir; return 0 }
    return ( (A||0) - (B||0) ) * dir;
  });
}

function populateFilters(){
  // popula gênero e ano com base nos livros
  const gSel = document.getElementById('filterGenero');
  const aSel = document.getElementById('filterAno');
  if(!gSel || !aSel) return;
  const generos = Array.from(new Set(livros.map(l=>l.genero).filter(Boolean))).sort();
  gSel.innerHTML = '<option value="">Todos</option>' + generos.map(g=>`<option value="${g}">${g}</option>`).join('');
  const anos = Array.from(new Set(livros.map(l=>l.ano).filter(Boolean))).sort((a,b)=>b-a);
  aSel.innerHTML = '<option value="">Todos</option>' + anos.map(y=>`<option value="${y}">${y}</option>`).join('');
}

// modal new
const modal = document.getElementById('modal');
const newBtn = document.getElementById('newBtn');
if(newBtn) newBtn.addEventListener('click', ()=>{ openModal(); })

// Ctrl+N also opens the new book modal
window.addEventListener('keydown', (e)=>{ if(e.ctrlKey && e.key.toLowerCase()==='n'){ e.preventDefault(); openModal(); } })

function openModal(livro){
  document.getElementById('modalTitle').textContent = livro? 'Editar Livro' : 'Novo Livro';
  document.getElementById('titulo').value = livro?.titulo || '';
  document.getElementById('autor').value = livro?.autor || '';
  document.getElementById('ano').value = livro?.ano || '';
  document.getElementById('genero').value = livro?.genero || '';
  document.getElementById('isbn').value = livro?.isbn || '';
  document.getElementById('status').value = livro?.status || 'disponivel';
  // store editing id on dialog dataset
  modal.dataset.editing = livro?.id ? String(livro.id) : '';
  populateModalGenres();
  modal.showModal();
}

document.getElementById('cancelBtn').addEventListener('click', ()=> modal.close());

// save
document.getElementById('saveBtn').addEventListener('click', async (e)=>{
  e.preventDefault();
  const payload = {
    titulo: document.getElementById('titulo').value.trim(),
    autor: document.getElementById('autor').value.trim(),
    ano: parseInt(document.getElementById('ano').value,10),
    genero: document.getElementById('genero').value,
    isbn: document.getElementById('isbn').value.trim(),
    status: document.getElementById('status').value,
  };
  // front validations
  if(payload.titulo.length<3 || payload.titulo.length>90){ alert('Título inválido'); return }
  if(!payload.autor){ alert('Autor obrigatório'); return }
  if(!payload.ano || payload.ano <1900 || payload.ano> new Date().getFullYear()){ alert('Ano inválido'); return }
  // prevent duplicate title locally
  if(livros.some(l=> l.titulo.toLowerCase()===payload.titulo.toLowerCase())){ if(!confirm('Título já existe localmente. Continuar?')) return }
  // create or update
  const editingId = modal.dataset.editing;
  let res;
  if(editingId){
    res = await fetch(`${API}/livros/${editingId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  } else {
    res = await fetch(`${API}/livros`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  }
  if(res.ok){ modal.close(); modal.dataset.editing=''; fetchLivros(); }else{ const err = await res.json(); alert(err.detail || 'Erro'); }
})

// keyboard shortcut Alt+N
window.addEventListener('keydown', (e)=>{ if(e.altKey && e.key.toLowerCase()==='n'){ openModal(); } })

// export
document.getElementById('exportCsv').addEventListener('click', ()=>{
  const rows = livros.map(l=> [l.id, l.titulo, l.autor, l.ano, l.genero, l.status]
    .map(v=> '"' + (v||'').toString().replace(/"/g,'""') + '"').join(','));
  const csv = 'id,titulo,autor,ano,genero,status\n' + rows.join('\n');
  download('livros.csv', csv, 'text/csv');
})

document.getElementById('exportJson').addEventListener('click', ()=>{
  download('livros.json', JSON.stringify(livros, null, 2), 'application/json');
})

function download(name, data, type){
  const blob = new Blob([data], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function attachCardHandlers(){
  const container = document.getElementById('cards');
  container.querySelectorAll('button.edit').forEach(b=>{
    b.onclick = ()=>{
      const id = Number(b.dataset.id);
      const livro = livros.find(x=>x.id===id);
      openModal(livro);
    }
  });
  container.querySelectorAll('button.del').forEach(b=>{
    b.onclick = async ()=>{
      if(!confirm('Remover este livro?')) return;
      const id = Number(b.dataset.id);
      const res = await fetch(`${API}/livros/${id}`, {method:'DELETE'});
      if(res.ok){ fetchLivros(); }else{ const err = await res.json(); alert(err.detail || 'Erro'); }
    }
  });
  container.querySelectorAll('button.loan').forEach(b=>{
    b.onclick = async ()=>{
      const id = Number(b.dataset.id);
      const livro = livros.find(x=>x.id===id);
      if(!livro) return;
      if(livro.status === 'disponivel'){
        const res = await fetch(`${API}/livros/${id}/emprestar`, {method:'POST'});
        if(res.ok){ fetchLivros(); } else { const err = await res.json(); alert(err.detail || 'Erro'); }
      } else {
        const res = await fetch(`${API}/livros/${id}/devolver`, {method:'POST'});
        if(res.ok){ fetchLivros(); } else { const err = await res.json(); alert(err.detail || 'Erro'); }
      }
    }
  });
}

function populateModalGenres(){
  const slot = document.getElementById('genero');
  const genres = Array.from(new Set(livros.map(l=>l.genero).filter(Boolean))).sort();
  if(!slot) return;
  // keep current selection
  const cur = slot.value;
  slot.innerHTML = '<option value="">(Escolher)</option>' + genres.map(g=>`<option value="${g}">${g}</option>`).join('');
  if(cur) slot.value = cur;
}

// init
ensureSortControls();
fetchLivros();

// --- Assistente local (heurístico) ---
const assistantBtn = document.getElementById('assistantBtn');
const assistantModal = document.getElementById('assistantModal');
const assistantInput = document.getElementById('assistantInput');
const assistantResults = document.getElementById('assistantResults');
const assistantClose = document.getElementById('assistantClose');
const assistantAsk = document.getElementById('assistantAsk');


assistantBtn?.addEventListener('click', ()=>{ assistantModal.showModal(); setTimeout(()=>assistantInput?.focus(),50); });
assistantClose?.addEventListener('click', ()=> assistantModal.close());

assistantAsk?.addEventListener('click', ()=> runAssistant());
assistantInput?.addEventListener('keyup', (e)=>{ if(e.key==='Enter') runAssistant(); })

// ensure focus on first input when opening new-book modal
function openModal(livro){
  document.getElementById('modalTitle').textContent = livro? 'Editar Livro' : 'Novo Livro';
  document.getElementById('titulo').value = livro?.titulo || '';
  document.getElementById('autor').value = livro?.autor || '';
  document.getElementById('ano').value = livro?.ano || '';
  document.getElementById('genero').value = livro?.genero || '';
  document.getElementById('isbn').value = livro?.isbn || '';
  document.getElementById('status').value = livro?.status || 'disponivel';
  // store editing id on dialog dataset
  modal.dataset.editing = livro?.id ? String(livro.id) : '';
  populateModalGenres();
  modal.showModal();
  setTimeout(()=>document.getElementById('titulo')?.focus(),50);
}

function runAssistant(){
  const q = (assistantInput.value||'').trim().toLowerCase();
  assistantResults.innerHTML = '';
  if(!q){ assistantResults.innerHTML = '<div class="assistant-result muted">Escreva algo.</div>'; return }
  // intent: recommend by genre
  if(q.startsWith('recomende') || q.startsWith('recomenda')){
    const parts = q.split(' ');
    const genre = parts[1] || '';
    const matches = livros.filter(l=> (l.genero||'').toLowerCase().includes(genre));
    if(matches.length===0) assistantResults.innerHTML = '<div class="assistant-result muted">Nenhuma recomendação encontrada.</div>';
    else assistantResults.innerHTML = matches.slice(0,6).map(m=>`<div class="assistant-result"><strong>${escapeHtml(m.titulo)}</strong> — ${escapeHtml(m.autor)} <span class="assistant-highlight">${m.genero}</span></div>`).join('');
    return;
  }
  // intent: buscar
  if(q.startsWith('buscar') || q.startsWith('procure') || q.startsWith('buscar por')){
    const term = q.replace(/^(buscar|procure|buscar por)\s*/,'');
    const matches = livros.filter(l=> (l.titulo||'').toLowerCase().includes(term) || (l.autor||'').toLowerCase().includes(term));
    if(matches.length===0) assistantResults.innerHTML = '<div class="assistant-result muted">Nenhum livro corresponde à busca.</div>';
    else assistantResults.innerHTML = matches.map(m=>`<div class="assistant-result"><strong>${escapeHtml(m.titulo)}</strong><br/><small>${escapeHtml(m.autor)} — ${m.ano}</small></div>`).join('');
    return;
  }
  // intent: resumo (very small heuristic)
  if(q.startsWith('resuma') || q.startsWith('resumo')){
    const title = q.replace(/^(resuma|resumo)\s*/,'');
    const book = livros.find(l=> (l.titulo||'').toLowerCase()===title);
    if(!book){ assistantResults.innerHTML = '<div class="assistant-result muted">Livro não encontrado para resumo.</div>'; return }
    assistantResults.innerHTML = `<div class="assistant-result"><strong>Resumo sugerido</strong><div style="margin-top:6px">Resumo breve gerado localmente para <em>${escapeHtml(book.titulo)}</em>: obra de ${escapeHtml(book.autor)} publicada em ${book.ano}.</div></div>`;
    return;
  }
  // fallback: simple QA
  assistantResults.innerHTML = '<div class="assistant-result muted">Comando não reconhecido. Tente: "recomende <gênero>", "buscar <termo>", "resuma <título>"</div>';
}
