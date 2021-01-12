const mysql = require('mysql2');

let mysql_pool;
function init_mysql_pool() {
  console.log( "Initializing MySQL pool." );
  mysql_pool = mysql.createPool({
    connectionLimit: 50,
    host: 'localhost',
    user: 'DarkYears_User',
    password: 'DarkYears_Password',
    database: 'DarkYearsDB'
  });

  do_test();
}



function do_test() {
  mysql_pool.query(
    'INSERT INTO articles (article_title, article_id, article_text) VALUES (\"testing title\", 1, \"this is the body\" );',
    function( error, results, fields ) {
      if( error ) { console.error( error ); return; }
      console.dir( results );
      console.dir( fields );
    }
  );
}


//init_mysql_pool();


let article_title = "testing apart article";
let article_date = "2015_06_20";
let article_text = "this is the text of an article for Dark Years.";

function do_process_article_text( inArticleText ) {
//1) Break apart words, remove 1 and 2 letter words.
  let punctuation_regex = new RegExp('[^\\w\\s]|[_]','g');
  let punctuation_removed = inArticleText.replace( punctuation_regex, "" );
  //console.log( punctuation_removed );
  let words = punctuation_removed.split(" ");
  //console.dir( words );
  let words_obj = {};
  words.forEach( word => {
    if( word.length > 2 ) {
      words_obj[word.toUpperCase()] = {
        first_letter : word.charAt(0).toUpperCase(),
        second_letter : word.charAt(1).toUpperCase()
      }
    }
  });
  console.dir( words_obj );
//2) Determine first two letters
}

function do_process_article( inArticleTitle, inArticleDate, inArticleText ) {
//1) Get article_id (ensure it is reserved, if func fails retire ID).
  
//2) Add article_id, title and text to articles table.

//3) Process text body into object.
  let WordsArray = do_process_article_text( inArticleText );
//4) Process date into calendar table
  
//5) Add words to calendar table.

//6) Add article id to words table
}

do_process_article( "article_title", "12345", "testing, test. this!_ ye-p!" );
