'use strict';

/*
React
*/
/*const e = React.createElement;

class LikeButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = { liked: false };
  }

  render() {
    if (this.state.liked) {
      return 'You liked this.';
    }

return (
  <button onClick={() => this.setState({ liked: true })}>
    Like
  </button>
);
  }
}

const domContainer = document.querySelector('#like_button_container');
ReactDOM.render( e(LikeButton), domContainer );*/


class UID {
  constructor() {
    this.UIDs = [];
  }
  generateUID( inField ) {
    console.log( "Generating first UID of field " + inField + "." );
    if( !this.UIDs[inField] ) {
      this.UIDs[inField] = {
      counter: 1,
      retiredIDs : []
      };
      return 0;
    } else if( this.UIDs[inField].retiredIDs.length ) {
      console.log( "Issuing retired UID of field " + inField + "." );
      return this.UIDs[inField].retiredIDs.pop();
    } else {
      console.log( "Generating new UID of field " + inField + "." );
      return this.UIDs[inField].counter++;
    }
  }
  retireUID( inField, inUID ) {
    console.log( "reitiring UID " + inUID + " of " + inField );
    this.UIDs[inField].retiredIDs.push( inUID );
  }
}

/*
Search Tag Manager
*/
class SearchTagManager extends React.Component {
  constructor( search_terms ) {
    super( search_terms );
    this.state = {...search_terms};

    const thisHandle = this;
    const search_tag_container = document.getElementById("tag_container");
    const add_search_term_button = document.getElementById("add_search_tag_button");
    const search_tag_input_field = document.getElementById("search_bar");
    add_search_term_button.addEventListener("click",function() {
      //1) Add search term to search_tag_container
      console.dir( thisHandle );
      thisHandle.state.search_terms.push({
        text: search_tag_input_field.value,
        UID : myUID.generateUID('tags')
      });
      //2) Update react component to display the state change to the user
      thisHandle.setState( thisHandle.state.search_terms );
      //2) Empty input field
      search_tag_input_field.value = "";
    });

  }
  componentDidMount() {
    this.setState( this.state.search_terms );
  }
  doClick( inUID ) {
    console.dir( inUID );
    search_terms.forEach( (search_term, index) => {
      if( search_term.UID == inUID ) {
        search_terms.splice( index, 1 );
      }
    });
    myUID.retireUID( "tags", inUID );
    this.setState( this.state.search_terms );
  }
  render() {
    const search_tags_element = this.state.search_terms.map( (search_term) =>
      <span className='tag' key={search_term.UID}>{search_term.text}
      <button onClick={ () => this.doClick(search_term.UID) }>X</button>
      </span>
    );
    return( <div id='tag_container' className='tag_container'>{search_tags_element}</div> );
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
      console.log( event.data );
      const in_articles = JSON.parse( event.data );
      if( in_articles.type == "articles" ) {
        console.log( "articles!" );
        console.dir( in_articles.articles );
        console.dir( in_articles.articles[0] );
        let key_counter = 0;
        in_articles.articles[0].forEach( element => {
          element.key = key_counter;
          key_counter++;
        });
        articles_component.state.articles = in_articles.articles[0];
        articles_component.setState( articles_component.state.articles );
      }
    });
  }
  render() {
    console.dir( this );
    //console.log( typeof( this.state.articles ) );
    const dom = this.state.articles.map( (article) =>
      <div key={article.key}>{article.article_title} : {article.article_text}</div>
    );
    console.log( dom );
    return(
      <div id='articles_container'>{dom}</div>
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

const search_interface_button = document.getElementById("search_interface_button");
const create_article_interface_button = document.getElementById("create_article_interface_button");
const search_interface = document.getElementById("search_interface");
const create_article_interface = document.getElementById("create_article_interface");
search_interface_button.addEventListener("click",function(){
  search_interface.style.display = "block";
  create_article_interface.style.display = "none";
});
create_article_interface_button.addEventListener("click",function(){
  search_interface.style.display = "none";
  create_article_interface.style.display = "block";
});

const myUID = new UID();

const search_terms = [
  {
    text : "tag1",
    UID : myUID.generateUID('tags')
  },
  {
    text : "tag2",
    UID : myUID.generateUID('tags')
  }
]

const search_button = document.getElementById("search_button");
search_button.addEventListener( "click", function() {
  //Convert search terms from DOM appropriate format to array
  const search_arr = [];
  for( const key in search_terms ) {
    search_arr.push( search_terms[key].text );
  }

  //Convert search term array to object w/ event type and JSONify it.
  const search_json = JSON.stringify({ event: "search", tags: search_arr });

  //Send search query to server.
  ws.send( search_json );
});

const articles = [];

ReactDOM.render(
  <SearchTagManager search_terms={ search_terms }/>,
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
