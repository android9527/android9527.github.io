window._bd_share_main.F.module("component/pop_popup_slide",function(e,t){var n=e("base/tangram").T,r=e("base/class").Class,i=e("conf/const"),s=e("component/pop_base"),o={btn:""},u,a,f,l,c=r.create(function(){function t(e){var t=n(e).offset(),r=t.top+n(e).height()+5,i=t.left,s=a.outerHeight();return r+s>n("body").height()&&r+s>n(window).height()&&(r=t.top-s-5,r=r<0?0:r),{top:r,left:i}}function r(t,r){var="" i="r.mini||2,s=r.miniList||e._partnerSort.slice(0,8*i),o=[];n.each(s,function(t,n){if(!/(iPhone" |="" ipad="" android)="" i.test(navigator.useragent)||n!="=" weixin")o[t]="<li"><a href="#" onclick="return false;" class="popup_" +n+'"="" data-cmd="'+n+'">'+e._partners[n].name+""}),l.html(o.join("")),a.width(i*110+6),f.width(i*110+6)}var e=this;e._hide=function(){f&&f.hide(),a&&a.hide()},e._show=function(i,s){r(e._container,s);var o=t(i.element);n.each([a,f],function(e,t){t.css({top:o.top,left:o.left}).show()}),n(i.element).one("mouseout",function(){var t=!1;a.one("mouseover",function(){t=!0}),setTimeout(function(){!t&&e.hide()},300)})},e._init=function(){var t=['<iframe frameborder="0" class="bdshare_popup_bg" style="display:none;"></iframe>'].join(""),r=['<div class="bdshare_popup_box" style="display:none;">','<div class="bdshare_popup_top">',"\u5206\u4eab\u5230","</div>",'<ul class="bdshare_popup_list"></ul>','<div class="bdshare_popup_bottom">','<a href="http://share.baidu.com/" class="popup_more" data-cmd="more" target="_blank;">\u66f4\u591a...</a>',"</div>","</div>"].join("");n("body").insertHTML("beforeEnd",t+r),e._container=n(".bdshare_popup_box"),a=n(".bdshare_popup_box"),l=n(".bdshare_popup_list"),f=n(".bdshare_popup_bg"),a.mouseleave(e.hide)}},s.PopBase);t.Popup=function(){return u||(u=new c,u.init()),u}()});</0?0:r),{top:r,left:i}}function>