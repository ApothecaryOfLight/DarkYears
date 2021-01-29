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
    database: 'DarkYearsDB',
    dateStrings: true
  });
  mysql_promisepool = mysql_pool.promise();
}

function distinct( value, index, self ) {
  return self.indexOf(value) === index;
}

function format_date( inDate ) {
  console.log( inDate );
  const year = inDate.substr(0,4);
  const month = inDate.substr( 5,2 );
  const day = inDate.substr( 8,2 );
  const formatted_date = year + "-" + month + "-" + day;
  console.log( "formatted:" + formatted_date );
  return formatted_date;
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

  //) Convert date into mySQL DATE format (mm-dd-yyyy) -> (yyyy-mm-dd)
/*  console.log( "DATE:" );
  console.table( inArticleDate );
  const year = inArticleDate.substr(0,4);
  const month = inArticleDate.substr( 5,2 );
  const day = inArticleDate.substr( 8,2 );
  const formatted_date = year + "-" + month + "-" + day;
  console.log( "formatted date: " + formatted_date );*/
  const formatted_date = format_date( inArticleDate );

  //2) Add article_id, title and text to articles table.
  const [rows,fields] = await mysql_promisepool.query(
    "INSERT INTO articles ( article_id, article_title, article_text, article_date ) " +
    "VALUES (" +
    "" + new_id + "," +
    "\'" + inArticleTitle + "\'," +
    "\'" + inArticleText + "\'," +
    "\'" + formatted_date + "\' " +
    ");"
  );
  console.log( rows, fields );

  //3) Process text body into object.
  let WordsArray = do_process_article_text( inArticleText + " " + inArticleTitle );

  //4) Add date into calendar table
  const date_query = "INSERT INTO calendar " + 
    " ( date_stamp, article_id_fk, article_title )" +
    " VALUES(\'" + formatted_date +
    "\', " + new_id +
    ", \'" + inArticleTitle + "\'" +
    ");";

  console.log( date_query );

  const [date_rows,date_fields] = await mysql_promisepool.query(
    date_query
  );
  console.log( date_rows, date_fields );

  //5) Add search terms to words table.
  for( word_obj in WordsArray ) {
    console.log( word_obj );
    let first_letter = WordsArray[word_obj].first_letter;
    let second_letter = WordsArray[word_obj].second_letter;
    let TableName = first_letter + "_" + second_letter;
    console.log( TableName );
    let query_text = "INSERT INTO words " +
      " (word, article_id_fk) " + "VALUES ( \'" + word_obj + 
      "\', " + new_id + ");";
    console.log( query_text );
    const [word_rows,word_fields] = await mysql_promisepool.query(
      query_text
    );
  }
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
  var doneB = await init_http();
  var doneC = await initialize_websockets();
}

async function attempt_login( conn, username, username_hash, password_hash ) {
  console.log( "Attempting to login!" );
  const query_text = "SELECT username, password_hash " +
    "FROM users " +
    "WHERE username_hash = " + "\'" + username_hash + "\';";
  try {
    const [login_rows,login_fields] = await mysql_promisepool.query( query_text );
    const data_pass = String.fromCharCode.apply(null,login_rows[0].password_hash);
    if( data_pass == password_hash ) {
      console.log( "Credentials validated!" );
      conn.send( JSON.stringify({
        event: 'login_approved'
      }));
      conn.user_data.logged = true;
    } else if( data_pass != password_hash ) {
      console.log( "Credentials rejected!" );
      conn.send( JSON.stringify({
        event: 'password_rejected'
      }));
    }
  } catch(e) {
    console.dir( e );
    console.log( "Error!" );
    conn.send( JSON.stingify({
      event: 'Unspecified error, please report to dev.'
    }));
  }
}

