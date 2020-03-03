const express = require('express');
const sequelize = require('./models').sequelize;
const Book = require('./models').Book;

const app = express();

app.use('/static', express.static('public'));

app.set('view engine', 'pug');

/* Handler function to wrap each route. */
function asyncHandler(cb){
  return async(req, res, next) => {
    try {
      await cb(req, res, next)
    } catch(error){
      res.status(500).send(error);
    }
  }
}

app.get('/', asyncHandler(async (req, res) => {
  const books = await Book.findAll({order: [["title", "DESC"]]});
  res.render("index", { books, title: "Books" });
}));

sequelize.sync().then(() => {
  app.listen(3000, () => console.log('The application is running on localhost: 3000!'))
});