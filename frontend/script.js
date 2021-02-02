'use strict';

/*
React
*/
class UID {
  constructor() {
    this.UIDs = [];
  }
  generateUID( inField ) {
    if( !this.UIDs[inField] ) {
      this.UIDs[inField] = {
      counter: 1,
      retiredIDs : []
      };
      return 0;
    } else if( this.UIDs[inField].retiredIDs.length ) {
      return this.UIDs[inField].retiredIDs.pop();
    } else {
      return this.UIDs[inField].counter++;
    }
  }
  retireUID( inField, inUID ) {
    this.UIDs[inField].retiredIDs.push( inUID );
  }
}


/*
Search function
*/
let search_tag_handler;
let ws_handler;
function run_search_wrapper() {
  run_search( search_tag_handler, ws_handler, 0 );
}

function distinct( value, index, self ) {
  return self.indexOf(value) === index;
}

function do_process_tags( inArticleText ) {
  let punctuation_regex = new RegExp('[^\\w\\s]|[_]','g');
  let punctuation_removed = inArticleText.replace( punctuation_regex, "" );
  let words = punctuation_removed.split(" ");
  words = words.filter(distinct);
  let words_arr = [];
  words.forEach( word => {
    words_arr.push( word );
  });
  return words_arr;
}

function add_search_terms( in_terms, component_handle, myUID ) {
  //1) Add the search terms.
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
  const date_obj = inDate.split( '/' );
  let month = date_obj[0];
  let day = date_obj[1];
  let year = date_obj[2];
  if( day < 10 ) { day = "0" + day; }
  if( month < 10 ) { month = "0" + month; }
  const return_date = year + "-" + month + "-" + day;
  return return_date;
}
function run_search( component_handle, ws, curr_page ) {
  const search_tag_input_field = document.getElementById("search_bar");
  const search_arr = [];
  //1) Add search term to search_tag_container
  if( search_tag_input_field.value != "" ) {
    const tags = do_process_tags( search_tag_input_field.value );
    add_search_terms( tags, component_handle, myUID );

    //2) Update react component to display the state change to the user
    component_handle.setState( component_handle.state.search_terms );

    //3) Empty input field
    search_tag_input_field.value = "";
  }

  //4) Convert search terms from DOM appropriate format to array
  for( const key in search_terms ) {
    search_arr.push( search_terms[key].text );
  }

  //5) Get the date range values.
  let start_date = document.getElementById("slider-range-value1").innerHTML;
  let end_date = document.getElementById("slider-range-value2").innerHTML;

  start_date = format_date( start_date );
  end_date = format_date( end_date );


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
    end_date: end_date,
    entities_per_page: 10,
    current_page: curr_page
  });

  //7) Send search query to server.
  ws.send( search_json );
}


/*
Search Tag Manager
*/
class SearchTagManager extends React.Component {
  constructor( search_terms, ws, current_page ) {
    super( search_terms, ws, current_page );
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
      run_search( thisHandle, ws, 0 );
    });
    ws.addEventListener( 'open', function() {
      run_search( thisHandle, ws, 0 ); //Initial search on load.
      ws.addEventListener( 'message', function(event) {
        const payload = JSON.parse(event.data);
//console.dir( search_tag_handler );
        if( payload.type == "articles" ) {
          render_pagination_interface(
            "article_pagination_container",
            Math.ceil(payload.size/10),
            search_tag_handler.state.current_page,
            search_tag_handler
          );
        }
      });
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
    run_search( this, ws, 0 );
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
    if( this.state.articles.length == 0 ) {
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
  launch_error_modal( "Connection with server lost!" );
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
const interfaces = [
  "search", "create_article", "profile", "settings", "contact", "admin"
];

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
  <SearchTagManager search_terms={search_terms} ws={ws} current_page={0}/>,
  document.getElementById('tag_container')
);

ReactDOM.render(
  <ArticleManager articles={articles} ws={ws}/>,
  document.getElementById('article_container')
);


/*
Add article interface code.
*/
const submit_article_button = document.getElementById("create_article_submit_button");
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
    const username_plaintext = username_field.value;
    const password_plaintext = password_field.value;

    const hashed_username = md5(username_plaintext);

    const hashed_password = md5(password_plaintext);

    ws.send( JSON.stringify({
      event: 'login',
      username_plaintext: username_plaintext,
      username_hashed: hashed_username,
      password_hashed: hashed_password
    }));
  });

  create_account_button.addEventListener( 'click', function() {
    const username_plaintext = username_field.value;
    const password_plaintext = password_field.value;
    const hashed_username = md5(username_plaintext);
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
  const admin_interface_button = document.getElementById("admin_interface_button");
  logout_button.addEventListener( 'click', function() {
    login_button.style.display = "block";
    logout_button.style.display = "none";
    create_article_interface_button.style.display = "none";
    profile_interface_button.style.display = "none";
    settings_interface_button.style.display = "none";
    admin_interface_button.style.display = "none";
  });
  admin_interface_button.addEventListener( 'click', function() {
    set_interface( 'admin' );
  });

  ws.addEventListener( 'message', function(message) {
    const payload = JSON.parse( message.data );
    if( payload.event == "login_approved" ) {
      modal_interface.style.display = "none";
      login_modal.style.display = "none";
      login_button.style.display = "none";
      logout_button.style.display = "block";
      create_article_interface_button.style.display = "block";
      //profile_interface_button.style.display = "block";
      //settings_interface_button.style.display = "block";
    } else if( payload.event == "password_rejected" ) {
      launch_error_modal( "Incorrect login information." );
    } else if( payload.event == "unknown_login_error" ) {
      launch_error_modal( "Unknown login error, contact dev!" );
    } else if( payload.event == "account_creation_success" ) {
      console.log( "Account creation success." );
    } else if( payload.event == "account_creation_failed_username_exists" ) {
      launch_error_modal( "Username already taken!" );
    } else if( payload.event == "admin_approved" ) {
      modal_interface.style.display = "none";
      login_modal.style.display = "none";
      login_button.style.display = "none";
      logout_button.style.display = "block";
      create_article_interface_button.style.display = "block";
      profile_interface_button.style.display = "block";
      settings_interface_button.style.display = "block";
      admin_interface_button.style.display = "block";

      launch_admin_interface();
    }
  });
});