async function attempt_create_account( conn, username, username_hash, password_hash ) {
  console.log( "Attempting to create account!" );
  const query_text = "INSERT INTO " +
    "users ( username, username_hash, password_hash ) " +
    "VALUES ( " +
    "\'" + username + "\', " +
    "\'" + username_hash + "\', " +
    "\'" + password_hash + "\'" +
    ");";
  console.log( query_text );
  try {
    const [acct_rows,acct_fields] = await mysql_promisepool.query( query_text );
    console.dir( acct_rows );
    console.log( acct_rows.affectedRows );
    if( acct_rows.affectedRows == 1 ) {
      conn.send( JSON.stringify({
        event: 'login_approved'
      }));
      conn.user_data.logged = true;
    }
  } catch(e) {
    console.dir(e);
    if( e.code == 'ER_DUP_ENTRY' ) {
      console.log( "Username already exists!" );
      conn.send( JSON.stringify({
        event: 'account_creation_failed_username_exists'
      }));
    }
  }
}

async function initialize_websockets() {
  wsServer.on( 'request', function(request) {
    var conn = request.accept( null, request.origin );
    console.log( "New connection established." );
    conn.user_data = {
      logged: false,
      admin: false
    };
    conn.on('message', function(message) {
      console.log( "Message received!" );
      const inMessage = JSON.parse( message.utf8Data );
      if( inMessage.event == "search" ) {
        const tags_ref = inMessage.tags;
        const date_start = format_date( inMessage.start_date );
        const date_end = format_date( inMessage.end_date );
        search( tags_ref, date_start, date_end, conn );
      } else if( inMessage.event == "new_article" ) {
        if( conn.user_data.logged == false ) {
          console.log( "ERROR: Unlogged user attempted to create article." );
          return;
        }
        const article_ref = inMessage.article;
        do_process_article( article_ref.title, article_ref.date, article_ref.body );
      } else if( inMessage.event == "date_search" ) {
        console.log( "Date search!" );
        const date_start = format_date(inMessage.start_date);
        const date_end = format_date(inMessage.end_date);
        date_search( date_start, date_end, conn );
      } else if( inMessage.event == "login" ) {
        console.dir( inMessage );
        attempt_login(
          conn,
          inMessage.username_plaintext,
          inMessage.username_hashed,
          inMessage.password_hashed
        );
      } else if( inMessage.event == "create_account" ) {
        console.dir( inMessage );
        attempt_create_account(
          conn,
          inMessage.username_plaintext,
          inMessage.username_hashed,
          inMessage.password_hashed
        );
      }
    });
  });
  console.log( "Websockets initialized." );
}

