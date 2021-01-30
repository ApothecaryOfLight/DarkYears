const mysql = require('mysql2');
const http = require('http');
const wsServerLib = require('websocket').server;

const file_system = require('fs');
let logging_file;
function init_log() {
  console.log( "Initializing error log." );
  try {
    //1) If logs directory doesn't exist, create it.
    if( !file_system.existsSync( "./logs" ) ) {
      file_system.mkdirSync( "./logs" );
    }

    //2) Get timestamp to give log a unique(ish) name.
    const date = new Date();
    let date_string = date.toString();
    date_string = date_string.substr( 0, date_string.length-38 );
    date_string = date_string.replace( /\s/g, '_' );
    logging_file = "logs/" + date_string;

    //3) Create the log and write the first line to file.
    file_system.writeFile( logging_file, "Initializing log.\n<br>",
      function(err) {
        if( err ) {
          throw err;
        }
      }
    );
  } catch( error ) {
    //On error log to screen, because this was an error in creating the logs!
    console.group();
    console.log( "Filesystem error!" );
    console.error( error );
    console.groupEnd();
  }
  console.log( "Error log initialized." );
}
function log( type, msg, conn ) {
  try{
    const time_stamp = new Date();
    let date_string = time_stamp.toString();
    date_string = date_string.substr( 0, date_string.length-38 );
    date_string = date_string.replace( /\s/g, '_' );
    let log_message = date_string + "::" + type;
    if( conn ) {
      log_message += "@" + conn.socket.remoteAddress;
    }
    log_message += "::" + msg + "\n<br>";
    file_system.appendFile( logging_file, log_message, function(error) {
      if( error ) {
        throw error;
      }
    });
  } catch( error ) {
    //On error log to screen, because this was an error in writing to the logs!
    console.group();
    console.log( "Filesystem error!" );
    console.error( error );
    console.groupEnd();
  }
}

let http_server;

let mysql_pool;
let mysql_promisepool;
async function init_mysql_pool() {
  log( "app", "Initializing MySQL pool." );
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
  const year = inDate.substr(0,4);
  const month = inDate.substr( 5,2 );
  const day = inDate.substr( 8,2 );
  const formatted_date = year + "-" + month + "-" + day;
  return formatted_date;
}

function do_process_article_text( inArticleText ) {
  let punctuation_regex = new RegExp('[^\\w\\s]|[_]','g');
  let punctuation_removed = inArticleText.replace( punctuation_regex, "" );
  let words = punctuation_removed.split(" ");
  words = words.filter(distinct);
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
  //1) Get article_id (ensure it is reserved, if func fails retire ID).
  const [article_id_rows,article_id_fields] = await mysql_promisepool.query(
    "SELECT DarkYearsDB.generate_new_id();"
  );
  let new_id = article_id_rows[0]['DarkYearsDB.generate_new_id()'];

  //2) Format input date.
  try{
    const formatted_date = format_date( inArticleDate );
  } catch( error ) {
    log( "error:do_process_article()", error );
  }

  //3) Add article_id, title and text to articles table.
  const [rows,fields] = await mysql_promisepool.query(
    "INSERT INTO articles ( article_id, article_title, article_text, article_date ) " +
    "VALUES (" +
    "" + new_id + "," +
    "\'" + inArticleTitle + "\'," +
    "\'" + inArticleText + "\'," +
    "\'" + formatted_date + "\' " +
    ");"
  );

  //4) Process text body into object.
  let WordsArray = do_process_article_text( inArticleText + " " + inArticleTitle );

  //5) Add date into calendar table
  const date_query = "INSERT INTO calendar " + 
    " ( date_stamp, article_id_fk, article_title )" +
    " VALUES(\'" + formatted_date +
    "\', " + new_id +
    ", \'" + inArticleTitle + "\'" +
    ");";

  const [date_rows,date_fields] = await mysql_promisepool.query(
    date_query
  );

  //6) Add search terms to words table.
  //TODO: Only have one INSERT INTO query with multiple sets of words.
  for( word_obj in WordsArray ) {
    let first_letter = WordsArray[word_obj].first_letter;
    let second_letter = WordsArray[word_obj].second_letter;
    let TableName = first_letter + "_" + second_letter;
    let query_text = "INSERT INTO words " +
      " (word, article_id_fk) " + "VALUES ( \'" + word_obj + 
      "\', " + new_id + ");";
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
    log( "app", "Listening on port 3000" );
  });
  wsServer = new wsServerLib({
    httpServer: http_server
  });
  log( "app", "HTTP initialized" );
}

async function main() {
  var a_logging = await init_log();
  var a_mysql = await init_mysql_pool();
  var a_http = await init_http();
  var a_websockets = await initialize_websockets();
}

