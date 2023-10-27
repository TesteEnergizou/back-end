// Depêndencias
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const { celebrate, Joi, Segments } = require('celebrate'); // Validação
const axios = require('axios'); // Requisição HTTP

const app = express();
const port = 3000;

// Configurar a conexão com o banco de dados padrão MySql
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'empresa_db'
});

db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL: ' + err);
    return;
  }
  console.log('Conectado ao MySQL');
});

// Analisar JSON do corpo da solicitação
app.use(bodyParser.json());

// Validação de campos usando celebrate
app.use(celebrate({
  [Segments.BODY]: Joi.object().keys({
    nomeCliente: Joi.string().required(),
    senha: Joi.string().required(),
    razaoSocial: Joi.string().required(),
    cnpj: Joi.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).required(),
    cep: Joi.string().regex(/^\d{5}-\d{3}$/).required(),
    endereco: Joi.string().required(),
    numero: Joi.string().required(),
    telefone: Joi.string().regex(/^\+ 55 \(\d{2}\) \d{5}-\d{4}$/).required(),
    email: Joi.string().email().required(),
  })
}));

// Rota para preenchimento automático do campo de endereço a partir do ViaCEP
app.get('/viacep/:cep', (req, res) => {
  const { cep } = req.params;
  axios.get(`https://viacep.com.br/ws/${cep}/json/`)
    .then((response) => {
      const data = response.data;
      if (data.erro) {
        res.status(404).json({ message: 'CEP não encontrado' });
      } else {
        res.json({ endereco: data.logradouro });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ message: 'Erro ao consultar o ViaCEP' });
    });
});

// Rotas CRUD para empresas

// Consulta empresas
app.get('/empresas', (req, res) => {
  db.query('SELECT * FROM empresas', (err, rows) => {
    if (err) throw err;
    res.json(rows);
  });
});

// Consulta por CNPJ
app.get('/empresas/:cnpj', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM empresas WHERE cnpj = ?', cnpj, (err, rows) => {
    if (err) throw err;
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'Empresa não encontrada' });
    }
  });
});

// Criar empresa
app.post('/empresas', (req, res) => {
  const { nomeCliente, senha, razaoSocial, cnpj, cep, endereco, numero, telefone, email } = req.body;
  db.query('INSERT INTO empresas (nomeCliente, senha, razaoSocial, cnpj, cep, endereco, numero, telefone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [nomeCliente, senha, razaoSocial, cnpj, cep, endereco, numero, telefone, email], (err, result) => {
    if (err) throw err;
    res.json({ message: 'Empresa criada com sucesso', id: result.insertId });
  });
});

// Atualizar empresa
app.put('/empresas/:id', (req, res) => {
  const id = req.params.id;
  const { razaoSocial, cnpj, cep, endereco, numero, telefone, email} = req.body;
  db.query('UPDATE empresas SET razaoSocial = ?, cnpj = ?, cep = ?, endereco = ?, numero = ?, telefone = ?, email = ? WHERE id = ?', [razaoSocial, cnpj, cep, endereco, numero, telefone, email, id], (err, result) => {
    if (err) throw err;
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Empresa não encontrada' });
    } else {
      res.json({ message: 'Empresa atualizada com sucesso' });
    }
  });
});

// Deletar empresa
app.delete('/empresas/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM empresas WHERE id = ?', id, (err, result) => {
    if (err) throw err;
    if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Empresa não encontrada' });
    } else {
      res.json({ message: 'Empresa excluída com sucesso' });
    }
  });
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor Node.js rodando na porta ${port}`);
});
