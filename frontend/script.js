'use strict';

/*
React
*/
class UID {
  constructor() {
    this.UIDs = [];
  }
  generateUID( inField ) {
    //console.log( "Generating first UID of field " + inField + "." );
    if( !this.UIDs[inField] ) {
      this.UIDs[inField] = {
      counter: 1,
      retiredIDs : []
      };
      return 0;
    } else if( this.UIDs[inField].retiredIDs.length ) {
      //console.log( "Issuing retired UID of field " + inField + "." );
      return this.UIDs[inField].retiredIDs.pop();
    } else {
      //console.log( "Generating new UID of field " + inField + "." );
      return this.UIDs[inField].counter++;
    }
  }
  retireUID( inField, inUID ) {
    //console.log( "reitiring UID " + inUID + " of " + inField );
    this.UIDs[inField].retiredIDs.push( inUID );
  }
}


/*
Search function
*/
let search_tag_handler;
let ws_handler;
function run_search_wrapper() {
  //console.log( "step1" );
  run_search( search_tag_handler, ws_handler );
}

function distinct( value, index, self ) {
  return self.indexOf(value) === index;
}

function do_process_tags( inArticleText ) {
//console.log( "do_process_tags" );
//console.log( inArticleText );
  let punctuation_regex = new RegExp('[^\\w\\s]|[_]','g');
  let punctuation_removed = inArticleText.replace( punctuation_regex, "" );
  let words = punctuation_removed.split(" ");
//console.dir( words );
  words = words.filter(distinct);
//console.dir( words );
  //console.log( "UNQ:" + words );
  let words_arr = [];
  words.forEach( word => {
    words_arr.push( word );
  });
  return words_arr;
}

function add_search_terms( in_terms, component_handle, myUID ) {
  //1) Add the search terms.
//console.log( "add_search_terms" );
//console.dir( in_terms );
  if( in_terms.length == 0 ) { return; }
  in_terms.forEach( term => {
    let duplicate = false;
    component_handle.state.search_terms.forEach( element => {
      if( element.text == term ) {
        duplicate = true;
      }
    });
    if( duplicate == false ) {
      component_handle.state.search_terms.push({
        text: term,
        UID: myUID.generateUID('tags')
      });
    }
  });
}
function format_date( inDate ) {
  //inDate = inDate.replace( '/', '-' );
  const date_obj = inDate.split( '/' );
  let month = date_obj[0];
  let day = date_obj[1];
  let year = date_obj[2];
  if( day < 10 ) { day = "0" + day; }
  if( month < 10 ) { month = "0" + month; }
  const return_date = year + "-" + month + "-" + day;
  console.log( return_date );
  return return_date;
}
function run_search( component_handle, ws ) {
  //console.log( "run_search" );
  const search_tag_input_field = document.getElementById("search_bar");
  const search_arr = [];
  //1) Add search term to search_tag_container
  //if( search_tag_input_field.value == "" ) { return; }
//console.log( search_tag_input_field.value );
  if( search_tag_input_field.value != "" ) {
    const tags = do_process_tags( search_tag_input_field.value );
    add_search_terms( tags, component_handle, myUID );

    //2) Update react component to display the state change to the user
    component_handle.setState( component_handle.state.search_terms );
    //console.dir( component_handle.state.search_terms );
    //3) Empty input field
    search_tag_input_field.value = "";

    //4) Convert search terms from DOM appropriate format to array
    //const search_arr = [];
    for( const key in search_terms ) {
      search_arr.push( search_terms[key].text );
    }
  }

  //5) Get the date range values.
  let start_date = document.getElementById("slider-range-value1").innerHTML;
  let end_date = document.getElementById("slider-range-value2").innerHTML;
  /*start_date = start_date.replace( '/', '-' );
  end_date = end_date.replace( '/', '-' );
  start_date = start_date.replace( '/', '-' );
  end_date = end_date.replace( '/', '-' );
  console.log( start_date );
  console.log( end_date );*/
  start_date = format_date( start_date );
  end_date = format_date( end_date );

  //console.log( search_arr.length );

  let event_type = "search_request_error";
  if( search_arr.length == 0 ) {
    event_type = "date_search";
  } else if( search_arr.length > 0 ) {
    event_type = "search";
  }

  //6) Convert search term array to object w/ event type and JSONify it.
  const search_json = JSON.stringify({
    event: event_type,
    tags: search_arr,
    start_date: start_date,
    end_date: end_date
  });

  //7) Send search query to server.
  ws.send( search_json );
}