async function attempt_login( conn, username, username_hash, password_hash ) {
  log( "user", "Attempting login.", conn );

  //1) Check login to see if admin credentials have been provided
  if( username_hash == "21232f297a57a5a743894a0e4a801fc3" &&
    password_hash == "5f4dcc3b5aa765d61d8327deb882cf99" ) {
    log( "user", "Admin credentials verified.", conn );
    conn.send( JSON.stringify({
      event: 'admin_approved'
    }));
    conn.user_data.logged = true;
    conn.user_data.admin = true;
    return;
  }

  //2) Try user credentials, looking up by username hash.
  const query_text = "SELECT username, password_hash " +
    "FROM users " +
    "WHERE username_hash = " + "\'" + username_hash + "\';";
  try {
    const [login_rows,login_fields] = await mysql_promisepool.query( query_text );
    const data_pass = String.fromCharCode.apply(null,login_rows[0].password_hash);
    if( data_pass == password_hash ) {
      log( "user", "Credentials for " + username + " validated!", conn );
      conn.send( JSON.stringify({
        event: 'login_approved'
      }));
      conn.user_data.logged = true;
    } else if( data_pass != password_hash ) {
      log( "user", "Credentials for " + username + " rejected.", conn );
      conn.send( JSON.stringify({
        event: 'password_rejected'
      }));
    }
  } catch( error ) {
    log( "error", "Unspecified error in attempt_login: " + error, conn );
    //TODO: Iron out error protocol, so event is error and text is another prop
    conn.send( JSON.stingify({
      event: 'Unspecified error, please report to dev.'
    }));
  }
}

async function attempt_create_account( conn, username, username_hash, password_hash ) {
  log( "user", "Attempting to create account.", conn );
  const query_text = "INSERT INTO " +
    "users ( username, username_hash, password_hash ) " +
    "VALUES ( " +
    "\'" + username + "\', " +
    "\'" + username_hash + "\', " +
    "\'" + password_hash + "\'" +
    ");";
  try {
    const [acct_rows,acct_fields] = await mysql_promisepool.query( query_text );
    if( acct_rows.affectedRows == 1 ) {
      conn.send( JSON.stringify({
        event: 'login_approved'
      }));
      conn.user_data.logged = true;
    }
  } catch(e) {
    if( e.code == 'ER_DUP_ENTRY' ) {
      log( "user", "Username already exists!", conn );
      conn.send( JSON.stringify({
        event: 'account_creation_failed_username_exists'
      }));
    }
  }
}

function get_logs_filelist() {
  const logs_folder = './logs/';
  const file_list = file_system.readdirSync( logs_folder );
  return file_list;
}

function get_log( filename ) {
  const file_contents = file_system.readFileSync(
    "./logs/" + filename,
    {encoding:'utf8', flag:'r'}
  );
  return file_contents;
}

function send_log( conn, log ) {
  const logs_folder = './logs/';
  const file_list = file_system.readdirSync( logs_folder );
  file_list.forEach( file => {
    if( file == log ) {
      conn.send( JSON.stringify({
        event: 'log_file',
        log: get_log( file )
      }));
    }
  });
}

function send_admin_logs( conn ) {
  if( conn.user_data.admin == true ) {
    conn.send( JSON.stringify({
      event: 'admin_logs_filelist',
      filelist: get_logs_filelist()
    }));
  } else {
    log( "permission", "Request for admin logs without admin rights.", conn );
  }
}


async function initialize_websockets() {
  wsServer.on( 'request', function(request) {
    var conn = request.accept( null, request.origin );
    log( "app", "New connection established.", conn );
    conn.user_data = {
      logged: false,
      admin: false
    };
    log( "user", "New connection estasblished.", conn );
    conn.on('message', function(message) {
      log( "user", "Message received!", conn );
      const inMessage = JSON.parse( message.utf8Data );
      if( inMessage.event == "search" ) {
        const tags_ref = inMessage.tags;
        const date_start = format_date( inMessage.start_date );
        const date_end = format_date( inMessage.end_date );
        search( tags_ref, date_start, date_end, conn );
      } else if( inMessage.event == "new_article" ) {
        if( conn.user_data.logged == false ) {
          log( "permission", "Unlogged user attempted to create article.", conn );
          return;
        }
        const article_ref = inMessage.article;
        do_process_article( article_ref.title, article_ref.date, article_ref.body );
      } else if( inMessage.event == "date_search" ) {
        const date_start = format_date(inMessage.start_date);
        const date_end = format_date(inMessage.end_date);
        date_search( date_start, date_end, conn );
      } else if( inMessage.event == "login" ) {
        attempt_login(
          conn,
          inMessage.username_plaintext,
          inMessage.username_hashed,
          inMessage.password_hashed
        );
      } else if( inMessage.event == "create_account" ) {
        attempt_create_account(
          conn,
          inMessage.username_plaintext,
          inMessage.username_hashed,
          inMessage.password_hashed
        );
      } else if( inMessage.event == "request_admin_logs" ) {
        send_admin_logs(
          conn
        );
      } else if( inMessage.event == "request_log" ) {
        send_log (
          conn,
          inMessage.log
        );
      }
    });
  });
  log( "app", "Websockets initialized." );
}

async function search( words, date_start, date_end, conn ) {
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
  const query_text = "SELECT " +
    "articles.article_title, articles.article_text, articles.article_date  " +
    "FROM articles " +
    "INNER JOIN calendar " +
    "ON articles.article_id = calendar.article_id_fk " +
    "WHERE calendar.date_stamp >= " +
    "\'" + date_start + "\'" +
    " AND " +
    "calendar.date_stamp <=\'" + date_end + "\';"
  const [word_rows,word_fields] = await mysql_promisepool.query( query_text );
  const contents = [];
  if( Object.keys(word_rows).length > 0 ) { contents.push( word_rows ); }
  conn.send( JSON.stringify( { type: "articles", articles: contents } ) );
}

main();