async function search( words, date_start, date_end, conn ) {
/*  const contents = [];
  console.dir( inWords );
  console.log( Object.keys(inWords).length );
  if( Object.keys(inWords).length == 0 ) {
    console.log( "Empty!" );
    return;
  }
  for( inWord of inWords ) {
    let first_letter = inWord.charAt(0).toUpperCase();
    let second_letter = inWord.charAt(1).toUpperCase();
    let word = inWord.toUpperCase();
    const table_name = first_letter + "_" + second_letter;

    let start_date = date_start;
    let end_date = date_end;
    console.log( start_date + " / " + end_date );
    let start_year = start_date.substr(6,4);
    let start_month = Number(start_date.substr(0,2));
    let start_day = start_date.substr(3,2);

    let end_year = end_date.substr(6,4);
    let end_month = Number(end_date.substr(0,2));
    let end_day = end_date.substr(3,2);
    console.log( start_year + "/" + start_month + " to " + end_year + "/" + end_month );

    let month_counter = start_month;
    let year_counter = start_year;
    let calendar_query = "INNER JOIN ( ";
    while( month_counter <= end_month || year_counter < end_year ) {
      let month_counter_string = "";
      if( month_counter < 10 ) { month_counter_string += "0"; }
      month_counter_string += month_counter;
      const calendar_name = "calendar_" + year_counter + "_" + month_counter_string;
      calendar_query += "SELECT " + calendar_name + ".article_id_fk " +
        " FROM " + calendar_name + " UNION "
      month_counter++;
      if( month_counter > 12 ) {
        month_counter = 1;
        year_counter++;
      }
    }
    calendar_query = calendar_query.substring( 0, calendar_query.length - 6 );
    calendar_query += ") as calendars ON words.article_id = calendars.article_id_fk";
    console.log( calendar_query );
    console.log( "\n\n" );
    let query_text = "SELECT " +
      "words.article_id, words.article_title, " +
      "words.article_text, words.article_date " +
      "FROM ( SELECT " +
      table_name + ".word, " +
      table_name + ".article_id_fk, " +
      table_name + ".article_title, " +
      "articles.article_id, " +
      "articles.article_text, " +
      "articles.article_date " + 
      "FROM " + table_name + " " +
      "INNER JOIN articles ON " +
      table_name + ".article_id_fk = articles.article_id " +
      "WHERE " + table_name + ".word= \'" +
      word + "\' " +
      " ) as words " +
      calendar_query;
    console.log( query_text );
    const [word_rows,word_fields] = await mysql_promisepool.query(
      query_text
    );
    if( Object.keys(word_rows).length > 0 ) { contents.push( word_rows ); }
  }*/
  console.log( "Tag search" );

  //Compose the date search
  let date_search = " AND articles.article_date >= " +
    "\'" + date_start + "\'" +
    " AND " +
    "\'" + date_end + "\';"

  //Compose the string of search terms fro the WHERE clause.
  let words_search = "";
  words.forEach( word => {
    const formatted_word = word.toUpperCase();
    words_search += "words.word = " + "\'" + formatted_word + "\' AND "
  });
  words_search = words_search.substring( 0, words_search.length - 4 );

  //Compose the query itself.
  const query_text = "SELECT " +
    "articles.article_title, " +
    "articles.article_text, articles.article_date " +
    "FROM articles " +
    "INNER JOIN words " +
    "ON articles.article_id = words.article_id_fk " +
    "WHERE " + words_search + date_search
    ";";

  console.log( query_text );

  //Run query.
  const [word_rows,word_fields] = await mysql_promisepool.query(
    query_text
  );

  //Process result into JSON object and send to client.
  let contents = [];
  if( Object.keys(word_rows).length > 0 ) { contents.push( word_rows ); }
  conn.send( JSON.stringify( { type: "articles", articles: contents } ) );
}

async function date_search( date_start, date_end, conn ) {
  console.log( "date_search" );
/*  const contents = [];

  let start_date = date_start;
  let end_date = date_end;
  let start_year = start_date.substr(6,4);
  let start_month = Number(start_date.substr(0,2));
  let start_day = start_date.substr(3,2);

  let end_year = end_date.substr(6,4);
  let end_month = Number(end_date.substr(0,2));
  let end_day = end_date.substr(3,2);

  let month_counter = start_month;
  let year_counter = start_year;
  let calendar_query = " = ANY ( ";

  while( month_counter < end_month || year_counter < end_year ) {
    let month_counter_string = "";
    if( month_counter < 10 ) { month_counter_string += "0"; }
    month_counter_string += month_counter;
    const calendar_name = "calendar_" + year_counter + "_" + month_counter_string;
    calendar_query += "SELECT " + calendar_name + ".article_id_fk " +
      " FROM " + calendar_name + " UNION "
    month_counter++;
    if( month_counter > 12 ) {
      month_counter = 1;
      year_counter++;
    }
  }

  calendar_query = calendar_query.substring( 0, calendar_query.length - 6 );
  calendar_query += ");";

  let query_text = "SELECT " +
    "articles.article_title, articles.article_text, articles.article_date " +
    "FROM articles " +
    "WHERE articles.article_id" + calendar_query;
  const [word_rows,word_fields] = await mysql_promisepool.query(
    query_text
  );*/
  const contents = [];
  const query_text = "SELECT " +
    "articles.article_title, articles.article_text, articles.article_date  " +
    "FROM articles " +
    "INNER JOIN calendar " +
    "ON articles.article_id = calendar.article_id_fk " +
    "WHERE calendar.date_stamp >= " +
    "\'" + date_start + "\'" +
    " AND " +
    "calendar.date_stamp <=\'" + date_end + "\';"
  console.log( query_text );
  const [word_rows,word_fields] = await mysql_promisepool.query( query_text );
  if( Object.keys(word_rows).length > 0 ) { contents.push( word_rows ); }
  conn.send( JSON.stringify( { type: "articles", articles: contents } ) );
}

main();