/*
Search Tag Manager
*/
class SearchTagManager extends React.Component {
  constructor( search_terms, ws ) {
    super( search_terms, ws );
    this.state = {...search_terms};
  }
  componentDidMount() {
    this.setState( this.state.search_terms );
    const thisHandle = this;
    search_tag_handler = this;
    ws_handler = ws;
    const search_tag_container = document.getElementById("tag_container");
    const add_search_term_button = document.getElementById("add_search_tag_button");
    add_search_term_button.addEventListener("click",function() {
      run_search( thisHandle, ws );
    });
    ws.addEventListener( 'open', function() {
      run_search( thisHandle, ws ); //Initial search on load.
    });
  }
  doClick( inUID ) {
    search_terms.forEach( (search_term, index) => {
      if( search_term.UID == inUID ) {
        search_terms.splice( index, 1 );
      }
    });
    myUID.retireUID( "tags", inUID );
    this.setState( this.state.search_terms );
    run_search( this, ws );
  }
  render() {
    let search_tags_element = this.state.search_terms.map( (search_term) =>
      <span className='tag' key={search_term.UID}>{search_term.text}
        <button className='close_tag' 
          onClick={ () => this.doClick(search_term.UID) }>X</button>
      </span>
    );
    if( this.state.search_terms.length == 0 ) {
      search_tags_element = <div className='empty_tags_container'></div>
    }
    return( search_tags_element );
  }
}


/*
Article manager.
*/
class ArticleManager extends React.Component {
  constructor( articles, ws ) {
    super( articles, ws );
    this.state = {...articles};
  }
  componentDidMount() {
    this.setState( this.state.articles );
    const articles_component = this;
    ws.addEventListener( 'message', function(event) {
      articles_component.state.articles = [];
      articles_component.setState( [] );
      const in_articles = JSON.parse( event.data );
      if( in_articles.type == "articles" ) {
        if( in_articles.articles.length > 0 ) {
          let key_counter = 0;
          in_articles.articles.forEach( function(article_group,index) {
            article_group.forEach( article => {
              article.key = key_counter;
              key_counter++;
              articles_component.state.articles.push( article );
            });
          });
          articles_component.setState( articles_component.state.articles );
        } else {
          articles_component.state.articles = [];
          articles_component.setState( [] );
        }
      }
    });
  }
  render() {
    //console.log( "Rendering!" );
    if( this.state.articles.length == 0 ) {
      //console.log( "Returned empty" );
      const empty_return = <div className='empty_articles_container'></div>;
      return( empty_return );
    }
    const dom = this.state.articles.map( (article) =>
      <div className='article' key={article.key}>
        <div className='article_top'>
          <span className='article_title'>{article.article_title}</span>
          <span className='article_date'>{article.article_date}</span>
        </div>
        <div className='article_text'>{article.article_text}</div>
      </div>
    );
    return(
      dom
    );
  }
}

/*
Websocket
*/
var ws;
try{
  ws = new WebSocket( 'ws://34.213.71.46:3000' );
} catch( error ) {
  console.error( error );
}

ws.addEventListener( 'close', function(event) {
  console.group();
  console.log( "Websocket closed!" );
  console.dir( event );
  console.groupEnd();
});

ws.addEventListener( 'error', function(event) {
  console.group();
  console.log( "Websocket error!" );
  console.dir( event );
  console.groupEnd();
});


/*
Menu code.
*/
const interfaces = [ "search", "create_article", "profile", "settings", "contact" ];

function set_interface( target ) {
  interfaces.forEach( target_name => {
    const interface_name = target_name + "_interface";
    const interface_handle = document.getElementById( interface_name );
    if( target_name == target ) {
      interface_handle.style.display = "grid";
    } else {
      interface_handle.style.display = "none";
    }
  });
}

interfaces.forEach( interface_name => {
  const button_name = interface_name + "_interface_button";
  const button_handle = document.getElementById( button_name );
  button_handle.addEventListener( "click", function() {
    set_interface( interface_name );
  });
});


/*
Search interface code.
*/
const myUID = new UID();

const search_terms = [];

const articles = [];

ReactDOM.render(
  <SearchTagManager search_terms={search_terms} ws={ws}/>,
  document.getElementById('tag_container')
);

ReactDOM.render(
  <ArticleManager articles={articles} ws={ws}/>,
  document.getElementById('article_container')
);


