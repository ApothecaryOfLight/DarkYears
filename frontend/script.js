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
