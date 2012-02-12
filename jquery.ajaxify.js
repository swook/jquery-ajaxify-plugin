/*!
   jQuery Ajaxify Plugin
   --------------------------------------
   > This jQuery plugin allows reloadless surfing within a website.

   Author:  Seon-Wook Park
   Site:    http://www.swook.net/
   License: MIT License <http://www.opensource.org/licenses/mit-license.php>
 */

(function( $ ) {
	$.Ajaxify = {};
	$.Ajaxify.init = function () {
		$.Ajaxify.current_url = $.Ajaxify.parseUri(document.location.href);
		if ($.Ajaxify.init_done) return;

		$.Ajaxify.initialState.url = $.Ajaxify.current_url;
		$.Ajaxify.initialState.title = document.title;
		$.Ajaxify.init_done = true;
	};
	$.Ajaxify.initialState = {};
	$.Ajaxify.url_cache = {};

	// Modified function from:
	//     http://blog.stevenlevithan.com/archives/parseuri
	//
	// License: MIT License <http://www.opensource.org/licenses/mit-license.php>
	$.Ajaxify.parseUri = function (str) {
		if (!str || str == '') return
		if ((str.indexOf('://') != -1 || str[0] == '/') && str[0] != '#' && $.Ajaxify.url_cache[str])
			return $.Ajaxify.url_cache[str];

		var o = {
			strictMode: false,
			key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
			q: {
				name:   "queryKey",
				parser: /(?:^|&)([^&=]*)=?([^&]*)/g
			},
			parser: {
				strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
				loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
			}
		},
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

		while (i--) uri[o.key[i]] = m[i] || "";

		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});

		if ($.Ajaxify.current_url) {
			if ( uri.host == '' ) {
				uri.protocol = (uri.protocol != '') ? uri.protocol :
							(($.Ajaxify.current_url.protocol == '') ? 'http' : $.Ajaxify.current_url.protocol);
				uri.host = $.Ajaxify.current_url.host;
				uri.port = (uri.port != '') ? uri.port :
						(($.Ajaxify.current_url.port == '') ? '' : $.Ajaxify.current_url.port);
				uri.path = (uri.path != '') ? uri.path :
						(($.Ajaxify.current_url.path == '') ? '' : $.Ajaxify.current_url.path);
			}
		}
		uri.full = uri.protocol+'://'+uri.host+((uri.port == '') ? '' : ':'+uri.port)+
					((uri.path == '') ? '/' : uri.path)+
					((uri.query == '') ? '' : '?'+uri.query);
		uri.full_anchor = uri.full;
		if ( uri.anchor > '' ) uri.full_anchor += '#'+uri.anchor;
		$.Ajaxify.url_cache[str] = uri;
		return uri;
	};

	$.Ajaxify.applyTo = function (elem) {
		if (!$.support.ajax || !window.history) return;
		var $this = (elem instanceof jQuery) ? elem : $(this);

		var url = $.Ajaxify.parseUri($this.attr('href'));
		if (!url || url.host != $.Ajaxify.current_url.host) return;
		$this.unbind('click');
		$this.on('click', $.Ajaxify.onClick);
		$this = null, url = null;
	};

	$.Ajaxify.onClick = function(e) {
		if (($.browser.msie && e.button != 1) || (!$.browser.msie && e.button != 0) || (e.ctrlKey))
			return;

		e.preventDefault();
		var url = $.Ajaxify.parseUri($(this).attr('href'));
		$.Ajaxify.loadURL(url);
	};

	$.Ajaxify.loadURL = function (url) {
		if (typeof url == 'string') url = $.Ajaxify.parseUri(url);
		if (!url) return;
		if (url.host != $.Ajaxify.current_url.host) {
			document.location.href = url.full;
			return;
		}
		if ($.Ajaxify.current_url.full == url.full) {
			$.Ajaxify.gotoAnchor(url.anchor);
			return;
		}

		// Cache then change all cursors to 'progress'
		var body = $('body'), all = $('a');
		body.css('cursor', 'progress');
		all.each(function(i, elem) {
			var $elem = $(elem);
			$elem.data('cursor_cache', $elem.css('cursor'));
			$elem.css('cursor', 'progress');
		});

		$.get(url.full, function(data) {
			$.Ajaxify.updateHistory(url, data);
			$.Ajaxify.applyData(url, data);
			body.css('cursor', 'auto');
			all.each(function(i, elem) {
				var $elem = $(elem), cache = $elem.data('cursor_cache');
				$elem.css('cursor', (cache) ? cache : 'auto' );
				$elem.removeData('cursor_cache')
			});
			data = null;
		}, 'html').error(function() {
			document.location.href = url.full;
		});
	};

	$.Ajaxify.applyData = function (url, data) {
		if (!data) {
			$.get(url.full, function(reply) {
				data = reply;
				$.Ajaxify.applyData(url, data);
			}, 'html');
			return;
		}
		if (!$.Ajaxify.container)
			$('html').html(data);
		else {
			if (typeof $.Ajaxify.container == 'string')
				$.Ajaxify.container = [$.Ajaxify.container];
			var cont, newdata, len = $.Ajaxify.container.length;
			for (var i = 0; i < len; i++) {
				newdata = $($.Ajaxify.container[i]+':first', data)
				cont = $($.Ajaxify.container[i]+':first');
				cont.replaceWith(newdata);
				cont.height(cont.height());
				cont.height('auto');
				$(cont, 'a[target!=_blank]:not(.noajax)').each($.Ajaxify.applyTo);
			}
		}
		$.Ajaxify.all();
 		$.Ajaxify.pageChange_run();
		$.Ajaxify.gotoAnchor(url.anchor);
	};

	$.Ajaxify.updateHistory = function (url, data) {
		var title  = data.match(/<title>(.*?)<\/title>/)[1];
		document.title = title;
		history.pushState(
			{
				url: url,
				title: title
			},
			title,
			url.relative
		);
		$.Ajaxify.init();
	};

	$.Ajaxify.gotoAnchor = function (anchor) {
		if (anchor == '')
			anchor = 0;
		else {
			anchor = $('#'+anchor+':first, a[name='+anchor+']:first');
			if (anchor.length == 0) return;
			anchor = anchor.offset().top;
		}

		var page;
		if ($.browser.webkit) page = $('body');
		else page = $('html,body');

		if (page.scrollTop() != anchor)
			page.animate({ scrollTop: anchor }, 'fast');
	};

	$.Ajaxify.all = function () {
		$('a[target!=_blank]:not(.noajax)').each($.Ajaxify.applyTo);
	};

	$.Ajaxify.pageChange_run = function () {
		var len = $.Ajaxify.pageChange_funcs.length;
		for (var i = 0; i < len; i++) {
			$.Ajaxify.pageChange_funcs[i]();
		}
	};
	$.Ajaxify.pageChange_funcs = [];
	$.Ajaxify.pageChange = function (func) {
		$.Ajaxify.pageChange_funcs.push(func);
	};

	$(document).ready($.Ajaxify.init);

	$(window).on('popstate', function (e) {
		if ($.browser.webkit && !$.Ajaxify.init_pop) {
			$.Ajaxify.init_pop = true;
			return;
		}

		var state = e.originalEvent.state;
		if (!state) state = $.Ajaxify.initialState;
		if (state.url.full != $.Ajaxify.current_url.full) {
			document.title = state.title;
			$.Ajaxify.init();
			$.Ajaxify.applyData(state.url);
		}
	});
})( jQuery );