/*
Add article interface code.
*/
const submit_article_button = document.getElementById("submit_article");
const article_title_input = document.getElementById("create_article_type");
const article_date_input = document.getElementById("create_article_date");
const article_text_input = document.getElementById("create_article_text");
submit_article_button.addEventListener("click", function() {
  const article_title = article_title_input.value;
  const article_body = article_text_input.value;
  const article_date = article_date_input.value;
  if( article_title == "" || article_body == "" || article_date == "" ) {
    console.log( "Missing article part." );
    //TODO: Error modal
    return;
  }
  const article_obj = {
    title: article_title,
    date: article_date,
    body: article_body
  }
  //console.dir( article_obj );
  const article_json = JSON.stringify({event: "new_article", article: article_obj});
  ws.send( article_json );
});


/*
Modal interfaces code.
*/
/*
Login Interface Code
*/
ws.addEventListener( 'open', function() {
  const login_button = document.getElementById("logging_element_login");
  const logout_button = document.getElementById("logging_element_logout");

  const modal_interface = document.getElementById("modal_interface");

  const login_modal = document.getElementById("login_modal");
  const close_login_modal_button = document.getElementById("close_login_modal_button");
  login_button.addEventListener( 'click', function() {
    modal_interface.style.display = 'flex';
    login_modal.style.display = 'flex';
  });
  close_login_modal_button.addEventListener( 'click', function() {
    modal_interface.style.display = 'none';
    login_modal.style.display = 'none';
  });

  const login_attempt_button = document.getElementById("login_button");
  const create_account_button = document.getElementById("create_account_button");
  const username_field = document.getElementById("username_input");
  const password_field = document.getElementById("password_input");
  login_attempt_button.addEventListener( 'click', function() {
//    console.log( "Logging!" );
    const username_plaintext = username_field.value;
    const password_plaintext = password_field.value;
//    console.log( username_plaintext + "/" + password_plaintext );

    const hashed_username = md5(username_plaintext);
//    console.log( "hashed username: " + hashed_username );

    const hashed_password = md5(password_plaintext);
//    console.log( "hashed password: " + hashed_password );

    ws.send( JSON.stringify({
      event: 'login',
      username_plaintext: username_plaintext,
      username_hashed: hashed_username,
      password_hashed: hashed_password
    }));
  });

  create_account_button.addEventListener( 'click', function() {
//    console.log( "Creating account!" );
    const username_plaintext = username_field.value;
    const password_plaintext = password_field.value;
//    console.log( username_plaintext + "/" + password_plaintext );
    const hashed_username = md5(username_plaintext);
//    console.log( hashed_username );
    const hashed_password = md5(password_plaintext);
    ws.send( JSON.stringify({
      event: 'create_account',
      username_plaintext: username_plaintext,
      username_hashed: hashed_username,
      password_hashed: hashed_password
    }));
  });

  const create_article_interface_button = document.getElementById("create_article_interface_button");
  const profile_interface_button = document.getElementById("profile_interface_button");
  const settings_interface_button = document.getElementById("settings_interface_button");

  logout_button.addEventListener( 'click', function() {
    console.log( "Loggin out." );
    login_button.style.display = "block";
    logout_button.style.display = "none";
    create_article_interface_button.style.display = "none";
    profile_interface_button.style.display = "none";
    settings_interface_button.style.display = "none";
  });

  ws.addEventListener( 'message', function(message) {
    const payload = JSON.parse( message.data );
    if( payload.event == "login_approved" ) {
      console.log( "Login approved!" );
      modal_interface.style.display = "none";
      login_modal.style.display = "none";
      login_button.style.display = "none";
      logout_button.style.display = "block";
      create_article_interface_button.style.display = "block";
      profile_interface_button.style.display = "block";
      settings_interface_button.style.display = "block";
    } else if( payload.event == "password_rejected" ) {
      console.log( "Password rejected." );
      launch_error_modal( "Incorrect login information." );
    } else if( payload.event == "unknown_login_error" ) {
      console.log( "Unknown login error." );
      launch_error_modal( "Unknown login error, contact dev!" );
    } else if( payload.event == "account_creation_success" ) {
      console.log( "Account creation success." );
    } else if( payload.event == "account_creation_failed_username_exists" ) {
      console.log( "Account creation failed, username exists!" );
      launch_error_modal( "Username already taken!" );
    }
  });
});


/*
Error interface code
*/
const error_modal = document.getElementById("error_modal");
const error_modal_message = document.getElementById("error_message");
function launch_error_modal( ErrorMessage ) {
  error_modal.style.display = "flex";
  error_modal_message.innerHTML = ErrorMessage;
}
const close_error_modal = document.getElementById("close_error_modal_button");
close_error_modal.addEventListener( 'click', function() {
  error_modal.style.display = "none";
});
