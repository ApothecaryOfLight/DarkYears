const mysql = require('mysql2');

let mysql_pool;
let mysql_promisepool;
async function init_mysql_pool() {
  console.log( "Initializing MySQL pool." );
  mysql_pool = await mysql.createPool({
    connectionLimit: 50,
    host: 'localhost',
    user: 'DarkYears_User',
    password: 'DarkYears_Password',
    database: 'DarkYearsDB'
  });
  mysql_promisepool = mysql_pool.promise();
  //do_test();
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



let article_title = "testing apart article";
let article_date = "2015_06_20";
let article_text = "this is the text of an article for Dark Years.";

function do_process_article_text( inArticleText ) {
  let punctuation_regex = new RegExp('[^\\w\\s]|[_]','g');
  let punctuation_removed = inArticleText.replace( punctuation_regex, "" );
  let words = punctuation_removed.split(" ");
  let words_obj = {};
  words.forEach( word => {
    if( word.length > 2 ) {
      words_obj[word.toUpperCase()] = {
        first_letter : word.charAt(0).toUpperCase(),
        second_letter : word.charAt(1).toUpperCase()
      }
    }
  });
  return words_obj;
}

async function do_process_article( inArticleTitle, inArticleDate, inArticleText ) {
  console.log("do_process_article");
//1) Get article_id (ensure it is reserved, if func fails retire ID).
  const [article_id_rows,article_id_fields] = await mysql_promisepool.query(
    "SELECT generate_id();"
  );
  let new_id = article_id_rows[0]['generate_id()'];
  console.log( new_id );
//2) Add article_id, title and text to articles table.
  const [rows,fields] = await mysql_promisepool.query(
    "INSERT INTO articles ( article_id, article_title, article_text ) " +
    "VALUES (" +
    "" + new_id + "," +
    "\'" + inArticleTitle + "\'," +
    "\'" + inArticleText + "\'" +
    ");"
  );
  console.log( rows, fields );
//3) Process text body into object.
  let WordsArray = do_process_article_text( inArticleText );
//4) Process date into calendar table
  
//5) Add words to calendar table.
  //console.table( WordsArray );
  for( word_obj in WordsArray ) {
    console.log( word_obj );
    //console.log( WordsArray[word_obj].first_letter );
    //console.log( WordsArray[word_obj].second_letter );
    let first_letter = WordsArray[word_obj].first_letter;
    let second_letter = WordsArray[word_obj].second_letter;
    let TableName = first_letter + "_" + second_letter;
    console.log( TableName );
    let query_text = "INSERT INTO " + TableName +
      " (word, article_id_fk, article_title) " + "VALUES ( \'" + word_obj + 
      "\', " + new_id + ", \'" + inArticleTitle + "\' );";
    console.log( query_text );
    const [word_rows,word_fields] = await mysql_promisepool.query(
      query_text
    );
  }
//6) Add article id to words table
}

async function main() {
  await init_mysql_pool();
  //do_process_article( "article_title", "12345", "testing, test. this!_ ye-p!" );
  search( "testing" );
}

async function search( inWord ) {
  let first_letter = inWord.charAt(0).toUpperCase();
  let second_letter = inWord.charAt(1).toUpperCase();
  let word = inWord.toUpperCase();
  let query_text = "SELECT word, article_id_fk, article_title " +
    "FROM " + first_letter + "_" + second_letter + " " +
    "WHERE word= \'" +
    word + "\';";
  console.log( query_text );
  const [word_rows,word_fields] = await mysql_promisepool.query(
    query_text
  );
  console.table( word_rows );
  //console.dir( word_fields );
}

main();
