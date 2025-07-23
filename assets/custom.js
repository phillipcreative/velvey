
$( document ).ready(function() {
jQuery(".products-grid").addClass("prod-grid");
jQuery("a.grid-view").click(function(){
    jQuery(".products-grid").addClass("prod-grid");
    jQuery(".products-grid").removeClass("products-listview");
});
jQuery("a.list-view").click(function(){
    jQuery(".products-grid").removeClass("prod-grid");
    jQuery(".products-grid").addClass("products-listview");
});
$('.cstm_popup').click(function() {
    var $video = $('.popup .popup__content').find('video');
    $video[0].currentTime = 0; // Reset video to the beginning
    setTimeout(function() {
        $video.trigger('play');
        $video.attr('autoplay', 1);
    }, 1000);
});


     $('.close').click(function() {
        var $video = $('.popup .popup__content').find('video');
        setTimeout(function() {
            $video.trigger('pause');
        }, 1000);
    });

// Begin Upwork update - Phillip - 07.20.25 //
// var ht = jQuery(".product-info-top .description .col-md-9").html();
// jQuery(".ebeded_description_pics .container").html(ht);

var ht = jQuery(".product-info-top .description .col-md-9").html();
var $temp = jQuery("<div>").html(ht);

$temp.find("img").each(function () {
  var src = jQuery(this).attr("src");

  // Build responsive image with srcset
  jQuery(this).replaceWith(`
    <img
      src="${src.replace(/(\.jpg|\.png)/, '_400x$1')}"
      srcset="${src.replace(/(\.jpg|\.png)/, '_200x$1')} 200w,
              ${src.replace(/(\.jpg|\.png)/, '_400x$1')} 400w,
              ${src.replace(/(\.jpg|\.png)/, '_800x$1')} 800w"
      sizes="(max-width: 768px) 100vw, 33vw"
      loading="lazy"
      style="width: 100%; height: auto;"
    >
  `);
});

// jQuery(".ebeded_description_pics .container").html($temp.html());

// End of Upwork update //

});

$( document ).ready(function() {
// AOS.init({
//  // ... your other initialisation options here ...
//  once: true,
// });

  $(".slick_cstm").slick({
    arrows: false,
     infinite: true,
    autoplay: true,
    autoplaySpeed: 0,
    slidesToShow: 5,
    speed: 7000,
    cssEase: "linear",
    pauseOnHover: false,
     responsive: [
    {
      breakpoint: 1024,
      settings: {
        slidesToShow: 3,

      }
    },
    {
      breakpoint: 600,
      settings: {
        slidesToShow: 2,

      }
    }

  ]
  });
  // if ($(window).width() > 767) {
  //   $(window).scroll(function(){
  //     var scroll = $(window).scrollTop();
  //     var elemTop = $('.bs-vert').offset().top;
  //     var elemHeight = $('.bs-vert').height();
  //     var windowHeight = $(window).height();


  //     if ((scroll + windowHeight) > elemTop && scroll < (elemTop + elemHeight)) {

  //         setTimeout(function() {
  //           $('.bs-content').addClass('active')
  //             $('.bs-vert').addClass('animated flipInX');
  //         }, 200);
  //     }
  //   });
  // };

      // Event listener using event delegation
    $(document).on('change', '.SortBy', function(){
        // Check if the selected option is "Everyday Picks"
        if($(this).val() === "Everyday Picks") {
            // Redirect to the specified URL
            window.location.href = "/collections/everyday-picks";
        }
    });


$(".cstm_popup").click(function() {
  $(".popup").fadeIn(500);
});
$(".close").click(function() {
  $(".popup").fadeOut(500);
});

  $(document).on('click','.sidebar-block.collapsed.filter-group-pouch-colors .block-title', function(){
// $('.sidebar-block.collapsed.filter-group-pouch-colors .block-title').click(function(){
    $(this).siblings('.block-content').toggleClass('active');
});

$(document).on('click','.sidebar-block.collapsed.filter-group-price .block-title', function(){
    $(this).siblings('.block-content').toggleClass('active');
});


$(document).on('click','.sidebar-block.collapsed.filter-group-popular-tags .block-title', function(){
    $(this).siblings('.block-content').toggleClass('active');
});



});



$(document).ready(function(){
    // Check if the URL matches the desired URL
    if (window.location.href === 'https://velvey.com/collections/featured') {
        // Add active class when clicking on spy-menu-open
        $('.spy-menu-open').click(function(){
            $('.spy-menu').addClass('active');
        });

        // Remove active class when clicking on spy-menu-close
        $('.spy-menu-close').click(function(){
            $('.spy-menu').removeClass('active');
        });
    }
});


$(document).ready(function(){
    // Check if the URL matches the desired URL
    if (window.location.href === 'https://velvey.com/collections/featured') {


        $('.spy-newsletter.js-spy .spy-newsletter-open.js-spy-open').click(function(){
            $('.spy-newsletter').addClass('active');
        });



  // When clicking on the close icon
  $(".spy-newsletter.js-spy  .spy-newsletter-close.js-spy-close").click(function(){
    $(".spy-newsletter").removeClass("active");
  });
        }
});

// if ($(window).width() < 767){
// $(document).ready(function() {
//     function handleScroll() {
//         var scroll = $(window).scrollTop();
//         var elemTop = $('.bs-vert').offset().top;
//         var elemHeight = $('.bs-vert').height();
//         var windowHeight = $(window).height();

//         if ($(window).width() <= 769) {
//             if ((scroll + windowHeight) > elemTop && scroll < (elemTop + elemHeight)) {
//                 setTimeout(function() {
//                     $('.bs-content').addClass('active');
//                     $('.bs-vert').addClass('animated flipInX');
//                 }, 200);
//             }
//         } else {

//         }
//     }

//     // Initial execution of handleScroll
//     handleScroll();

//     // Add scroll event listener
//     $(window).scroll(handleScroll);
// });
// }
