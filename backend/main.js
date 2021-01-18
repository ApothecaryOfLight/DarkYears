const mysql = require('mysql2');
const http = require('http');
const wsServerLib = require('websocket').server;

let http_server;



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

function distinct( value, index, self ) {
  return self.indexOf(value) === index;
}

function do_process_article_text( inArticleText ) {
  let punctuation_regex = new RegExp('[^\\w\\s]|[_]','g');
  let punctuation_removed = inArticleText.replace( punctuation_regex, "" );
  let words = punctuation_removed.split(" ");
  words = words.filter(distinct);
  console.log( "UNQ:" + words );
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
    "SELECT DarkYearsDB.generate_new_id();"
  );
  console.table( article_id_rows );
  let new_id = article_id_rows[0]['DarkYearsDB.generate_new_id()'];
  console.log( "new_ID: " + new_id );
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
  let WordsArray = do_process_article_text( inArticleText + " " + inArticleTitle );
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

async function init_http() {
  http_server = http.createServer( function(request,response) {
    response.writeHead( 404 );
    response.end();
  });
  await http_server.listen( 3000, function() {
    console.log( "Listening on port 3000" );
  });
  wsServer = new wsServerLib({
    httpServer: http_server
  });
  console.log( "HTTP initialized" );
}

async function main() {
  var done = await init_mysql_pool();
  //do_process_article( "article_title", "12345", "testing, test. this!_ ye-p!" );
  //search( "testing" );
  var doneB = await init_http();
  var doneC = await initialize_websockets();
}

async function initialize_websockets() {
  wsServer.on( 'request', function(request) {
    var conn = request.accept( null, request.origin );
    console.log( "New connection established." );
    conn.on('message', function(message) {
      console.log( "Message received!" );
      //console.table( message );
      const inMessage = JSON.parse( message.utf8Data );
      //console.table( inMessage );
      //If search, return search query from database.
      if( inMessage.event == "search" ) {
        const tags_ref = inMessage.tags;
        search( tags_ref, conn );
        /*tags_ref.forEach( tag => {
          const result = await search( tag, conn );
          console.log( result );
        });*/
      } else if( inMessage.event == "new_article" ) {
        const article_ref = inMessage.article;
        do_process_article( article_ref.title, article_ref.date, article_ref.body );
      }
      //If add article, index article into database.
      
      //If requesting article, return article from database.
      
    });
  });
  console.log( "Websockets initialized." );
}

//TODO: Make this return scrollable units of content
async function search( inWords, conn ) {
  const contents = [];
  for( inWord of inWords ) {
    let first_letter = inWord.charAt(0).toUpperCase();
    let second_letter = inWord.charAt(1).toUpperCase();
    let word = inWord.toUpperCase();
    const table_name = first_letter + "_" + second_letter;
    let query_text = "SELECT " +
      table_name + ".word, " +
      table_name + ".article_id_fk, " +
      table_name + ".article_title, " +
      "articles.article_text " +
      "FROM " + table_name + " " +
      "INNER JOIN articles ON " + table_name + ".article_id_fk = articles.article_id " +
      "WHERE " + table_name + ".word= \'" +
      word + "\';";
    console.log( query_text );
    const [word_rows,word_fields] = await mysql_promisepool.query(
      query_text
    );
    //console.table( word_rows );

    //conn.send( JSON.stringify( word_rows ) );
    console.table( word_rows );
    console.log( typeof( word_rows ) );
    if( Object.keys(word_rows).length > 0 ) { contents.push( word_rows ); }
  }
  console.log( contents );
  //return word_rows;
  conn.send( JSON.stringify( { type: "articles", articles: contents } ) );
}

main();
