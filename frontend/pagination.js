"use strict";

let page_link_arr = [];

function search_for_page( counter, sm ) {
console.log( "search for page " + counter );
  sm.state.current_page = counter;
  run_search( sm, sm.state.ws, counter-1 );
}

function nav_page( page ) {
  console.log( page );
  page_link_arr[page]();
}

function generate_spaceless_buttons( total_pages, curr_page, sm ) {
  let dom = "";
  for( let counter = 1; counter <= total_pages; counter ++ ) {
    page_link_arr[counter] = search_for_page.bind( null, counter, sm );
    let onClick = "onClick=\"nav_page(" + counter + ");\"";
    dom += "<span " + onClick + " class=\"page_button\">" + counter + "</span>";
  }
  return dom;
}

function generate_two_spaced_buttons( total_pages, current_page, sm ) {
  let dom = "";
  let page_arr = [];
  if( current_page == 0 ) {
    page_arr = [1, 2, "...", Math.round(total_pages/2), "...", total_pages];
  } else if( current_page == 1 ) {
    page_arr = [1, 2, 3, "...", Math.round(total_pages/2), "...", total_pages];
  } else if( current_page == 2 ) {
    page_arr = [1,2,3,4,"...",Math.round(total_pages/2),total_pages];
  } else if( current_page > 2 && current_page < total_pages-2 ) {
    let half = Math.round(total_pages/2);
    page_arr = [1,"...",current_page-1, current_page, current_page+1,"...",total_pages];
  } else if( current_page == (total_pages-2) ) {
    let half = Math.round(total_pages/2);
    page_arr = [1,"...",
      half,"...",total_pages-3,
      total_pages-2,total_pages-1,total_pages
    ];
  } else if( current_page == (total_pages-1) ) {
    let half = Math.round(total_pages/2);
    page_arr = [1,"...",half,"...",total_pages-2,total_pages-1,total_pages];
  } else if( current_page == total_pages ) {
    let half = Math.round(total_pages/2);
    page_arr = [1,"...",half,"...",total_pages-1,total_pages];
  }
  dom = "";
  page_arr.forEach( page => {
    if( page == "..." ) {
      dom += "...";
    } else {
      page_link_arr[page] = search_for_page.bind( null, page, sm );
      let onClick = "onClick=\"nav_page(" + page + ");\"";
      dom += "<span " + onClick + "class=\"page_button\">" + page + "</span>";
    }
  });
  return dom;
}

function generate_spaceless_buttons( total_pages, curr_page, sm ) {
  let dom = "";
  for( let counter = 1; counter <= total_pages; counter ++ ) {
    page_link_arr[counter] = search_for_page.bind( null, counter, sm );
    let onClick = "onClick=\"nav_page(" + counter + ");\"";
    dom += "<span " + onClick + " class=\"page_button\">" + counter + "</span>";
  }
  return dom;
}

//TODO: elements_total, elements_per_page
function render_pagination_interface( target_interface, total_pages, curr_page, sm ) {
console.log( "render_pagination tot:" + total_pages + " /curr:" + curr_page );
  const pagination_dom = document.getElementById( target_interface );
  pagination_dom.style.display = "flex";
  let dom;
console.log( curr_page + "///" + total_pages );
  if( total_pages <= 11 ) {
    dom = generate_spaceless_buttons( total_pages, curr_page, sm );
    pagination_dom.innerHTML = dom;
  } else if( total_pages >= 12 ) {
    dom = generate_two_spaced_buttons( total_pages, curr_page, sm );
    pagination_dom.innerHTML = dom;
  }
}
