from .database import SessionLocal, engine, Base
from .models import Livro
from datetime import datetime, timedelta


def seed():
	Base.metadata.create_all(bind=engine)
	db = SessionLocal()
	if db.query(Livro).count() > 0:
		print('Já populado')
		return
	now = datetime.utcnow()
	samples = [
		{"titulo":"O Pequeno Príncipe","autor":"Antoine de Saint-Exupéry","ano":1943,"genero":"Infantil","isbn":"","status":"disponivel"},
		{"titulo":"Dom Casmurro","autor":"Machado de Assis","ano":1899,"genero":"Romance","isbn":"","status":"disponivel"},
		{"titulo":"Introdução ao Python","autor":"Guido van Rossum","ano":2010,"genero":"Tecnologia","isbn":"","status":"disponivel"},
		{"titulo":"História do Brasil","autor":"Exemplo Autor","ano":2015,"genero":"História","isbn":"","status":"disponivel"},
		{"titulo":"Ciência para Todos","autor":"Maria Silva","ano":2008,"genero":"Ciência","isbn":"","status":"disponivel"},
		{"titulo":"Fantasia Moderna","autor":"Carlos Ferreira","ano":2020,"genero":"Fantasia","isbn":"","status":"emprestado","data_emprestimo": now - timedelta(days=3)},
		{"titulo":"Mistério na Cidade","autor":"Ana Pereira","ano":1998,"genero":"Suspense","isbn":"","status":"disponivel"},
		{"titulo":"Biografia Inspiradora","autor":"João Santos","ano":2012,"genero":"Biografia","isbn":"","status":"emprestado","data_emprestimo": now - timedelta(days=10)},
		{"titulo":"Educação em Foco","autor":"Paula Costa","ano":2021,"genero":"Educação","isbn":"","status":"disponivel"},
		{"titulo":"Algoritmos Avançados","autor":"Rafael Gomes","ano":2018,"genero":"Tecnologia","isbn":"","status":"disponivel"},
		{"titulo":"Contos Infantis Vol.2","autor":"Vários","ano":2005,"genero":"Infantil","isbn":"","status":"disponivel"},
		{"titulo":"Romance Contemporâneo","autor":"L. A. Oliveira","ano":2019,"genero":"Romance","isbn":"","status":"disponivel"},
	]
	for s in samples:
		l = Livro(**s)
		db.add(l)
	db.commit()
	db.close()
	print('Seed completo')


if __name__ == '__main__':
	seed()

