from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from .database import Base


class Livro(Base):
	__tablename__ = 'livros'
	id = Column(Integer, primary_key=True, index=True)
	titulo = Column(String(200), nullable=False, unique=False, index=True)
	autor = Column(String(200), nullable=False)
	ano = Column(Integer, nullable=False)
	genero = Column(String(100), nullable=True)
	isbn = Column(String(50), nullable=True)
	status = Column(String(50), nullable=False, default='disponivel')
	data_emprestimo = Column(DateTime(timezone=True), nullable=True)