/*
Error interface code
*/
const error_modal = document.getElementById("error_modal");
const error_modal_message = document.getElementById("error_message");
function launch_error_modal( ErrorMessage ) {
  const modal_interface = document.getElementById("modal_interface");
  modal_interface.style.display = "flex";
  error_modal.style.display = "flex";
  error_modal_message.innerHTML = ErrorMessage;
}
const close_error_modal = document.getElementById("close_error_modal_button");
close_error_modal.addEventListener( 'click', function() {
  const modal_interface = document.getElementById("modal_interface");
  modal_interface.style.display = "none";
  error_modal.style.display = "none";
});


/*
Admin interface code.
*/
function request_log( logname ) {
  ws.send( JSON.stringify({
    event: 'request_log',
    log: logname
  }));
}

function launch_admin_interface() {
  const admin_logs_button = document.getElementById('admin_logs_button');
  const admin_logs_display = document.getElementById('admin_logs_display');
  admin_logs_button.addEventListener( 'click', function() {
    console.log( "get logs." );
    ws.send( JSON.stringify({
      event: 'request_admin_logs'
    }));
  });


  const admin_generate_data_button = document.getElementById('admin_generate_data_button');
  admin_generate_data_button.addEventListener('click', function() {
    console.log( "Generate data..." );
    let counter = 10;
    for( counter = 10; counter < 2000; counter+=10 ) {
      const new_article = generate_articles_varied( counter );
      ws.send( JSON.stringify({
        event: "new_article",
        article: new_article
      }));
    }
    //generate_articles_varied( 150 );
  });

  ws.addEventListener( 'message', function( message ) {
    const payload = JSON.parse( message.data );
    if( payload.event == 'admin_logs_filelist' ) {
      let dom = "";
      payload.filelist.forEach( (file) => {
        let onClick = "onclick=\'request_log(" +
          "\"" + file + "\"" + ")\'";

        dom += "<div class=\'log_file\' " +
          onClick +
          ">" +
          file +
          "</div>";
      });
      admin_logs_display.innerHTML = dom;
    } else if( payload.event == 'log_file' ) {
      const logfile_contents = payload.log;
      admin_logs_display.innerHTML = logfile_contents;
    }
  });
  /*const get_logs_button() {
    
  }
  const get_users_button() {
    
  }
  function populate_admin_logs() {
    
  }
  function render_admin_logs( inPage ) {
    
  }
  function toggle_filter_for_users() {
    
  }
  function toggle_filter_for_errors() {
    
  }
  */
}


/*
Contact interface functions
*/
const submit_contact_form_button = document.getElementById("submit_contact_form");
const submit_reset_form_button = document.getElementById("reset_contact_form");

const contact_name = document.getElementById("contact_name_field");
const contact_organization = document.getElementById("contact_organization_field");
const contact_phone = document.getElementById("contact_phone_field");
const contact_email = document.getElementById("contact_email_field");

const contact_form = document.getElementById("contact_form_field");

submit_contact_form_button.addEventListener('click', function() {
  console.log( "Submit form button." );
  const name = contact_name.value;
  const org = contact_organization.value;
  const phone = contact_phone.value;
  const email = contact_email.value;
  const message = contact_form.value;
  console.log( name + "," + org + "," + phone + "," + email );
  console.log( message );

  if( name == "" || email == "" || message == "" ) {
    launch_error_modal( "Missing required fields (name/email/message)." );
    return;
  }

  const json_obj = JSON.stringify({
    event: 'contact_form',
    name: name,
    org: org,
    phone: phone,
    email: email,
    message: message
  });
  ws.send( json_obj );

  launch_error_modal( "Thank you! I will be in touch shortly." );
});
submit_reset_form_button.addEventListener('click', function() {
  contact_name.value = "";
  contact_organization.value = "";
  contact_phone.value = "";
  contact_email.value = "";
  contact_form.value = "";
});
