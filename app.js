const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('./models').sequelize;
const { Op } = require('sequelize');
const Book = require('./models').Book;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

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

// Create a list that can be iterated to build the pagination links
function createList(count, limit) {
  let numberOfLinks

  if (count % limit !== 0) {
    numberOfLinks = Math.floor(count / limit) + 1; 
  } else {
    numberOfLinks = count / limit;
  }

  let lilist = [];
  for(let i = 1; i <= numberOfLinks; i++) {
    lilist.push(i);
  }
  return lilist;
}

//Redirecting for list of books

app.get('/', (req, res) => {
  res.redirect("/books");

});

//Rendering list of books

app.get('/books', asyncHandler(async (req, res) => {
  const page = req.query.p ? req.query.p : 1;
  
  const { count, rows } = await Book.findAndCountAll({
    order: [["title", "ASC"]],
    offset: (parseInt(page) - 1) * 5,
    limit: 5
  });

  const lilist = createList(count, 5);

  let search_term = req.query.search;
  let result_books = await Book.findAll({
    where: {
      [Op.or]: [
        { title: {
          [Op.substring]: search_term
          } 
        },
        { author: {
          [Op.substring]: search_term
          } 
        },
        { genre: {
          [Op.substring]: search_term
          } 
        },
        { year: {
          [Op.substring]: search_term
          } 
        }
      ]
    }
  })
  res.render("index", { books: rows, title: "Books", result_books, search_term, lilist: lilist });
}));

//Shows the create new book form

app.get('/books/new', (req, res) => {
  res.render("new-book", { book: {}, title: "New Book" });
});

//Posts a new book to the database

app.post('/books/new', asyncHandler(async (req, res) => {
  let book;
  try {
    book = await Book.create(req.body);
    res.redirect("/books");
  } catch (error) {
    console.log(error)
    if(error.name === "SequelizeValidationError") { // checking the error
      book = await Book.build(req.body);
      res.render("new-book", { book, errors: error.errors, title: "New Book" })
    } else {
      throw error; // error caught in the asyncHandler's catch block
    }  
  }  
}))

//Shows book detail form

app.get('/books/:id', asyncHandler(async(req, res) => {
  const book = await Book.findByPk(req.params.id);
  if (book) {
    res.render("update-book", { book, title: "Update Book" });
  } else {
    res.sendStatus(404);
  }
}));

//Updates book info in the database

app.post('/books/:id', asyncHandler(async (req, res) => {
  let book
  try {
    book = await Book.findByPk(req.params.id);
    if (book) {
      await book.update(req.body);
      res.redirect("/books");
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    if(error.name === "SequelizeValidationError") {
      book = await Book.build(req.body);
      book.id = req.params.id; // make sure correct article gets updated
      res.render("update-book", { book, errors: error.errors, title: "Update Book" })
    } else {
      throw error;
    }
  }
}));

//Deletes a book

app.post('/books/:id/delete', asyncHandler(async (req ,res) => {
  const book = await Book.findByPk(req.params.id);
  if (book) {
    await book.destroy();
    res.redirect("/books");
  } else {
    res.sendStatus(404);
  }
}));

//Error handling 

app.use((req, res, next) => {
  const err = new Error('Not found');
  err.status = 404;
  res.render('page-not-found', {title: "Page Not Found"});
});

app.use((err, req, res, next) => {
  res.status(500);
  console.log(err);
  res.render('error', {title: "Server Error"});
});

sequelize.sync().then(() => {
  app.listen(3000, () => console.log('The application is running on localhost: 3000!'))
});