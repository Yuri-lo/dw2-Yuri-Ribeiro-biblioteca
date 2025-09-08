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
  subset.forEach(l => {
    const div = document.createElement('div');
    div.className='card';
    div.innerHTML = `<h4>${escapeHtml(l.titulo)}</h4><div>${escapeHtml(l.autor)} — ${l.ano}</div><div>Status: ${l.status}</div><div style="margin-top:8px"><button data-id="${l.id}" class="edit">Editar</button> <button data-id="${l.id}" class="del">Apagar</button> <button data-id="${l.id}" class="loan">Emprestar/Devolver</button></div>`;
    container.appendChild(div);
  });
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
