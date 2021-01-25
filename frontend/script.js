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
Search Tag Manager
*/
function run_search( component_handle, ws ) {
  const search_tag_input_field = document.getElementById("search_bar");

  //1) Add search term to search_tag_container
  const new_tag = search_tag_input_field.value;
  if( new_tag != "" ) {
    component_handle.state.search_terms.push({
      text: search_tag_input_field.value,
      UID : myUID.generateUID('tags')
    });
  }

  //2) Update react component to display the state change to the user
  component_handle.setState( component_handle.state.search_terms );

  //3) Empty input field
  search_tag_input_field.value = "";

  //4) Convert search terms from DOM appropriate format to array
  const search_arr = [];
  for( const key in search_terms ) {
    search_arr.push( search_terms[key].text );
  }

  //5) Convert search term array to object w/ event type and JSONify it.
  const search_json = JSON.stringify({ event: "search", tags: search_arr });

  //6) Send search query to server.
  ws.send( search_json );
}
class SearchTagManager extends React.Component {
  constructor( search_terms, ws ) {
    super( search_terms, ws );
    this.state = {...search_terms};
  }
  componentDidMount() {
    this.setState( this.state.search_terms );
    const thisHandle = this;
    const search_tag_container = document.getElementById("tag_container");
    const add_search_term_button = document.getElementById("add_search_tag_button");
    add_search_term_button.addEventListener("click",function() {
      run_search( thisHandle, ws );
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
          <span className='article_date'>10/10/2020</span>
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
    return;
  }
  const article_obj = {
    title: article_title,
    date: article_date,
    body: article_body
  }
  console.dir( article_obj );
  const article_json = JSON.stringify({event: "new_article", article: article_obj});
  ws.send( article_json );
});
