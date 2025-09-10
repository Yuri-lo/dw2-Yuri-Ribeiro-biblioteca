from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, validator

from . import models
from .database import SessionLocal, engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Biblioteca Escolar API")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


class LivroBase(BaseModel):
	titulo: str = Field(..., min_length=3, max_length=90)
	autor: str
	ano: int
	genero: Optional[str] = None
	isbn: Optional[str] = None
	status: str = Field(...)

	@validator('ano')
	def ano_range(cls, v):
		from datetime import datetime
		if v < 1900 or v > datetime.utcnow().year:
			raise ValueError('Ano fora do intervalo')
		return v


class LivroCreate(LivroBase):
	pass


class LivroUpdate(LivroBase):
	pass


class LivroOut(LivroBase):
	id: int
	data_emprestimo: Optional[datetime] = None

	class Config:
		orm_mode = True


def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


@app.get("/livros", response_model=List[LivroOut])
def list_livros(search: Optional[str] = None, genero: Optional[str] = None, ano: Optional[int] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
	q = db.query(models.Livro)
	if search:
		like = f"%{search}%"
		q = q.filter((models.Livro.titulo.ilike(like)) | (models.Livro.autor.ilike(like)))
	if genero:
		q = q.filter(models.Livro.genero == genero)
	if ano:
		q = q.filter(models.Livro.ano == ano)
	if status:
		q = q.filter(models.Livro.status == status)
	return q.all()


@app.post("/livros", response_model=LivroOut)
def create_livro(livro: LivroCreate, db: Session = Depends(get_db)):
	db_l = models.Livro(**livro.dict())
	db.add(db_l)
	db.commit()
	db.refresh(db_l)
	return db_l


@app.put("/livros/{livro_id}", response_model=LivroOut)
def update_livro(livro_id: int, livro: LivroUpdate, db: Session = Depends(get_db)):
	db_l = db.query(models.Livro).filter(models.Livro.id == livro_id).first()
	if not db_l:
		raise HTTPException(status_code=404, detail="Livro não encontrado")
	for k, v in livro.dict().items():
		setattr(db_l, k, v)
	db.commit()
	db.refresh(db_l)
	return db_l


@app.delete("/livros/{livro_id}")
def delete_livro(livro_id: int, db: Session = Depends(get_db)):
	db_l = db.query(models.Livro).filter(models.Livro.id == livro_id).first()
	if not db_l:
		raise HTTPException(status_code=404, detail="Livro não encontrado")
	db.delete(db_l)
	db.commit()
	return {"ok": True}


@app.post("/livros/{livro_id}/emprestar", response_model=LivroOut)
def emprestar(livro_id: int, db: Session = Depends(get_db)):
	db_l = db.query(models.Livro).filter(models.Livro.id == livro_id).first()
	if not db_l:
		raise HTTPException(status_code=404, detail="Livro não encontrado")
	if db_l.status == "emprestado":
		raise HTTPException(status_code=400, detail="Livro já emprestado")
	db_l.status = "emprestado"
	db_l.data_emprestimo = datetime.utcnow()
	db.commit()
	db.refresh(db_l)
	return db_l


@app.post("/livros/{livro_id}/devolver", response_model=LivroOut)
def devolver(livro_id: int, db: Session = Depends(get_db)):
	db_l = db.query(models.Livro).filter(models.Livro.id == livro_id).first()
	if not db_l:
		raise HTTPException(status_code=404, detail="Livro não encontrado")
	db_l.status = "disponivel"
	db_l.data_emprestimo = None
	db.commit()
	db.refresh(db_l)
	return db_l

