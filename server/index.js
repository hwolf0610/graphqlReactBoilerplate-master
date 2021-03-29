const express = require('express');
const path = require('path')

const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');
const mysql = require('mysql');
const cors = require('cors')

const app = express();
app.use(cors())

let PORT = 4000;

const schema = buildSchema(`
  type User {
    id: String
    name: String
    job_title: String
    email: String
  }
  type Query {
    getUsers: [User],
    getUserInfo(id: Int) : User
  }
  type Mutation {
    updateUserInfo(id: Int, name: String, email: String, job_title: String) : Boolean
    createUser(name: String, email: String, job_title: String) : Boolean
    deleteUser(id: Int) : Boolean
  }
`);

const queryDB = (req, sql, args) => new Promise((resolve, reject) => {
  req.mysqlDb.query(sql, args, (err, rows) => {
    if (err)
      return reject(err);
    rows.changedRows || rows.affectedRows || rows.insertId ? resolve(true) : resolve(rows);
  });
});

const root = {
  getUsers: (args, req) => queryDB(req, "select * from users").then(data => data),
  getUserInfo: (args, req) => queryDB(req, "select * from users where id = ?", [args.id]).then(data => data[0]),
  updateUserInfo: (args, req) => queryDB(req, "update users SET ? where id = ?", [args, args.id]).then(data => data),
  createUser: (args, req) => queryDB(req, "insert into users SET ?", args).then(data => data),
  deleteUser: (args, req) => queryDB(req, "delete from users where id = ?", [args.id]).then(data => data)
};

app.use((req, res, next) => {
  req.mysqlDb = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'userapp'
  });
  req.mysqlDb.connect();
  next();
});

app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));


app.get("/test", function (req, res) {
  res.json({
    "data": "ok"
  })
})

// Serve any static files
app.use(express.static(path.join(__dirname, 'dashdoard/build')));

// Handle React routing, return all requests to React app
app.get('*', function (req, res) {
  res.sendFile(path.join(__dirname, 'dashdoard/build', 'index.html'));
});

app.listen(PORT);

console.log(`Running a GraphQL API server at localhost:${PORT}/graphql`);
